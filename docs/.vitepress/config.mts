import { defineConfig } from 'vitepress'
import { RssPlugin, type RSSOptions } from 'vitepress-plugin-rss'

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
    link: 'https://github.com/100pangci',
  },
}

export default defineConfig({
  lang: 'zh-CN',
  title: "Ywpc's Blog",
  description: '个人博客 - 技术笔记 / 生活随笔 / 作品展示',
  base: '/Blog-ywpc/',
  lastUpdated: true,
  cleanUrls: true,
  ignoreDeadLinks: true,

  head: [
    ['link', { rel: 'icon', href: '/Blog-ywpc/favicon.ico' }],
    ['link', { rel: 'alternate', type: 'application/rss+xml', title: "Ywpc's Blog RSS", href: '/Blog-ywpc/feed.xml' }],
    ['meta', { name: 'theme-color', content: '#3b82f6' }],
    ['meta', { name: 'og:type', content: 'website' }],
    ['meta', { name: 'og:locale', content: 'zh_CN' }],
  ],

  sitemap: {
    hostname: 'https://100pangci.github.io',
  },

  vite: {
    plugins: [RssPlugin(RSS)],
  },

  themeConfig: {
    logo: '/logo.svg',
    search: {
      provider: 'local',
      options: {
        locales: {
          zh: {
            translations: {
              button: {
                buttonText: '搜索',
                buttonAriaLabel: '搜索文档',
              },
              modal: {
                noResultsText: '没有找到相关结果',
                resetButtonTitle: '清除查询',
                footer: {
                  selectText: '选择',
                  navigateText: '切换',
                  closeText: '关闭',
                },
              },
            },
          },
        },
      },
    },

    nav: [
      { text: '首页', link: '/' },
      { text: '技术博客', link: '/posts/hello' },
      { text: '生活随笔', link: '/life/first' },
      { text: '作品展示', link: '/gallery/' },
      { text: '关于', link: '/about' },
    ],

    sidebar: {
      '/posts/': [
        {
          text: '技术博客',
          items: [
            { text: 'Hello World', link: '/posts/hello' },
          ],
        },
      ],
      '/life/': [
        {
          text: '生活随笔',
          items: [
            { text: '第一篇随笔', link: '/life/first' },
          ],
        },
      ],
      '/gallery/': [
        {
          text: '作品展示',
          items: [
            { text: '画廊', link: '/gallery/' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/100pangci' },
      { icon: { svg: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 11a9 9 0 0 1 9 9"></path><path d="M4 4a16 16 0 0 1 16 16"></path><circle cx="5" cy="19" r="1"></circle></svg>' }, link: '/feed.xml', ariaLabel: 'RSS Feed' },
    ],

    outline: {
      level: [2, 3],
      label: '本页目录',
    },

    editLink: {
      pattern: 'https://github.com/100pangci/Blog-ywpc/edit/main/docs/:path',
      text: '在 GitHub 上编辑此页',
    },

    lastUpdated: {
      text: '最后更新于',
      formatOptions: {
        dateStyle: 'short',
        timeStyle: 'short',
      },
    },

    docFooter: {
      prev: '上一页',
      next: '下一页',
    },

    darkModeSwitchLabel: '外观',
    sidebarMenuLabel: '菜单',
    returnToTopLabel: '回到顶部',
    notFound: {
      title: '页面未找到',
      quote: '也许你要找的页面不在这里。',
      linkLabel: '返回首页',
      linkText: '返回首页',
    },

    footer: {
      message: '<a href="/feed.xml" style="color: inherit;">RSS 订阅</a>',
      copyright: `Copyright © ${new Date().getFullYear()} <a href="https://github.com/100pangci" style="color: inherit;">Ywpc</a>`,
    },
  },
})
