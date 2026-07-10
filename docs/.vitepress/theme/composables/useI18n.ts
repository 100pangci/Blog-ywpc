import { computed } from 'vue'
import { useData } from 'vitepress'

export type Locale = 'zh' | 'en' | 'ja'

const messages: Record<Locale, Record<string, Record<string, string>>> = {
  zh: {
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
  },
  en: {
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
  },
  ja: {
    nav: {
      home: 'ホーム',
      tech: 'ブログ',
      life: '日常',
      gallery: 'ギャラリー',
      about: 'について',
    },
    blogList: {
      search: '記事を検索...',
      all: 'すべて',
      prev: '← 前へ',
      next: '次へ →',
      pageInfo: '{current} / {total} ページ · {count} 件',
      empty: '該当する記事が見つかりませんでした。検索をクリアするか、タグを変更してみてください。',
      readingTime: '約 {min} 分',
      perPage: '表示数',
      unit: '件',
    },
    postMeta: {
      breadcrumb: 'ブログ',
      readingTime: '約 {min} 分',
    },
    postNav: {
      prev: '← 前の記事',
      next: '次の記事 →',
    },
    busuanzi: {
      sitePV: '総訪問数: {count}',
      siteUV: '訪問者数: {count}',
      pagePV: '記事の閲覧数: {count}',
    },
    giscus: {
      loading: 'コメントを読み込み中...',
    },
    backToTop: 'トップへ戻る',
    dateLocale: 'ja-JP',
  },
}

export function useI18n() {
  const { lang } = useData()

  const locale = computed<Locale>(() => {
    const l = lang.value || 'zh-CN'
    if (l.startsWith('en')) return 'en'
    if (l.startsWith('ja')) return 'ja'
    return 'zh'
  })

  function t(key: string, vars?: Record<string, string | number>): string {
    const keys = key.split('.')
    let msg: any = messages[locale.value]
    for (const k of keys) {
      msg = msg?.[k]
      if (msg === undefined) return key
    }
    if (typeof msg !== 'string') return key
    if (!vars) return msg
    return Object.entries(vars).reduce((acc, [k, v]) => acc.replace(`{${k}}`, String(v)), msg)
  }

  return { locale, t }
}
