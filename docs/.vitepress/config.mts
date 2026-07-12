// VitePress 配置文件 — 博客全局设置、主题、插件
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitepress'
import { RssPlugin, type RSSOptions } from 'vitepress-plugin-rss'
import taskLists from 'markdown-it-task-lists'

// ========== RSS 订阅配置 ==========
const RSS: RSSOptions = {
  title: "Ywpc's Blog",
  baseUrl: 'https://100pangci.github.io',
  copyright: `Copyright (c) ${new Date().getFullYear()}, Ywpc`,
  description: '个人博客 - 技术笔记 / 生活随笔 / 作品展示',
  language: 'zh-cn',
  filename: 'feed.xml',
  ignoreHome: true,
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
  base: '/Blog-ywpc/',
  lastUpdated: true,
  cleanUrls: true,
  ignoreDeadLinks: true,

  // ========== Markdown 扩展 ==========
  markdown: {
    config: (md) => {
      md.use(taskLists)
    },
  },

  // ========== Head 标签 ==========
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/Blog-ywpc/favicon.svg' }],
    ['link', { rel: 'preload', as: 'image', href: 'https://github.com/100pangci.png' }],
    ['link', { rel: 'alternate', type: 'application/rss+xml', title: "Ywpc's Blog RSS", href: '/Blog-ywpc/feed.xml' }],
    ['meta', { name: 'theme-color', content: '#e95295' }],
    ['meta', { name: 'og:type', content: 'website' }],
    ['meta', { name: 'og:locale', content: 'zh_CN' }],
    ['script', {}, `document.addEventListener('DOMContentLoaded',function(){document.querySelectorAll('.VPFeature').forEach(function(c){c.addEventListener('mousemove',function(n){var r=c.getBoundingClientRect();c.style.setProperty('--mx',(n.clientX-r.left)/r.width*100+'%');c.style.setProperty('--my',(n.clientY-r.top)/r.height*100+'%')})})});`],
  ],

  // ========== Sitemap ==========
  sitemap: {
    hostname: 'https://100pangci.github.io',
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
