# Blog-ywpc

基于 VitePress 的个人博客，部署在 GitHub Pages。

## 技术栈

- Vue 3 + VitePress ^2.0.0-alpha.18（ESM，`"type": "module"`）
- 完全自建主题，通过 VitePress 插槽机制（`doc-before`/`doc-after`/`layout-top`）挂载自定义组件

## 关键命令

| 命令 | 用途 |
|------|------|
| `npm run docs:dev` | 本地开发，热更新 |
| `npm run docs:build` | 构建，产物输出到 `docs/.vitepress/dist` |
| `npm run docs:preview` | 预览构建产物 |

无测试、lint、typecheck 或格式化配置。

## 目录结构

- `docs/.vitepress/config.mts` — 唯一配置文件（注意是 `.mts` 后缀）
- `docs/.vitepress/theme/index.ts` — 主题入口，注册插槽组件
- `docs/.vitepress/theme/composables/usePosts.ts` — 通过 `import.meta.glob('../../../posts/*.md', { query: '?raw', eager: true })` 扫描文章
- `docs/posts/` — 技术博客（需 `blogPost: true` 获得完整文章布局）
- `docs/life/` — 生活随笔（不含 `blogPost: true`，仅在 `/life/` 下展示）
- `docs/gallery/` — 作品展示
- `docs/public/images/` — 静态图片
- `docs/counter-worker.js` — Cloudflare Worker 计数器（独立部署，不属于 VitePress 构建）

## 文章发布

- 文章 frontmatter 的 `title` 自动渲染为 `<h1>`，正文中**不要重复写 `# 标题`**，否则会出现两个标题
- `blogPost: true` 标记技术博客，获得面包屑/标签/上下篇导航/Giscus 评论
- `published: false` 在列表页隐藏该文章
- `comment: false` 关闭单篇 Giscus 评论
- 技术博客标题由 `usePosts.ts` 中 frontmatter 的 `title` 字段读取，`index.md` 被过滤不进入列表
- 日期按降序排列（`localeCompare`）

## 部署

- CI 在 `main` 分支推送时自动部署（`.github/workflows/deploy.yml`）
- GitHub Pages 需要选择 **GitHub Actions** 作为 Source
- `base: '/Blog-ywpc/'`，所有硬编码 URL 须以此前缀

## 外部服务

- **Giscus 评论**：基于 GitHub Discussions，repo/ID 配置在 `GiscusComment.vue` 中
- **页面计数器**：自部署 Cloudflare Worker（`docs/counter-worker.js`），KV namespace 绑定 `BLOG_COUNTER`
- **RSS**：`vitepress-plugin-rss`，生成 `/Blog-ywpc/feed.xml`
- **Sitemap**：VitePress 内置，hostname `https://100pangci.github.io`

## Markdown 扩展

- `markdown-it-task-lists`：支持 `- [ ]` / `- [x]` 任务列表
