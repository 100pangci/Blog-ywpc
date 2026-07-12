import { computed } from 'vue'
import { useData } from 'vitepress'

// ========== 类型定义 ==========
export interface Post {
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

export type ContentType = 'posts' | 'life'

// ========== Markdown 模块索引 ==========
const MODULES = {
  posts: {
    zh: import.meta.glob('../../../zh/posts/*.md', { query: '?raw', import: 'default', eager: true }),
    en: import.meta.glob('../../../en/posts/*.md', { query: '?raw', import: 'default', eager: true }),
    ja: import.meta.glob('../../../ja/posts/*.md', { query: '?raw', import: 'default', eager: true }),
  },
  life: {
    zh: import.meta.glob('../../../zh/life/*.md', { query: '?raw', import: 'default', eager: true }),
    en: import.meta.glob('../../../en/life/*.md', { query: '?raw', import: 'default', eager: true }),
    ja: import.meta.glob('../../../ja/life/*.md', { query: '?raw', import: 'default', eager: true }),
  },
} as const

const DIR_MAP: Record<ContentType, string> = { posts: 'posts', life: 'life' }
const PREFIX_MAP: Record<string, Record<string, string>> = {
  posts: { zh: 'zh/', en: 'en/', ja: 'ja/' },
  life: { zh: 'zh/', en: 'en/', ja: 'ja/' },
}

// ========== Frontmatter 解析 ==========
function parseYamlValue(value: string): any {
  if (!value) return value
  if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
    return value.slice(1, -1)
  }
  if (value.startsWith('[') && value.endsWith(']')) {
    return value.slice(1, -1).split(',').map(s => s.trim().replace(/['"]/g, ''))
  }
  if (value === 'true') return true
  if (value === 'false') return false
  if (/^\d+$/.test(value)) return Number(value)
  return value
}

function parseFrontmatter(raw: string): Record<string, any> {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return {}
  const fm: Record<string, any> = {}
  const lines = match[1].split('\n')
  let currentKey = ''
  let currentList: string[] | null = null

  for (const line of lines) {
    if (currentList !== null) {
      const trimmed = line.trim()
      if (trimmed.startsWith('- ')) {
        currentList.push(trimmed.slice(2).trim().replace(/['"]/g, ''))
        continue
      }
      fm[currentKey] = currentList
      currentList = null
    }

    const colonIdx = line.indexOf(':')
    if (colonIdx <= 0) continue

    currentKey = line.slice(0, colonIdx).trim()
    const value = line.slice(colonIdx + 1).trim()

    if (value === '') {
      currentList = []
      continue
    }

    fm[currentKey] = parseYamlValue(value)
  }

  if (currentList !== null) {
    fm[currentKey] = currentList
  }

  return fm
}

// ========== 阅读时间计算 ==========
function isCJK(char: string): boolean {
  const code = char.charCodeAt(0)
  return (code >= 0x4e00 && code <= 0x9fff) ||
    (code >= 0x3400 && code <= 0x4dbf) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0x3040 && code <= 0x309f) ||
    (code >= 0x30a0 && code <= 0x30ff)
}

function calcReadingTime(text: string): number {
  const bodyStart = text.indexOf('---', 3)
  const body = bodyStart >= 0 ? text.slice(bodyStart + 3) : text
  const cleaned = body.trim()

  const cjkCount = cleaned.split('').filter(isCJK).length
  if (cjkCount > cleaned.length * 0.3) {
    return Math.max(1, Math.round(cleaned.replace(/\s/g, '').length / 500))
  }

  const words = cleaned.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 220))
}

// ========== 描述提取 ==========
function extractDescription(raw: string, fm: Record<string, any>): string {
  if (fm.description) return String(fm.description)
  const bodyStart = raw.indexOf('---', 3)
  const body = bodyStart >= 0 ? raw.slice(bodyStart + 3).trim() : raw
  const firstP = body.match(/\n\n(.+?)(?:\n|$)/)?.[1] || ''
  return firstP.slice(0, 120).replace(/[#*`\[\]]/g, '').trim()
}

// ========== 文章列表构建与缓存 ==========
type CacheKey = `${ContentType}-${string}`
const postCache = new Map<CacheKey, Post[]>()

const LOCALE_KEYS: Record<string, 'zh' | 'en' | 'ja'> = {
  zh: 'zh', 'zh-cn': 'zh',
  en: 'en', 'en-us': 'en',
  ja: 'ja', 'ja-jp': 'ja',
}

function resolveLocale(lang?: string): 'zh' | 'en' | 'ja' {
  return LOCALE_KEYS[(lang || 'zh-CN').toLowerCase()] || 'zh'
}

function buildPosts(modules: Record<string, any>, prefix: string, type: ContentType): Post[] {
  const dir = DIR_MAP[type]
  return Object.entries(modules)
    .filter(([path]) => !path.endsWith('index.md'))
    .map(([path, raw]) => {
      const content = raw as string
      const fm = parseFrontmatter(content)
      const slug = path.replace(/.*\//, '').replace('.md', '')
      return {
        title: fm.title || slug,
        date: fm.date || '',
        tags: Array.isArray(fm.tags) ? fm.tags : [],
        description: extractDescription(content, fm),
        author: fm.author || '',
        cover: fm.cover || null,
        url: `/${prefix}${dir}/${slug}`,
        slug,
        readingTime: calcReadingTime(content),
      }
    })
    .sort((a, b) => {
      const dateCmp = (b.date || '').localeCompare(a.date || '')
      if (dateCmp !== 0) return dateCmp
      return (a.slug || '').localeCompare(b.slug || '')
    })
}

function resolvePosts(lang: string | undefined, type: ContentType): Post[] {
  const localeKey = resolveLocale(lang)
  const cacheKey: CacheKey = `${type}-${localeKey}`

  let posts = postCache.get(cacheKey)
  if (!posts) {
    posts = buildPosts(MODULES[type][localeKey], PREFIX_MAP[type][localeKey], type)
    postCache.set(cacheKey, posts)
  }
  return posts
}

// ========== 导出函数 ==========
export function useContent(type: ContentType = 'posts') {
  const { lang } = useData()
  const allPosts = computed<Post[]>(() => resolvePosts(lang.value, type))
  return { allPosts }
}

export function getAdjacent(type: ContentType, currentSlug: string, langOverride?: string) {
  const { lang } = useData()
  const posts = resolvePosts(langOverride ?? lang.value, type)
  const idx = posts.findIndex(p => p.slug.toLowerCase() === currentSlug.toLowerCase())
  return {
    prev: idx > 0 ? posts[idx - 1] : null,
    next: idx >= 0 && idx < posts.length - 1 ? posts[idx + 1] : null,
  }
}
