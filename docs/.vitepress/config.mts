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
    link: 'https://github.com/100pangci',
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

  // Vite 插件：RSS 生成
  vite: {
    plugins: [RssPlugin(RSS)],
  },

  themeConfig: {
    // 站点 Logo
    logo: '/logo.svg',
    // 本地搜索配置（中文）
    search: {
      provider: 'local',
      options: {
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

    // 导航栏
    nav: [
      { text: '首页', link: '/' },
      { text: '技术博客', link: '/posts/' },
      { text: '生活随笔', link: '/life/' },
      { text: '作品展示', link: '/gallery/' },
      { text: '关于', link: '/about' },
    ],

    // 侧边栏
    sidebar: {},

    // 社交链接
    socialLinks: [
      { icon: 'github', link: 'https://github.com/100pangci' },
    ],

    // 文章大纲
    outline: {
      level: [2, 3],
      label: '本页目录',
    },

    // 编辑链接（跳转 GitHub）
    editLink: {
      pattern: 'https://github.com/100pangci/Blog-ywpc/edit/main/docs/:path',
      text: '在 GitHub 上编辑此页',
    },

    // 最后更新时间
    lastUpdated: {
      text: '最后更新于',
      formatOptions: {
        dateStyle: 'short',
        timeStyle: 'short',
      },
    },

    // 上下页导航文案
    docFooter: {
      prev: '上一页',
      next: '下一页',
    },

    // 其余 UI 文案
    darkModeSwitchLabel: '外观',
    sidebarMenuLabel: '菜单',
    returnToTopLabel: '回到顶部',
    notFound: {
      title: '页面未找到',
      quote: '也许你要找的页面不在这里。',
      linkLabel: '返回首页',
      linkText: '返回首页',
    },

    // 页脚版权
    footer: {
      copyright: `Copyright © ${new Date().getFullYear()} <a href="https://github.com/100pangci" style="color: inherit;">Ywpc</a>`,
    },
  },
})
