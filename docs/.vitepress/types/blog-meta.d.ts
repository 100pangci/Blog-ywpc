// 虚拟模块类型声明 — 供编辑器/类型检查识别 `virtual:blog-meta`
// 运行时数据由 docs/.vitepress/plugins/blog-meta.mts 在构建期生成
declare module 'virtual:blog-meta' {
  export type Locale = 'zh' | 'en' | 'ja'
  export type ContentType = 'posts' | 'life'

  export interface PostMeta {
    title: string
    date: string
    tags: string[]
    description: string
    author: string
    cover: string | null
    url: string
    slug: string
    readingTime: number
  }

  export type BlogMeta = Record<ContentType, Record<Locale, PostMeta[]>>

  export const BLOG_META: BlogMeta
}
