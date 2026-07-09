# Ywpc's Blog

基于 [VitePress](https://vitepress.dev) 构建的个人博客，部署在 GitHub Pages。

## 本地开发

```bash
npm install
npm run docs:dev
```

浏览器打开 http://localhost:5173/Blog-ywpc/ 查看效果。

## 构建

```bash
npm run docs:build
```

产物在 `docs/.vitepress/dist`。

## 部署

### 1. GitHub Pages 设置

在仓库 **Settings → Pages → Source** 选择 **GitHub Actions**。

推送代码到 `main` 分支后，CI 会自动构建并部署。

### 2. 配置 Giscus 评论

1. 访问 [giscus.app](https://giscus.app) 获取配置（需使用公共仓库，且开启 Discussions 功能）
2. 修改 `docs/.vitepress/theme/components/GiscusComment.vue` 中的默认值：
   - `repo`：已配置为 `100pangci/Blog-ywpc`
   - `repoId`：替换 `<你的Giscus Repo ID>`
   - `categoryId`：替换 `<你的Giscus Category ID>`
3. 单篇文章关闭评论：在 frontmatter 中设置 `comment: false`

### 3. 配置不蒜子统计

无需额外配置，已自动加载 busuanzi 脚本。统计信息显示在文章底部和页脚。

### 4. 待填项

- `docs/.vitepress/config.mts` 页脚中的 `备案号待填`
- `docs/.vitepress/theme/components/GiscusComment.vue` 中的 Giscus repoId / categoryId

## 功能

- 站内全文搜索
- 暗色模式（跟随系统）
- Giscus 评论系统
- 不蒜子访问统计
- RSS 订阅 (`/feed.xml`)
- Sitemap 自动生成
- 图片画廊
