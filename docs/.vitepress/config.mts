// VitePress 配置文件 — 博客全局设置、主题、插件
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitepress'
import { RssPlugin, type RSSOptions } from 'vitepress-plugin-rss'
import taskLists from 'markdown-it-task-lists'
import { blogMetaPlugin, scanBlogMeta } from './plugins/blog-meta.mts'
import type { PostMeta } from './plugins/blog-meta.mts'

// ========== 站点地址（改域名时只需改这里） ==========
const SITE_ORIGIN = 'https://100pangci.github.io'
const BASE = '/Blog-ywpc/'
const SITE_URL = `${SITE_ORIGIN}${BASE}`

// 文章元数据（构建期解析一次，供 SEO 兜底使用）
const POSTS_BY_URL = new Map<string, PostMeta>()
{
  const meta = scanBlogMeta()
  for (const type of ['posts', 'life'] as const) {
    for (const locale of ['zh', 'en', 'ja'] as const) {
      for (const post of meta[type][locale]) {
        POSTS_BY_URL.set(post.url, post)
      }
    }
  }
}

// 页面相对路径（如 zh/posts/first.md）→ 站点内路径 /zh/posts/first
function pagePath(page: string): string {
  return '/' + page.replace(/(^|\/)index\.md$/, '$1').replace(/\.md$/, '')
}

// 页面相对路径 → 绝对 URL
function pageUrl(page: string): string {
  return `${SITE_URL}${pagePath(page).slice(1)}`
}

// ========== RSS 订阅配置 ==========
const RSS: RSSOptions = {
  title: "Ywpc's Blog",
  baseUrl: SITE_ORIGIN,
  copyright: `Copyright (c) ${new Date().getFullYear()}, Ywpc`,
  description: '个人博客 - 技术笔记 / 生活随笔 / 作品展示',
  language: 'zh-cn',
  filename: 'feed.xml',
  ignoreHome: true,
  filter: ({ filepath, frontmatter }) => {
    const contentPath = filepath.replace(/\\/g, '/')
    return /\/(?:zh|en|ja)\/(?:posts|life)\/(?!index\.md$)[^/]+\.md$/.test(contentPath)
      && frontmatter.published !== false
  },
  ariaLabel: 'RSS Feed',
  author: {
    name: 'Ywpc',
    email: 'ywpc05@gmail.com',
    link: 'https://github.com/100pangci/Blog-ywpc',
  },
}

import { LOCALE_DATA, buildLocaleConfig } from './i18n'

export default defineConfig({
  // ========== 站点基础配置 ==========
  lang: 'zh-CN',
  title: "Ywpc's Blog",
  description: '个人博客 - 技术笔记 / 生活随笔 / 作品展示',
  base: BASE,
  lastUpdated: true,
  cleanUrls: true,
  // 死链直接构建失败，避免上线后才发现（如需临时放行改成 true）
  ignoreDeadLinks: false,

  // ========== Markdown 扩展 ==========
  markdown: {
    config: (md) => {
      md.use(taskLists)
    },
  },

  // ========== Head 标签 ==========
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${BASE}favicon.svg` }],
    ['link', { rel: 'preload', as: 'image', href: 'https://github.com/100pangci.png' }],
    ['link', { rel: 'alternate', type: 'application/rss+xml', title: "Ywpc's Blog RSS", href: `${BASE}feed.xml` }],
    ['meta', { name: 'theme-color', content: '#e95295' }],
    ['script', {}, `document.addEventListener('DOMContentLoaded',function(){document.querySelectorAll('.VPFeature').forEach(function(c){c.addEventListener('mousemove',function(n){var r=c.getBoundingClientRect();c.style.setProperty('--mx',(n.clientX-r.left)/r.width*100+'%');c.style.setProperty('--my',(n.clientY-r.top)/r.height*100+'%')})})});`],
  ],

  // ========== 每页 SEO 标签（canonical + Open Graph） ==========
  transformHead({ page, pageData, title, description }) {
    const post = POSTS_BY_URL.get(pagePath(page))
    const url = pageUrl(page)
    const fm = pageData.frontmatter || {}
    const cover = (typeof fm.cover === 'string' && fm.cover) || post?.cover || 'images/bg.jpg'
    const image = new URL(cover, SITE_URL).href
    const ogTitle = pageData.title || title
    const ogDescription = (post?.description || pageData.description || description || '').slice(0, 200)

    return [
      ['link', { rel: 'canonical', href: url }],
      ['meta', { property: 'og:type', content: fm.blogPost ? 'article' : 'website' }],
      ['meta', { property: 'og:site_name', content: "Ywpc's Blog" }],
      ['meta', { property: 'og:locale', content: (pageData.lang || 'zh-CN').replace('-', '_') }],
      ['meta', { property: 'og:title', content: ogTitle }],
      ['meta', { property: 'og:description', content: ogDescription }],
      ['meta', { property: 'og:url', content: url }],
      ['meta', { property: 'og:image', content: image }],
      ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ]
  },

  // ========== Sitemap ==========
  // hostname 需包含 base，否则生成的 URL 会指向站点根目录（VitePress 不会自动补 base）
  sitemap: {
    hostname: SITE_URL,
  },

  // ========== Vite 插件 ==========
  vite: {
    resolve: {
      alias: [
        {
          find: /^.*\/VPNavScreen\.vue$/,
          replacement: fileURLToPath(
            new URL('./theme/components/VPNavScreen.vue', import.meta.url)
          ),
        },
      ],
    },
    plugins: [
      blogMetaPlugin(),
      RssPlugin(RSS),
      {
        name: 'base-slash-redirect',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url === '/Blog-ywpc' || req.url === '/blog-ywpc') {
              res.statusCode = 302
              res.setHeader('Location', '/Blog-ywpc/')
              res.end()
              return
            }
            next()
          })
        },
      },
    ],
  },

  // ========== 多语言配置 ==========
  locales: Object.fromEntries(LOCALE_DATA.map(d => [d.key, buildLocaleConfig(d)])),

  // ========== 共享主题配置 ==========
  themeConfig: {
    logo: '/logo.svg',
    // 自部署计数器（Cloudflare Worker，见 docs/counter-worker.js + docs/wrangler.toml）
    // 部署后填入 worker 地址，例如 'https://blog-counter.xxx.workers.dev/counter'；
    // 留空则回退到公共不蒜子服务
    counterEndpoint: '',
    socialLinks: [
      { icon: 'github', link: 'https://github.com/100pangci/Blog-ywpc' },
    ],
    footer: {
      copyright: `Copyright © ${new Date().getFullYear()} <a href="https://github.com/100pangci" style="color: inherit;">Ywpc</a>`,
    },
    search: {
      provider: 'local',
      options: {
        locales: Object.fromEntries(LOCALE_DATA.map(d => [d.key, {
          translations: {
            button: { buttonText: d.search.buttonText, buttonAriaLabel: d.search.buttonAriaLabel },
            modal: {
              noResultsText: d.search.noResultsText,
              resetButtonTitle: d.search.resetButtonTitle,
              footer: { selectText: d.search.selectText, navigateText: d.search.navigateText, closeText: d.search.closeText },
            },
          },
        }])),
      },
    },
  },
})
