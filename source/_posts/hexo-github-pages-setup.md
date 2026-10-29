---
title: Hexo 博客上线，卡在时区和空首页上
date: 2026-10-29 23:10:00
tags: [Hexo, GitHub Pages]
categories: [技术]
---

Hexo 8.1.2 的 `engines` 要求 Node ≥ 20.19，本机是 18.17.1，`npm install` 直接被拒。这一趟一共卡了三处，记下来省得下次重踩。

## 环境：brew 没开始，npm 有旧账

brew 装 Node 22 停在 tap 更新，二十分钟过去 `~/Library/Logs/Homebrew/node@22` 都没生成——不是慢，是根本没起步。改成下官方二进制包：

```bash
curl -fsSL -O https://nodejs.org/dist/latest-v22.x/node-v22.23.4-darwin-arm64.tar.xz
tar -xf node-v22.23.4-darwin-arm64.tar.xz -C .tools/
```

解压到项目的 `.tools/` 里，`SHA256` 对得上就用，系统 Node 一点没动。

另一个陈年问题：`~/.npm` 里有 root 权限的残留文件，任何 npm 命令都报 `EPERM`。不想动系统就绕：

```bash
export npm_config_cache="$PWD/.npm-cache"
```

## 时区：本地 10/24，线上 10/23

本地 `hexo g` 生成的链接是 `/2026/10/24/hello-world/`，推上去线上首页的链接却指向 `/2026/10/23/`，点进去 404。

`_config.yml` 里明明写了 `timezone: 'Asia/Shanghai'`。分别用两个时区跑一遍就清楚了：

```bash
TZ=UTC npx hexo generate           # 2026/10/23/hello-world
TZ=Asia/Shanghai npx hexo generate # 2026/10/24/hello-world
```

配置项确实读到了，但 Hexo 8 计算日期型永久链接用的是系统时区，配置里的 `timezone` 不参与决定。GitHub Actions 跑在 UTC，于是和本地差一天。

修法不加依赖，工作流里钉死：

```yaml
env:
  TZ: Asia/Shanghai
```

## 删掉测试文章，首页没了

把测试文章挪进 `source/_drafts/` 之后，构建只吐出 about、tags、categories 三个页面，`index.html` 不见了。不是构建失败，是 `hexo-generator-index` 把文章列表交给 `hexo-pagination`，空集合直接返回空数组——没有文章就没有首页。

能选的路只有三条：留一篇占位文章、自己写脚本补生成、或者等有真文章再上线。前两条都不划算，所以这篇就是那篇占位文章。

## 三个可以直接拿走的事实

- Hexo 8 要 Node ≥ 20.19，装不上先看 `engines`，别怀疑网络
- 日期型永久链接跟系统时区走，CI 里显式设 `TZ`
- 零文章时首页不存在，是生成器行为，不是配置写错
