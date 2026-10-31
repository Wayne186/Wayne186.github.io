---
title: 从 0 开始，搭建一个 GitHub 的 Hexo blog
date: 2026-10-29 23:10:00
updated: 2026-10-31 16:35:00
tags: [Hexo, GitHub Pages]
categories: [技术]
---

用 GitHub 的免费 Pages 加 Hexo 搭个人博客，这套东西已经出了好多年啦，成熟得很。这里简单记一下这个博客是按什么流程搭出来的，照着做，不管是人还是 AI，大概率都搞得掂。全程大概半个钟，前提是有个 GitHub 账号和一台能装 Node 的电脑。顺带提一嘴，我用的是 Mac。

## 1. 先建仓库

新建一个 public 仓库，名字必须是 `<你的用户名>.github.io`。

用 `Wayne186.github.io` 举例：只有这么命名，GitHub 才会把它当成个人主页，地址就是 `https://wayne186.github.io`。换个名字也能用，但地址会变成 `https://wayne186.github.io/仓库名/`，后面所有链接都要多一段路径，如果屎忽痕也可以搞。

## 2. 装 Node

Hexo 8 要求 Node ≥ 20.19，版本低了 `npm install` 会直接拒绝。不确定自己是多少可以先查：

```bash
npm view hexo engines
```

装好之后，全局装一下 Hexo 的命令行工具：

```bash
npm install -g hexo-cli
```

## 3. 本地把站跑起来

```bash
hexo init myblog
cd myblog
npm install
hexo server
```

浏览器打开 `http://localhost:4000`，能看到一个默认主题的空博客，说明基础环境就通啦。

## 4. 换个主题

默认主题能用但不好看。我用的是 Butterfly：

```bash
npm install hexo-theme-butterfly
npm install hexo-renderer-pug hexo-renderer-stylus
```

后两个是 Butterfly 的渲染依赖，漏装会白屏。然后打开 `_config.yml`，把 `theme:` 改成 `butterfly`。

主题配置项很多，建议复制一份到项目根目录再改：

```bash
cp node_modules/hexo-theme-butterfly/_config.yml _config.butterfly.yml
```

这样以后升级主题，你自己的配置不会丢。

## 5. 让它自动发布

GitHub Pages 有两种部署方式：本地 `hexo deploy` 推分支，或者让 GitHub Actions 在云端构建。我用后者，本地不用配任何部署参数，换台电脑也能发。

在项目里新建 `.github/workflows/pages.yml`：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

env:
  TZ: Asia/Shanghai

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx hexo generate
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./public

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
    steps:
      - uses: actions/deploy-pages@v4
```

里面那行 `TZ` 不是摆设，原因写在另一篇里。

## 6. 打开 Pages

仓库页面 → Settings → 左侧 Pages → Build and deployment → Source 选 **GitHub Actions**。

这一步不做，Action 会在 deploy 阶段报 Pages not enabled，前面的构建白跑。

## 7. 推上去

```bash
git init -b main
git add -A
git commit -m "init blog"
git remote add origin git@github.com:你的用户名/你的用户名.github.io.git
git push -u origin main
```

推完等一两分钟，打开 `https://你的用户名.github.io` 就能看到站点啦。

## 8. 写第一篇

```bash
hexo new "文章标题"
```

文件会生成在 `source/_posts/` 里。写完直接 `git push` 就搞掂啦，不用手动构建，Action 会接手。

---

到这一步博客就能用啦。剩下的坑——时区、空首页、主题怎么升级——都是真正用起来之后才踩到的，我单独记在另一篇里。
