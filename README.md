# wayne186.github.io

Hexo + Butterfly 的个人博客。`main` 分支放源码，GitHub Actions 构建后发布到 GitHub Pages。

站点：<https://wayne186.github.io>

## 本地开发

系统自带的 Node 18 带不动 Hexo 8（要求 ≥ 20.19），本机专门放了一份 Node 22 在 `.tools/`（已 gitignore）：

```bash
export PATH="$PWD/.tools/node-v22.23.4-darwin-arm64/bin:$PATH"
export npm_config_cache="$PWD/.npm-cache"   # ~/.npm 里有 root 权限的文件，直接用会 EPERM

npm install
npm run server    # http://localhost:4000
npm run build     # 产物在 public/
```

## 写作

```bash
npx hexo new "标题"
```

文章落在 `source/_posts/`，可用的前置字段：`title`、`date`、`tags`、`categories`、`description`。
图片放 `source/images/`，引用用绝对路径 `/images/xxx.png`。

## 配置

| 文件 | 管什么 |
|---|---|
| `_config.yml` | 站点标题、作者、URL、永久链接、生成器 |
| `_config.butterfly.yml` | 主题全部配置（菜单、侧栏、搜索、代码块），**不要改 `node_modules` 里的主题源码** |

主题走 npm 安装，升级只改 `package.json` 的版本号；自定义一律写进根目录的 `_config.butterfly.yml`。

## 发布

推 `main` 即触发 `.github/workflows/pages.yml`：

```
push main → npm ci → hexo generate → actions/upload-pages-artifact → actions/deploy-pages
```

仓库 Settings → Pages 的 Source 必须是 **GitHub Actions**。本地不需要跑 `hexo deploy`。
