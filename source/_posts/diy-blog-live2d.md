---
title: DIY Blog 看板娘，从使用 live2d-widget 开始
date: 2026-10-31 10:45:00
updated: 2026-11-01 01:50:00
tags: [Live2D, Hexo]
categories: [技术]
---

网页看板娘这东西出来很久了。我一直想把我的无数个二次元老婆做成看板娘，再接个 AI 让她跟我聊天——我让 AI 干活的时候，她就在旁边跟我打情骂俏。

之前其实也试过做桌宠，但当时 AI 的智商不太够，聊起来太蠢了，就放弃了。然后我穷啊。静态站是公开的，谁来都能白嫖，token 烧起来不得了，所以只能用免费的那点额度。想要更自然一点的对话，大概还是得回桌宠那边做。

跑题了。这是看板娘系列第一篇，目标只是把它养起来：能显示、能拖、切页不消失。至于让它说话有趣一点、接上大模型，甚至将来真的能聊起来，就放在最后一节，可行性我也顺便核过了。

`live2d-widgets@1.0.1` 的 README 写得很干净：引一个 `autoload.js` 就完事。照做之后页面上什么都没有，控制台也不报错。下面是从「什么都没有」到「能拖能换装」之间踩的东西。

## 那个 npm 包里没有模型

把包下载下来列一下 `dist/`：

```
/dist/autoload.js
/dist/live2d.min.js
/dist/waifu.css
/dist/waifu-tips.js
/dist/waifu-tips.json
```

整个包 80 个文件，没有一个是模型（`.moc` 或 `model.json`）。`initWidget` 不带 `cdnPath` 时会去请求同域的 `/model_list.json`，404 之后静默失败——这就是页面上干干净净、控制台又什么都没有的原因。

## 第二个坑：它是 ES module

`waifu-tips.js` 的最后一行是 `export{a as l}`。这意味着它不能被普通 `<script src>` 加载，浏览器会直接抛语法错误，整个文件不执行。必须写成 `type="module"`。

模块又是延迟执行的，所以得等 `import()` 完成之后，`initWidget` 才挂在 `window` 上可用。

## 自己写 loader

```js
const BASE = 'https://fastly.jsdelivr.net/npm/live2d-widgets@1.0.1/dist/';
const MODEL_API = 'https://fastly.jsdelivr.net/gh/fghrsh/live2d_api/';

if (window.innerWidth >= 768) {
  await import(BASE + 'waifu-tips.js');
  window.initWidget({
    waifuPath: BASE + 'waifu-tips.json',
    cdnPath: MODEL_API,
    cubism2Path: BASE + 'live2d.min.js',
    cubism5Path: 'https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js',
    tools: ['hitokoto', 'switch-model', 'switch-texture', 'photo', 'info', 'quit'],
    drag: true
  });
}
```

`cdnPath` 指向 `fghrsh/live2d_api`（经 jsDelivr）。真正的 `model_list.json` 和模型文件都在那个仓库里，`Potion-Maker/Pio`、`bilibili-live/22` 这些都能选。

## 手机宽度直接不加载

`window.innerWidth >= 768` 这一句是刻意的。看板娘连带工具栏在小屏上会占掉左下角一大块，翻两下就挡到正文。宽度不够就干脆不养。

## 深色模式下工具栏是隐形的

主题切暗色之后，那排图标几乎看不见——默认值是 `fill: #7b8c9d`，压在深色背景上对比度太低。覆盖一下，六行 CSS 就够：

```css
[data-theme='dark'] #waifu-tool svg {
  fill: #c9d1d9;
}

[data-theme='dark'] #waifu-tool svg:hover {
  fill: #4fc3f7;
}
```

## 能拖，但滚轮会被吃掉

打开 `drag: true` 之后可以拖着角色到处放，比钉死在左下角灵活。代价是这个区域里的滚轮事件归 canvas 管：

| 鼠标位置 | 滚轮 600px，页面实际滚动 |
|---|---|
| 悬在看板娘上 | 0 px |
| 悬在正文空白处 | 600 px |

这是 canvas 接管指针事件的必然结果，不是 bug。要么接受，要么把 `pointer-events` 关掉，代价是模型不能点也不能拖。

## 切页不重载

整页刷新会把 DOM 全部销毁，看板娘每跳一次页面就重建一次，模型重新下载。开了 PJAX 之后只替换 `.js-pjax` 容器里的内容，挂在 `body` 上的看板娘能活下来。

关键是把 loader 放进 `<head>`。主题的 `inject.bottom` 内容恰好落在 `.js-pjax` 里面，每次导航都会重新执行，会挂出第二个看板娘；`<head>` 不参与替换，天然只跑一次。loader 里再加一道 `document.getElementById('waifu')` 的存在性检查，双保险。

实测结果：连续三次导航，`#waifu` 始终是同一个 DOM 节点，画布没重建，控制台零报错。

## 接 AI 对话，可行吗

写这篇的真正目的在后面，所以顺手把前置条件核了一遍。

**能用的入口只有一个。** `waifu-tips.js` 对外只挂了 `window.initWidget`，没有任何对话相关的导出。但它显示气泡的方式很朴素：找到 `#waifu-tips` 这个 div，写入 HTML，加上 `waifu-tips-active` 类，到点再把类去掉。也就是说，自己拼一个函数往同一个节点写，效果一样，不必动它的源码。

**真正卡住的是接口这一层。** 静态站点没有后端，把大模型 API Key 写进前端 JS 等于公开；而且多数 API 不允许浏览器跨域直连。中间必须有一层转发，Cloudflare Workers 的免费额度就够，key 放在 Worker 的环境变量里。

**然后是滥用。** 站点是公开的，任何人点一下模型都会消耗你的 token。上线前至少要有：单 IP 每日次数上限、单次回复字数上限、不保留多轮上下文。

**最后是体验。** 气泡是个固定宽度的小方块，几十个字刚好，流式输出一长就撑爆。真要做，得先想清楚它是个彩蛋还是个聊天窗口——这两者的设计完全不同。

还有个不技术的提醒：`live2d-widgets` 是 **GPL-3.0**。只在页面里用 CDN 引没问题；但如果 fork 一份改源码再自托管，就得按 GPL 开源。想加自定义功能，优先走「外部挂载」而不是「改源码」，能省掉这层义务。

结论：能实现，工作量主要在转发层和限流，不在看板娘本身。

## 最后

看板娘本身不复杂，麻烦全在「官方文档描述的是理想情况」和「npm 包里实际有什么」之间。下次看到哪个库的 README 写「引入即用」，我大概会先列一下包里到底有什么。
