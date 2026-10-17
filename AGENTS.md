# Blog-ywpc

VitePress 个人博客，中/英/日，GitHub Pages 部署。

## 命令

| 命令 | 用途 |
|------|------|
| `npm run docs:dev` | 本地热更新，`http://localhost:5173/Blog-ywpc/` |
| `npm run docs:build` | 构建到 `docs/.vitepress/dist` |
| `npm run docs:preview` | 预览构建产物 |

无测试/lint/typecheck/格式化。

> `lastUpdated: true` 会在构建时调用 `git`，PATH 里没有 git 会直接构建失败；CI 用 `fetch-depth: 0` 检出。
> `ignoreDeadLinks: false`：站内死链会让构建失败（临时放行可改成 `true`）。

## 架构关键点

- **VitePress ^1.6.4 + Vue 3**, `"type": "module"` (ESM)
- **全自建主题**：`docs/.vitepress/theme/index.ts` 通过 `doc-before`/`doc-after`/`layout-top` 插槽挂载自定义组件
- **唯一配置**：`docs/.vitepress/config.mts`（`.mts` 后缀）
- **Base URL**：`/Blog-ywpc/`，所有硬编码 URL 须以此前缀
- **站点地址**：`config.mts` 顶部的 `SITE_ORIGIN` / `BASE` / `SITE_URL` 是唯一来源（改域名改这里）
  - sitemap 的 `hostname` **必须带 base**（VitePress 不会自动补），否则 sitemap URL 全部指向站点根目录
  - canonical 与 Open Graph 标签由 `transformHead` 按页生成（`og:image` 取封面或 `images/bg.jpg`）
- **语言**：VitePress 内置 `locales` + 自定义 `useI18n` composable（文案在 `docs/.vitepress/i18n/{zh,en,ja}.ts`）
  - `LOCALE_DATA` → VitePress `locales` 配置
  - `MESSAGES` → 组件 UI 文字（通过 `useI18n().t('nav.home')` 调用）
- **根路由 `/`** 根据 `navigator.language` 自动 302 跳转（`docs/index.md`）
- **文章元数据（构建期）**：`docs/.vitepress/plugins/blog-meta.mts` 扫描 `docs/{zh,en,ja}/{posts,life}/*.md`，解析 frontmatter、简介、阅读时间，通过虚拟模块 `virtual:blog-meta` 提供给客户端
  - 客户端**不打包 Markdown 原文**，也不在浏览器里跑 YAML 解析器（`theme` chunk 因此从 ~294KB 降到 ~82KB）
  - `useContent.ts` 只是读取 `BLOG_META` 的薄封装；`usePosts.ts` / `useLifePosts.ts` 仅做类型包装
  - frontmatter 用 `js-yaml` 的 `load(..., { schema: JSON_SCHEMA })` 解析（日期保持字符串，不转 Date）
  - `index.md` 与 `published: false` 的文章不进入列表
  - 阅读时间：CJK 字符占比 > 30% 则 500 字/分钟，否则 220 词/分钟
  - 排序：日期降序，同日按 slug 升序
- **上下篇**：列表按日期倒序，「上一篇」= 更早的文章，「下一篇」= 更新的文章

## 目录布局

```
docs/                           # VitePress root
├── .vitepress/
│   ├── config.mts              # 唯一配置文件（含 SEO/OG transformHead）
│   ├── plugins/blog-meta.mts   # 构建期文章元数据插件（virtual:blog-meta）
│   ├── types/                  # 虚拟模块 / themeConfig 扩展的类型声明
│   ├── i18n/{zh,en,ja}.ts      # 多语言文案（LocaleData + UI messages）
│   └── theme/
│       ├── index.ts            # 主题入口，注册插槽
│       ├── composables/        # useContent, useI18n, usePosts, useLifePosts
│       ├── components/         # 11 个 Vue 组件
│       ├── config/giscusTheme.ts  # Giscus 自定义主题 CSS
│       └── style/              # 19 个 CSS 文件
├── zh/{posts,life,gallery}/    # 中文内容
├── en/{posts,life,gallery}/    # 英文内容（镜像结构）
├── ja/{posts,life,gallery}/    # 日文内容（镜像结构）
├── public/{images,favicon.svg,logo.svg,robots.txt}
├── index.md                    # 根路由自动跳转
├── counter-worker.js           # Cloudflare Worker（独立部署，非 VitePress 构建）
└── wrangler.toml               # Worker 部署配置（wrangler deploy 需在 docs/ 下执行）
```

## 文章发布

- **`blogPost: true`** 标记技术博客 → 获得面包屑/标签/上下篇导航/Giscus 评论
- **`<h1>` 的来源**：
  - 文章（`posts`/`life` 下的正文）：`BlogPostMeta` 用 `title` frontmatter 渲染 `<h1>`，所以正文**不要写 `# 标题`**（否则一页两个 h1，已踩坑）
  - 列表页（`posts/index.md`、`life/index.md`）与 `about.md`：不经过 `BlogPostMeta`，需要自己写 `# 标题`
- `published: false` → 列表隐藏；`comment: false` → 关闭单篇 Giscus
- 多语言文章：`en/`、`ja/` 下同名文件，slug 一致；翻译参考 `TRANSLATION_PROMPT.md`
- **gallery 页**：通过 `<LightboxGallery />` 组件使用，非 Markdown 驱动

## Vite 特定

- `VPNavScreen.vue` 被 Vite `resolve.alias` 覆盖为自定义版本（`theme/components/VPNavScreen.vue`）
- 自定义 Vite 插件：`blog-meta`（文章元数据）、`base-slash-redirect`（`/Blog-ywpc` → `/Blog-ywpc/`）。插件都在 `config.mts` 的 `vite.plugins`
- RSS 通过 `vitepress-plugin-rss` 生成到 `/Blog-ywpc/feed.xml`（正文全量输出到 `content:encoded`）
- Sitemap：VitePress 内置，`hostname: SITE_URL`（含 base）

## 外部服务

- **Giscus 评论**：配置在 `GiscusComment.vue`，主题色随 dark/light 切换（`giscusTheme.ts`）
- **页面计数器**：`Busuanzi.vue`（组件名保留），数据源由 `themeConfig.counterEndpoint` 决定
  - 填了地址 → 请求自部署 Cloudflare Worker（`counter-worker.js` + `wrangler.toml`，KV `BLOG_COUNTER`，返回 JSON，也兼容 `?jsonpCallback=`）
  - 留空 → 回退到公共不蒜子服务；worker 请求失败时也会自动回退
  - 部署步骤写在 `counter-worker.js` 顶部注释里

## Markdown 扩展

- `markdown-it-task-lists`：支持 `- [ ]` / `- [x]`

## 依赖与已知漏洞

- `js-yaml` 在 **dependencies**（构建期解析 frontmatter 用，v5 起没有 `safeLoad`，用 `load`）
- `npm audit` 中 `vitepress`→`vite`→`esbuild`、以及 `vitepress-plugin-rss`→`sharp`/`gray-matter` 的告警在 VitePress 1.x 线内无修复版本（前者只影响 dev server，后者只影响构建期），升级 VitePress 2 时再处理
