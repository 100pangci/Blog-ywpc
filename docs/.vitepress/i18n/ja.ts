import type { LocaleData } from './index'

const ja: LocaleData = {
  key: 'ja',
  label: '日本語',
  lang: 'ja-JP',
  description: '個人ブログ - 技術ノート / 日常 / ギャラリー',
  nav: [
    { text: 'ホーム', link: '/ja/' },
    { text: 'ブログ', link: '/ja/posts/' },
    { text: '日常', link: '/ja/life/' },
    { text: 'ギャラリー', link: '/ja/gallery/' },
    { text: 'について', link: '/ja/about' },
  ],
  outlineLabel: '目次',
  editText: 'GitHub で編集',
  lastUpdatedText: '最終更新',
  docFooterPrev: '前へ',
  docFooterNext: '次へ',
  darkModeSwitchLabel: 'テーマ',
  sidebarMenuLabel: 'メニュー',
  returnToTopLabel: 'トップへ戻る',
  notFound: {
    title: 'ページが見つかりません',
    quote: 'お探しのページは見つかりませんでした。',
    linkLabel: 'ホームに戻る',
    linkText: 'ホームに戻る',
  },
  search: {
    buttonText: '検索',
    buttonAriaLabel: '記事を検索',
    noResultsText: '関連する結果は見つかりませんでした',
    resetButtonTitle: 'クエリをクリア',
    selectText: '選択',
    navigateText: '移動',
    closeText: '閉じる',
  },
}

export const messages = {
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
    outline: '目次',
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
}

export default ja
