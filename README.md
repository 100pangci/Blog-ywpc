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
blogPost: true        # 标记为博客文章（必须）
title: 文章标题        # 页面标题和列表显示（必须）
date: 2026-07-09      # 发布日期，用于排序
author: 100pangci     # 作者名（可写 GitHub 用户名）
tags: [Vue, VitePress]  # 标签，列表页可筛选
description: 文章摘要   # 可选，不填则自动截取正文首段
cover: /images/xxx.png # 可选，封面图
---

你的 Markdown 内容...
```

> **注意**：标题由 frontmatter 的 `title` 自动渲染为 `<h1>`，正文中**不要重复写 `# 标题`**，否则会出现两个标题。

**文章自动获得：**
- 面包屑导航（技术博客 / 文章标题）
- 作者、发布日期、阅读时间（自动计算）
- 标签胶囊
- 上下篇导航（按日期排序）
- Giscus 评论（可关闭）

### 生活随笔

在 `docs/life/` 下新建 `.md` 文件：

```md
---
blogPost: true
title: 随笔标题
description: 简要描述
date: 2026-07-09
author: 100pangci
tags: [生活, 旅行]
---

你的内容...
```

> 生活随笔不会出现在 `/posts/` 技术博客列表中，仅在 `/life/` 下展示。

### Frontmatter 字段说明

| 字段 | 适用 | 说明 |
|------|------|------|
| `blogPost` | 技术博客 | `true` 时标记为文章，获得完整文章布局 |
| `title` | 全部 | 页面标题，同时也作为列表显示的标题 |
| `date` | 全部 | `YYYY-MM-DD` 格式，按此降序排列 |
| `tags` | 全部 | 数组 `[标签1, 标签2]`，列表页可筛选 |
| `author` | 技术博客 | 作者名，GitHub 用户名会自动显示头像 |
| `description` | 全部 | 列表页显示的摘要，不填则自动截取正文 |
| `cover` | 技术博客 | 封面图 URL 或 `/images/xxx.png` |
| `comment` | 全部 | `false` 时关闭该页 Giscus 评论 |
| `aside` | 全部 | `false` 时隐藏右侧大纲栏 |
| `published` | 全部 | `false` 时不在任何列表中出现 |

### Markdown 功能

该博客支持标准 Markdown 语法及以下扩展：

**任务列表：**
```md
- [x] 已完成的事项
- [ ] 待办的事项
```

**代码块（带高亮和行号）：**
````md
```js
console.log('Hello World')
```
````

**表格：**
```md
| 名称 | 说明 |
|------|------|
| Foo  | Bar  |
```

**提示框：**
```md
::: tip 提示
这是一条提示信息
:::

::: warning 注意
这是一条警告
:::

::: danger 危险
这是危险提醒
:::
```

**图片引用：**

将图片放入 `docs/public/images/`，在文章中引用：

```md
![描述](/images/your-image.png)
```

### 关闭评论

在 frontmatter 中添加 `comment: false` 即可关闭单篇文章的 Giscus 评论：

```md
---
title: 某篇文章
comment: false
---
```

### 预览文章

```bash
npm run docs:dev
```

浏览器打开 `http://localhost:5173/Blog-ywpc/`，修改 Markdown 后页面会自动热更新。

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
│   ├── BlogList.vue         # 博客列表页（搜索 + 标签筛选 + 分页）
│   ├── Busuanzi.vue         # 自部署计数器（Cloudflare Worker）
│   ├── GiscusComment.vue    # Giscus 评论
│   ├── BackToTop.vue        # 回到顶部按钮
│   ├── FloatingToc.vue      # 浮动目录
│   └── LoadingBar.vue       # 页面切换加载进度条
└── composables/
    ├── usePosts.ts          # import.meta.glob 扫描 posts/，SSR 友好
    ├── useLifePosts.ts      # 扫描 life/，同上
    └── useFloatingToc.ts    # 浮动目录逻辑
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
- 浮动目录（文章页自动生成，随滚动高亮当前位置）
- 回到顶部按钮（右下角浮动）
- 页面切换加载进度条（顶部进度指示器）
- 列表页分页（每页 5/10/20 篇可切换）
- 列表页按标签筛选
- 列表页搜索（匹配标题和描述）
