---
title: 搭博客踩的坑，解决办法和代价
date: 2026-10-30 21:00:00
tags: [Hexo, Butterfly]
categories: [技术]
---

搭站本身不复杂，麻烦都在跑起来之后。这里记六个坑，每个都写清楚现象、怎么修的、以及修完要付什么代价。

## 坑一：本地 10/24，线上 10/23

本地 `hexo g` 生成的链接是 `/2026/10/24/hello-world/`，推上去线上首页的链接却指向 `/2026/10/23/`，点进去 404。

`_config.yml` 里明明写了 `timezone: 'Asia/Shanghai'`。分别用两个时区跑一遍就清楚了：

```bash
TZ=UTC npx hexo generate           # 2026/10/23/hello-world
TZ=Asia/Shanghai npx hexo generate # 2026/10/24/hello-world
```

配置项确实读到了，但 Hexo 8 计算日期型永久链接用的是系统时区，配置里的 `timezone` 不参与决定。GitHub Actions 跑在 UTC，于是和本地差一天。

修法不加任何依赖，工作流里钉死：

```yaml
env:
  TZ: Asia/Shanghai
```

代价是这行配置没有代码能帮你检查。哪天换 CI、或者从别处照抄一个 workflow，忘了它，URL 就会在凌晨写的文章上悄悄偏移一天。

## 坑二：删掉测试文章，首页跟着没了

把测试文章挪进 `source/_drafts/` 之后，构建只吐出 about、tags、categories 三个页面，`index.html` 不见了。线上首页直接 404。

不是构建失败，是 `hexo-generator-index` 把文章列表交给 `hexo-pagination`，空集合直接返回空数组——没有文章就没有首页。

能选的路只有三条：留一篇占位文章、自己写脚本补生成、或者等有真文章再上线。前两条都不划算。

代价是**这个坑会一直在**。哪天想把最后一篇文章撤下来，首页会跟着消失，而构建过程一声不响。

## 坑三：主题到底怎么升级

主题有两种装法：clone 到 `themes/` 改源码，或者 npm 装、配置写在自己项目里。

我选后者。`theme: butterfly` 直接指向 `node_modules/hexo-theme-butterfly`，仓库里没有 `themes/` 目录，所有自定义写在根目录的 `_config.butterfly.yml`——那是从主题包里复制出来的默认配置。

升级只改 `package.json` 的版本号，不用合并任何 diff。

代价是想改布局就得写 CSS 覆盖，而且得自己去翻主题源码找选择器。看板娘的工具栏图标在深色模式下几乎看不见，原始值是 `fill: #7b8c9d`，我用一条 `[data-theme='dark'] #waifu-tool svg` 盖掉，文件只有六行。这种补丁攒多了，本质上还是在改主题，只是分散在了主题之外。

## 坑四：开 PJAX 换来的两个长期代价

整页刷新会把 DOM 全部销毁，页面上任何常驻的东西每跳一次就重建一次。开 PJAX 之后只替换 `.js-pjax` 容器里的内容，挂在 `body` 或 `<head>` 上的东西能活下来。

第一次跑就失败了：

```
Pjax switch fail: DOM doesn't look the same on new loaded page:
'meta[property="og:description"]' - new 1, old 0
```

Hexo 的 `open_graph` helper 只在有正文的页面输出 `og:description`，首页没有。给 `_config.yml` 补上站点 `description` 才对齐。

第二个代价更长远：**以后任何第三方脚本都得监听 `pjax:complete` 重新初始化**。播放器、地图、统计，一个都跑不掉。这不是一次性的修复，是长期维护成本。

## 坑五：验证不能只看「编译通过」

`hexo g` 成功和页面能用是两件完全不同的事。我的做法是起本地服务，用无头 Chrome 截图自己看。撞到的第一个坑是 headless 里 WebGL 起不来：

```
[Live2D Widget][ERROR] Failed to create WebGL context.
```

加了 `--enable-unsafe-swiftshader --use-angle=swiftshader` 走软件渲染才有画面。真机上不会有这个问题，但想自动化验证就绕不过去。

代价是这套东西需要额外装 `puppeteer-core`（几十 MB），而且它只证明「渲染出来了」，不证明「逻辑对」。

顺便量了个数：鼠标停在看板娘上滚轮 600px，页面纹丝不动；移到正文，同样 600px 滚到底。canvas 接管指针事件就是这样。

## 坑六：评论系统绑在 URL 上

纯静态站没有后端，评论只能接第三方。Giscus 基于 GitHub Discussions，不用部署服务，访客用 GitHub 账号登录就能评。

它按 `pathname` 匹配讨论，于是**文章文件名一旦发布就固定了**。改名不会删掉旧评论，它们还在 Discussions 里躺着，只是新页面再也找不到。

代价是一条永久约束：写文件之前就得想好 URL。想改标题只能改 front-matter 里的 `title`，不能动文件名。

## 收尾

把代价摊开看是这样的：

| 修了什么 | 付出什么 |
|---|---|
| 钉死 CI 时区 | 依赖一行没人检查的配置 |
| 留一篇占位文章 | 首页依赖文章数 > 0 |
| 主题走 npm | 定制变成散落各处的 CSS 覆盖 |
| 开 PJAX | 所有第三方脚本都要接 `pjax:complete` |
| 自动截图验证 | 多一个几十 MB 的依赖 |
| Giscus 走 pathname | 文件名永久冻结 |

这些代价现在看都还算值。真要说学到了什么，大概是下次动手之前先问自己一句：这个功能，值不值得换来一条永久约束。
