// 文章列表数据 — 由构建期插件统一解析（见 plugins/blog-meta.mts）
// 客户端只拿到轻量元数据，不再打包 Markdown 原文，也不在浏览器里解析 YAML
import { computed } from 'vue'
import { useData, withBase } from 'vitepress'
import { BLOG_META } from 'virtual:blog-meta'
import type { ContentType, Locale, PostMeta } from 'virtual:blog-meta'

// ========== 类型 ==========
export type Post = PostMeta
export type { ContentType }

// ========== 语言归一化 ==========
const LOCALE_KEYS: Record<string, Locale> = {
  zh: 'zh', 'zh-cn': 'zh',
  en: 'en', 'en-us': 'en',
  ja: 'ja', 'ja-jp': 'ja',
}

function resolveLocale(lang?: string): Locale {
  return LOCALE_KEYS[(lang || 'zh-CN').toLowerCase()] || 'zh'
}

// ========== 导出函数 ==========
export function useContent(type: ContentType = 'posts') {
  const { lang } = useData()
  const allPosts = computed<Post[]>(() => BLOG_META[type][resolveLocale(lang.value)] ?? [])
  return { allPosts }
}

// 站内资源路径补 base（绝对 URL / data-URI 原样返回）
export function resolveAsset(src: string): string {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(src) ? src : withBase(src)
}

// 上下篇导航 — 列表按日期倒序，故「上一篇」是更早的文章，「下一篇」是更新的文章
export function getAdjacent(type: ContentType, currentSlug: string, langOverride?: string) {
  const { lang } = useData()
  const posts = BLOG_META[type][resolveLocale(langOverride ?? lang.value)] ?? []
  const idx = posts.findIndex(p => p.slug.toLowerCase() === currentSlug.toLowerCase())
  return {
    prev: idx >= 0 && idx < posts.length - 1 ? posts[idx + 1] : null,
    next: idx > 0 ? posts[idx - 1] : null,
  }
}
