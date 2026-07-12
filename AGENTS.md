# Blog-ywpc

VitePress 个人博客，中/英/日，GitHub Pages 部署。

## 命令

| 命令 | 用途 |
|------|------|
| `npm run docs:dev` | 本地热更新，`http://localhost:5173/Blog-ywpc/` |
| `npm run docs:build` | 构建到 `docs/.vitepress/dist` |
| `npm run docs:preview` | 预览构建产物 |

无测试/lint/typecheck/格式化。

## 架构关键点

- **VitePress ^1.6.4 + Vue 3**, `"type": "module"` (ESM)
- **全自建主题**：`docs/.vitepress/theme/index.ts` 通过 `doc-before`/`doc-after`/`layout-top` 插槽挂载自定义组件
- **唯一配置**：`docs/.vitepress/config.mts`（`.mts` 后缀）
- **Base URL**：`/Blog-ywpc/`，所有硬编码 URL 须以此前缀
- **语言**：VitePress 内置 `locales` + 自定义 `useI18n` composable（文案在 `docs/.vitepress/i18n/{zh,en,ja}.ts`）
  - `LOCALE_DATA` → VitePress `locales` 配置
  - `MESSAGES` → 组件 UI 文字（通过 `useI18n().t('nav.home')` 调用）
- **根路由 `/`** 根据 `navigator.language` 自动 302 跳转（`docs/index.md`）
- **内容扫描**：`useContent.ts` 统一处理 `posts`/`life` 两种类型，使用 `import.meta.glob` 扫描对应语言目录
  - `usePosts.ts` / `useLifePosts.ts` 仅做类型包装
  - `index.md` 被过滤不进入列表
- **Frontmatter 解析**：手写 YAML 解析器（`useContent.ts:54`），非 `gray-matter`
- **阅读时间**：CJK 字符占比 > 30% 则 500 字/分钟，否则 220 词/分钟
- **日期降序**：`localeCompare` 排序

## 目录布局

```
docs/                           # VitePress root
├── .vitepress/
│   ├── config.mts              # 唯一配置文件
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
├── public/{images,favicon.svg,logo.svg}
├── index.md                    # 根路由自动跳转
└── counter-worker.js           # Cloudflare Worker（独立部署，非 VitePress 构建）
```

## 文章发布

- **`blogPost: true`** 标记技术博客 → 获得面包屑/标签/上下篇导航/Giscus 评论
- **标题由 `title` frontmatter 自动渲染为 `<h1>`**，正文**不要写 `# 标题`**
- `published: false` → 列表隐藏；`comment: false` → 关闭单篇 Giscus
- 多语言文章：`en/`、`ja/` 下同名文件，slug 一致；翻译参考 `TRANSLATION_PROMPT.md`
- **gallery 页**：通过 `<LightboxGallery />` 组件使用，非 Markdown 驱动

## Vite 特定

- `VPNavScreen.vue` 被 Vite `resolve.alias` 覆盖为自定义版本（`theme/components/VPNavScreen.vue`）
- 自定义 Vite 插件 `base-slash-redirect`：将 `/Blog-ywpc`（无尾斜杠）302 到 `/Blog-ywpc/`
- RSS 通过 `vitepress-plugin-rss` 生成到 `/Blog-ywpc/feed.xml`
- Sitemap：VitePress 内置，hostname `https://100pangci.github.io`

## 外部服务

- **Giscus 评论**：配置在 `GiscusComment.vue`，主题色随 dark/light 切换（`giscusTheme.ts`）
- **页面计数器**：自部署 Cloudflare Worker（`counter-worker.js`），KV `BLOG_COUNTER`，需配套 `wrangler.toml`
- **不蒜子已弃用**，改用上述自部署 Worker；`Busuanzi.vue` 组件名保留但 endpoint 已改为 Worker 地址

## Markdown 扩展

- `markdown-it-task-lists`：支持 `- [ ]` / `- [x]`
