// VitePress 配置文件 — 博客全局设置、主题、插件
import { defineConfig } from 'vitepress'
import { RssPlugin, type RSSOptions } from 'vitepress-plugin-rss'
import taskLists from 'markdown-it-task-lists'

// RSS 订阅配置
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

export default defineConfig({
  // 站点基础元信息
  lang: 'zh-CN',
  title: "Ywpc's Blog",
  description: '个人博客 - 技术笔记 / 生活随笔 / 作品展示',
  base: '/Blog-ywpc/',
  lastUpdated: true,
  cleanUrls: true,
  ignoreDeadLinks: true,

  // Markdown 扩展：任务列表语法
  markdown: {
    config: (md) => {
      md.use(taskLists)
    },
  },

  // <head> 内嵌标签：图标、RSS、主题色、OG、Feature 卡片鼠标跟随光效
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/Blog-ywpc/favicon.svg' }],
    ['link', { rel: 'alternate', type: 'application/rss+xml', title: "Ywpc's Blog RSS", href: '/Blog-ywpc/feed.xml' }],
    ['meta', { name: 'theme-color', content: '#e95295' }],
    ['meta', { name: 'og:type', content: 'website' }],
    ['meta', { name: 'og:locale', content: 'zh_CN' }],
    ['script', {}, `document.addEventListener('DOMContentLoaded',function(){document.querySelectorAll('.VPFeature').forEach(function(c){c.addEventListener('mousemove',function(n){var r=c.getBoundingClientRect();c.style.setProperty('--mx',(n.clientX-r.left)/r.width*100+'%');c.style.setProperty('--my',(n.clientY-r.top)/r.height*100+'%')})})});`],
  ],

  // Sitemap 生成
  sitemap: {
    hostname: 'https://100pangci.github.io',
  },

  // Vite 插件：RSS 生成 + base URL 尾斜杠跳转
  vite: {
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
  locales: {
    zh: {
      label: '中文',
      lang: 'zh-CN',
      title: "Ywpc's Blog",
      description: '个人博客 - 技术笔记 / 生活随笔 / 作品展示',
      themeConfig: {
        nav: [
          { text: '首页', link: '/zh/' },
          { text: '技术博客', link: '/zh/posts/' },
          { text: '生活随笔', link: '/zh/life/' },
          { text: '作品展示', link: '/zh/gallery/' },
          { text: '关于', link: '/zh/about' },
        ],
        outline: { level: [2, 3], label: '本页目录' },
        editLink: {
          pattern: 'https://github.com/100pangci/Blog-ywpc/edit/main/docs/:path',
          text: '在 GitHub 上编辑此页',
        },
        lastUpdated: { text: '最后更新于', formatOptions: { dateStyle: 'short', timeStyle: 'short' } },
        docFooter: { prev: '上一页', next: '下一页' },
        darkModeSwitchLabel: '外观',
        sidebarMenuLabel: '菜单',
        returnToTopLabel: '回到顶部',
        notFound: {
          title: '页面未找到',
          quote: '也许你要找的页面不在这里。',
          linkLabel: '返回首页',
          linkText: '返回首页',
        },
      },
    },
    en: {
      label: 'English',
      lang: 'en-US',
      title: "Ywpc's Blog",
      description: 'Personal blog - Tech notes / Life / Gallery',
      themeConfig: {
        nav: [
          { text: 'Home', link: '/en/' },
          { text: 'Blog', link: '/en/posts/' },
          { text: 'Life', link: '/en/life/' },
          { text: 'Gallery', link: '/en/gallery/' },
          { text: 'About', link: '/en/about' },
        ],
        outline: { level: [2, 3], label: 'On this page' },
        editLink: {
          pattern: 'https://github.com/100pangci/Blog-ywpc/edit/main/docs/:path',
          text: 'Edit this page on GitHub',
        },
        lastUpdated: { text: 'Last updated', formatOptions: { dateStyle: 'short', timeStyle: 'short' } },
        docFooter: { prev: 'Previous', next: 'Next' },
        darkModeSwitchLabel: 'Appearance',
        sidebarMenuLabel: 'Menu',
        returnToTopLabel: 'Back to top',
        notFound: {
          title: 'Page not found',
          quote: 'The page you are looking for is not here.',
          linkLabel: 'Back to home',
          linkText: 'Back to home',
        },
      },
    },
    ja: {
      label: '日本語',
      lang: 'ja-JP',
      title: "Ywpc's Blog",
      description: '個人ブログ - 技術ノート / 日常 / ギャラリー',
      themeConfig: {
        nav: [
          { text: 'ホーム', link: '/ja/' },
          { text: 'ブログ', link: '/ja/posts/' },
          { text: '日常', link: '/ja/life/' },
          { text: 'ギャラリー', link: '/ja/gallery/' },
          { text: 'について', link: '/ja/about' },
        ],
        outline: { level: [2, 3], label: '目次' },
        editLink: {
          pattern: 'https://github.com/100pangci/Blog-ywpc/edit/main/docs/:path',
          text: 'GitHub で編集',
        },
        lastUpdated: { text: '最終更新', formatOptions: { dateStyle: 'short', timeStyle: 'short' } },
        docFooter: { prev: '前へ', next: '次へ' },
        darkModeSwitchLabel: 'テーマ',
        sidebarMenuLabel: 'メニュー',
        returnToTopLabel: 'トップへ戻る',
        notFound: {
          title: 'ページが見つかりません',
          quote: 'お探しのページは見つかりませんでした。',
          linkLabel: 'ホームに戻る',
          linkText: 'ホームに戻る',
        },
      },
    },
  },

  themeConfig: {
    // 站点 Logo（共用）
    logo: '/logo.svg',
    // 社交链接（共用）
    socialLinks: [
      { icon: 'github', link: 'https://github.com/100pangci/Blog-ywpc' },
    ],
    // 页脚版权（共用）
    footer: {
      copyright: `Copyright © ${new Date().getFullYear()} <a href="https://github.com/100pangci" style="color: inherit;">Ywpc</a>`,
    },
    // 本地搜索（多语言文案通过 locales 切换）
    search: {
      provider: 'local',
      options: {
        locales: {
          zh: {
            translations: {
              button: { buttonText: '搜索', buttonAriaLabel: '搜索文档' },
              modal: {
                noResultsText: '没有找到相关结果',
                resetButtonTitle: '清除查询',
                footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' },
              },
            },
          },
          en: {
            translations: {
              button: { buttonText: 'Search', buttonAriaLabel: 'Search articles' },
              modal: {
                noResultsText: 'No results found',
                resetButtonTitle: 'Clear query',
                footer: { selectText: 'Select', navigateText: 'Navigate', closeText: 'Close' },
              },
            },
          },
          ja: {
            translations: {
              button: { buttonText: '検索', buttonAriaLabel: '記事を検索' },
              modal: {
                noResultsText: '関連する結果は見つかりませんでした',
                resetButtonTitle: 'クエリをクリア',
                footer: { selectText: '選択', navigateText: '移動', closeText: '閉じる' },
              },
            },
          },
        },
      },
    },
  },
})
