import { defineConfig } from 'vitepress'
import { RssPlugin, type RSSOptions } from 'vitepress-plugin-rss'
import { blogPlugin } from 'vitepress-plugin-blog/plugin'

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
    ['meta', { name: 'theme-color', content: '#e95295' }],
    ['meta', { name: 'og:type', content: 'website' }],
    ['meta', { name: 'og:locale', content: 'zh_CN' }],
    ['script', {}, `document.addEventListener('DOMContentLoaded',()=>{const e=document.querySelector('.VPHero .image-container');if(!e)return;const t=e.querySelector('img');if(!t)return;let o=!1;e.addEventListener('mousemove',n=>{const r=e.getBoundingClientRect(),s=(n.clientX-r.left)/r.width-.5,l=(n.clientY-r.top)/r.height-.5,i=Math.max(r.width,r.height);t.style.transform='translate('+Math.round(s*i*.04)+'px,'+Math.round(l*i*.04)+'px) rotateX('+Math.round(l*-15)+'deg) rotateY('+Math.round(s*15)+'deg) scale(1.05)';t.style.boxShadow='0 0 80px rgba(233,82,149,0.45)';o||(o=!0,t.style.transition='none')});e.addEventListener('mouseleave',()=>{o=!1,t.style.transition='transform .6s ease,box-shadow .6s ease';t.style.transform='';t.style.boxShadow=''})});`],
  ],

  sitemap: {
    hostname: 'https://100pangci.github.io',
  },

  vite: {
    plugins: [RssPlugin(RSS), blogPlugin({ postsDir: 'posts' })],
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
      { text: '技术博客', link: '/posts/' },
      { text: '生活随笔', link: '/life/' },
      { text: '作品展示', link: '/gallery/' },
      { text: '关于', link: '/about' },
    ],

    sidebar: {
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
      message: '<a href="https://100pangci.github.io/Blog-ywpc/feed.xml" style="color: inherit;">RSS 订阅</a>',
      copyright: `Copyright © ${new Date().getFullYear()} <a href="https://github.com/100pangci" style="color: inherit;">Ywpc</a>`,
    },
  },
})
