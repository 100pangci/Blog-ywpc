import type { LocaleData } from './index'

const en: LocaleData = {
  key: 'en',
  label: 'English',
  lang: 'en-US',
  description: 'Personal blog - Tech notes / Life / Gallery',
  nav: [
    { text: 'Home', link: '/en/' },
    { text: 'Blog', link: '/en/posts/' },
    { text: 'Life', link: '/en/life/' },
    { text: 'Gallery', link: '/en/gallery/' },
    { text: 'About', link: '/en/about' },
  ],
  outlineLabel: 'On this page',
  editText: 'Edit this page on GitHub',
  lastUpdatedText: 'Last updated',
  docFooterPrev: 'Previous',
  docFooterNext: 'Next',
  darkModeSwitchLabel: 'Appearance',
  sidebarMenuLabel: 'Menu',
  returnToTopLabel: 'Back to top',
  notFound: {
    title: 'Page not found',
    quote: 'The page you are looking for is not here.',
    linkLabel: 'Back to home',
    linkText: 'Back to home',
  },
  search: {
    buttonText: 'Search',
    buttonAriaLabel: 'Search articles',
    noResultsText: 'No results found',
    resetButtonTitle: 'Clear query',
    selectText: 'Select',
    navigateText: 'Navigate',
    closeText: 'Close',
  },
}

export const messages = {
  nav: {
    home: 'Home',
    tech: 'Blog',
    life: 'Life',
    gallery: 'Gallery',
    about: 'About',
  },
  blogList: {
    search: 'Search articles...',
    all: 'All',
    prev: '← Prev',
    next: 'Next →',
    pageInfo: 'Page {current} / {total} · {count} posts',
    empty: 'No articles found. Try clearing the search or changing the tag.',
    readingTime: '~{min} min read',
    perPage: 'Per page',
    unit: 'posts',
  },
  postMeta: {
    breadcrumb: 'Blog',
    readingTime: '~{min} min read',
  },
  postNav: {
    prev: '← Previous',
    next: 'Next →',
  },
  busuanzi: {
    sitePV: 'Site visits: {count}',
    siteUV: 'Visitors: {count}',
    pagePV: 'Page views: {count}',
  },
  giscus: {
    loading: 'Loading comments...',
  },
  backToTop: 'Back to top',
  dateLocale: 'en-US',
}

export default en
