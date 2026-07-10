# Blog-ywpc

基于 VitePress 的个人博客，部署在 GitHub Pages，支持中/英/日三语言。

## 技术栈

- Vue 3 + VitePress ^2.0.0-alpha.18（ESM，`"type": "module"`）
- 完全自建主题，通过 VitePress 插槽机制（`doc-before`/`doc-after`/`layout-top`）挂载自定义组件
- 多语言：VitePress 内置 `locales` + 自定义 `useI18n` composable

## 关键命令

| 命令 | 用途 |
|------|------|
| `npm run docs:dev` | 本地开发，热更新 |
| `npm run docs:build` | 构建，产物输出到 `docs/.vitepress/dist` |
| `npm run docs:preview` | 预览构建产物 |

无测试、lint、typecheck 或格式化配置。

## 多语言架构

- 使用 VitePress 内置 i18n（`locales` 配置），`/zh/` = 中文，`/en/` = 英文，`/ja/` = 日文
- 根路由 `/` 根据浏览器 `Accept-Language` 自动跳转到对应语言
- 每种语言有独立的目录：`docs/zh/`（中文）、`docs/en/`（英文）、`docs/ja/`（日文）
- 组件内的 UI 文字通过 `useI18n` composable 获取，定义在 `docs/.vitepress/theme/composables/useI18n.ts`
- 文章列表自动根据当前语言切换扫描目录（`usePosts.ts`、`useLifePosts.ts`）

## 目录结构

- `docs/.vitepress/config.mts` — 唯一配置文件（注意是 `.mts` 后缀），含 `locales` 配置
- `docs/.vitepress/theme/index.ts` — 主题入口，注册插槽组件
- `docs/.vitepress/theme/composables/` — 组合式函数
  - `usePosts.ts` — 多语言感知，扫描 `posts/` / `en/posts/` / `ja/posts/`
  - `useLifePosts.ts` — 同上，扫描 `life/` 系列
  - `useI18n.ts` — 多语言文案（zh/en/ja）
- `docs/zh/posts/` — 中文技术博客（需 `blogPost: true` 获得完整文章布局）
- `docs/zh/life/` — 中文生活随笔
- `docs/zh/gallery/` — 中文作品展示
- `docs/en/` — 英文内容（结构镜像 `docs/zh/`）
- `docs/ja/` — 日文内容（结构镜像 `docs/zh/`）
- `docs/public/images/` — 静态图片
- `docs/counter-worker.js` — Cloudflare Worker 计数器（独立部署，不属于 VitePress 构建）

## 文章发布

- 文章 frontmatter 的 `title` 自动渲染为 `<h1>`，正文中**不要重复写 `# 标题`**，否则会出现两个标题
- `blogPost: true` 标记技术博客，获得面包屑/标签/上下篇导航/Giscus 评论
- `published: false` 在列表页隐藏该文章
- `comment: false` 关闭单篇 Giscus 评论
- 技术博客标题由 `usePosts.ts` 中 frontmatter 的 `title` 字段读取，`index.md` 被过滤不进入列表
- 日期按降序排列（`localeCompare`）
- **多语言文章**：需在 `en/`、`ja/` 目录下创建同名文件，slug 保持一致
- 翻译对照参考 `TRANSLATION_PROMPT.md`

## 部署

- CI 在 `main` 分支推送时自动部署（`.github/workflows/deploy.yml`）
- GitHub Pages 需要选择 **GitHub Actions** 作为 Source
- `base: '/Blog-ywpc/'`，所有硬编码 URL 须以此前缀
- 语言切换通过 `/zh/`、`/en/`、`/ja/` 前缀自动处理

## 外部服务

- **Giscus 评论**：基于 GitHub Discussions，repo/ID 配置在 `GiscusComment.vue` 中，语言随 locale 切换
- **页面计数器**：自部署 Cloudflare Worker（`docs/counter-worker.js`），KV namespace 绑定 `BLOG_COUNTER`
- **RSS**：`vitepress-plugin-rss`，生成 `/Blog-ywpc/feed.xml`
- **Sitemap**：VitePress 内置，hostname `https://100pangci.github.io`，自动包含所有语言页面

## Markdown 扩展

- `markdown-it-task-lists`：支持 `- [ ]` / `- [x]` 任务列表
