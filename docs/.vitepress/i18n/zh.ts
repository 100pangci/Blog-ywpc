import type { LocaleData } from './index'

const zh: LocaleData = {
  key: 'zh',
  label: '中文',
  lang: 'zh-CN',
  description: '个人博客 - 技术笔记 / 生活随笔 / 作品展示',
  nav: [
    { text: '首页', link: '/zh/' },
    { text: '技术博客', link: '/zh/posts/' },
    { text: '生活随笔', link: '/zh/life/' },
    { text: '作品展示', link: '/zh/gallery/' },
    { text: '关于', link: '/zh/about' },
  ],
  outlineLabel: '本页目录',
  editText: '在 GitHub 上编辑此页',
  lastUpdatedText: '最后更新于',
  docFooterPrev: '上一页',
  docFooterNext: '下一页',
  darkModeSwitchLabel: '外观',
  sidebarMenuLabel: '菜单',
  returnToTopLabel: '回到顶部',
  notFound: {
    title: '页面未找到',
    quote: '也许你要找的页面不在这里。',
    linkLabel: '返回首页',
    linkText: '返回首页',
  },
  search: {
    buttonText: '搜索',
    buttonAriaLabel: '搜索文档',
    noResultsText: '没有找到相关结果',
    resetButtonTitle: '清除查询',
    selectText: '选择',
    navigateText: '切换',
    closeText: '关闭',
  },
}

export const messages = {
  nav: {
    home: '首页',
    tech: '技术博客',
    life: '生活随笔',
    gallery: '作品展示',
    about: '关于',
  },
  blogList: {
    search: '搜索文章标题或描述...',
    all: '全部',
    prev: '上一页',
    next: '下一页',
    pageInfo: '第 {current} / {total} 页 · {count} 篇',
    empty: '没有找到匹配的文章，试试清空搜索或换个标签',
    readingTime: '阅读时间：约 {min} 分钟',
    perPage: '每页',
    unit: '篇',
  },
  postMeta: {
    breadcrumb: '技术博客',
    readingTime: '阅读时间：约 {min} 分钟',
    outline: '本页目录',
  },
  postNav: {
    prev: '← 上一篇',
    next: '下一篇 →',
  },
  busuanzi: {
    sitePV: '本站总访问量 {count} 次',
    siteUV: '访客数 {count} 人',
    pagePV: '本文阅读量 {count} 次',
  },
  giscus: {
    loading: '评论加载中...',
  },
  backToTop: '回到顶部',
  dateLocale: 'zh-CN',
}

export default zh
