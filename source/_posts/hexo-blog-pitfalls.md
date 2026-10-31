---
title: 搭博客踩的坑，解决办法和代价
date: 2026-10-30 21:00:00
updated: 2026-10-31 16:30:00
tags: [Hexo, Butterfly]
categories: [技术]
---

搭站本身不难，难的是跑起来之后。下面这六个坑我全踩过，每个都写清楚三件事：出了什么问题、怎么修的、修完要付什么账。

## 坑一：本地 10/24，线上 10/23

本地 `hexo g` 出来的链接是 `/2026/10/24/hello-world/`，推上去一看，线上首页那条链接变成 `/2026/10/23/`，点进去 404。

`_config.yml` 里明明写了 `timezone: 'Asia/Shanghai'`。用两个时区各跑一遍，问题就露出来了：

```bash
TZ=UTC npx hexo generate           # 2026/10/23/hello-world
TZ=Asia/Shanghai npx hexo generate # 2026/10/24/hello-world
```

配置确实读到了，但 Hexo 8 算日期型永久链接时用的是**系统时区**，配置里那个 `timezone` 压根不参与。GitHub Actions 跑在 UTC，于是比本地少一天。

修起来不费劲，workflow 里钉死就行：

```yaml
env:
  TZ: Asia/Shanghai
```

代价是这行配置没人帮你检查。哪天换了 CI，或者从别处抄一个 workflow 回来忘了加，凌晨发的文章 URL 就会悄悄偏一日。

## 坑二：删掉测试文章，首页跟着没了

把测试文章挪进 `source/_drafts/` 之后，构建只吐出 about、tags、categories 三个页面，`index.html` 不见了，线上首页直接 404。

不是构建报错。是 `hexo-generator-index` 把文章列表交给 `hexo-pagination`，空数组它直接返回空——没文章就没首页。

能走的路就三条：留一篇占位、自己写脚本补生成、或者等有真文章再上线。前两条都不划算。

代价是这个坑会一直埋着。哪天想把最后一篇撤下来，首页跟着消失，而且构建过程一声不吭。

## 坑三：主题到底怎么升级

主题有两种装法：clone 到 `themes/` 改源码，或者 npm 装、配置留在自己项目里。

我选后者。`theme: butterfly` 直接指到 `node_modules/hexo-theme-butterfly`，仓库里根本没有 `themes/` 目录，所有自定义都在根目录的 `_config.butterfly.yml` 里——那是从主题包里复制出来的默认配置。

升级只改 `package.json` 的版本号，一个 diff 都不用合。

代价是想改布局就得写 CSS 覆盖，还得自己翻主题源码找选择器。看板娘的工具栏图标在深色模式下几乎看不见（原始值 `fill: #7b8c9d`），我用一条 `[data-theme='dark'] #waifu-tool svg` 盖掉，文件才六行。这种补丁攒多了，其实还是在改主题，只是散在了主题外面。

## 坑四：开 PJAX 换来的两个长期代价

整页刷新会把 DOM 全销毁，页面上任何常驻的东西每跳一次就重建一次。开 PJAX 之后只替换 `.js-pjax` 容器里的内容，挂在 `body` 或 `<head>` 上的东西能活下来。

第一次跑就翻车了：

```
Pjax switch fail: DOM doesn't look the same on new loaded page:
'meta[property="og:description"]' - new 1, old 0
```

Hexo 的 `open_graph` helper 只在有正文的页面输出 `og:description`，首页没有。给 `_config.yml` 补上站点 `description` 才对得上。

第二个代价更长远：**以后任何第三方脚本都得监听 `pjax:complete` 重新初始化**。播放器、地图、统计，一个都跑不掉。这不是一次性修完的事，是长期账。

## 坑五：验证不能只看「编译通过」

`hexo g` 成功和页面能用，完全是两件事。我的做法是起本地服务，用无头 Chrome 截图自己看——终端里实在看不出丑。

撞的第一个坑是 headless 里 WebGL 起不来：

```
[Live2D Widget][ERROR] Failed to create WebGL context.
```

加上 `--enable-unsafe-swiftshader --use-angle=swiftshader` 走软件渲染才有画面。真机上不会碰到，但想自动化验证就绕不过去。

代价是要多装一个 `puppeteer-core`（几十 MB），而且它只证明「渲染出来了」，证明不了「逻辑对」。

顺手量了个数：鼠标压在看板娘上滚 600px，页面纹丝不动；挪到正文，同样 600px 直接到底。canvas 抢了指针事件就是这样。

## 坑六：评论系统绑在 URL 上

纯静态站没有后端，评论只能接第三方。Giscus 挂在 GitHub Discussions 上，不用自己部署服务，访客拿 GitHub 账号登录就能评。

它按 `pathname` 找对应的讨论，所以**文件名一发出去就锁死了**。改名不会删掉旧评论——它们还在 Discussions 里躺着——只是新页面再也找不到。

代价是一条永久约束：写文件之前就得想好 URL。想换标题只能改 front-matter 的 `title`，别碰文件名。

## 收尾

把账摊开看是这样的：

| 修了什么 | 付出什么 |
|---|---|
| 钉死 CI 时区 | 依赖一行没人检查的配置 |
| 留一篇占位文章 | 首页依赖文章数 > 0 |
| 主题走 npm | 定制变成散落各处的 CSS 覆盖 |
| 开 PJAX | 所有第三方脚本都要接 `pjax:complete` |
| 自动截图验证 | 多一个几十 MB 的依赖 |
| Giscus 走 pathname | 文件名永久冻结 |

这些代价现在看都还算值。真要说学到什么，大概是下次动手前先问自己一句：这个功能，值不值得换一条永久约束。
