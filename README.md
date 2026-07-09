# Ywpc's Blog

基于 [VitePress](https://vitepress.dev) 构建的个人博客，部署在 GitHub Pages。

## 本地开发

```bash
npm install
npm run docs:dev
```

浏览器打开 http://localhost:5173/Blog-ywpc/ 查看效果。

## 发布文章

### 技术博客

在 `docs/posts/` 下新建 `.md` 文件，按以下格式编写：

```md
---
blogPost: true
title: 文章标题
date: 2026-07-09
author: 100pangci
tags: [标签1, 标签2]
description: 文章摘要（可选）
---

你的 Markdown 内容...
```

> 标题由 frontmatter 的 `title` 字段自动渲染为 `<h1>`，正文中不要重复写 `# 标题`。

### 生活随笔

在 `docs/life/` 下新建 `.md` 文件：

```md
---
title: 随笔标题
date: 2026-07-09
tags: [标签1, 标签2]
---

你的内容...
```

### 图片引用

将图片放入 `docs/public/images/`，在文章中引用：

```md
![描述](/images/your-image.png)
```

### 关闭评论

在 frontmatter 中添加 `comment: false` 即可关闭单篇文章的 Giscus 评论。

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

1. 访问 [giscus.app](https://giscus.app) 获取配置
2. 修改 `docs/.vitepress/theme/components/GiscusComment.vue` 中的默认值：
   - `repo`：已配置为 `100pangci/Blog-ywpc`
   - `repoId`：已配置
   - `categoryId`：已配置
3. 单篇文章关闭评论：在 frontmatter 中设置 `comment: false`

### 3. 配置自部署页面计数器

> 不再使用不蒜子（`busuanzi.ibruce.info`）服务。改为自部署的 Cloudflare Worker。

1. 安装 [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)（`npm i -g wrangler`）
2. 登录 Cloudflare：`wrangler login`
3. 创建 KV Namespace：`wrangler kv:namespace create "BLOG_COUNTER"`
4. 复制输出的 namespace ID
5. 在 `docs/counter-worker.js` 顶部有 `wrangler.toml` 模板，创建文件后填入 namespace ID：

```toml
name = "blog-counter"
main = "counter.js"
compatibility_date = "2026-01-01"

[[kv_namespaces]]
binding = "BLOG_COUNTER"
id = "你的namespace-id"
```

6. 部署：`wrangler deploy`
7. 修改 `docs/.vitepress/theme/components/Busuanzi.vue` 第一行的 `COUNTER_ENDPOINT` 为你的 worker 地址。

## 主题架构

完全自建的 VitePress 主题，不依赖 `vitepress-plugin-blog`：

```
docs/.vitepress/theme/
├── index.ts                 # 入口，注册 doc-before / doc-after 插槽
├── style/vars.css           # 全局样式变量 + 移动端适配 + 毛玻璃背景
├── components/
│   ├── BlogPostMeta.vue     # 文章头部（面包屑 / 标题 / 描述 / 作者 / 日期 / 标签 / 封面）
│   ├── BlogPostNav.vue      # 上下篇导航
│   ├── BlogList.vue         # 博客列表页（搜索 + 标签筛选）
│   ├── Busuanzi.vue         # 自部署计数器（Cloudflare Worker）
│   └── GiscusComment.vue    # Giscus 评论
└── composables/
    └── usePosts.ts          # import.meta.glob 扫描 posts/，SSR 友好
```

**文章详情页渲染流程：**

1. `theme/index.ts` 通过 `doc-before` 插槽检测 `frontmatter.blogPost === true`
2. 匹配到时渲染 `BlogPostMeta`（面包屑、标题、标签等）—— SSR 直接输出静态 HTML
3. `doc-after` 插槽追加 `BlogPostNav`（上下篇）+ 计数器 + Giscus 评论

## 功能

- 站内全文搜索
- 暗色模式（跟随系统）
- Giscus 评论系统
- 自部署页面计数器
- RSS 订阅 (`/feed.xml`)
- Sitemap 自动生成
- 图片画廊
- Markdown 任务列表 (`- [ ]`)
