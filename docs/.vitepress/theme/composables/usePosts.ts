import { computed } from 'vue'
import { useData } from 'vitepress'

interface Post {
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

const zhModules = import.meta.glob('../../../zh/posts/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})
const enModules = import.meta.glob('../../../en/posts/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})
const jaModules = import.meta.glob('../../../ja/posts/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

function parseFrontmatter(raw: string): Record<string, any> {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return {}
  const fm: Record<string, any> = {}
  match[1].split('\n').forEach(line => {
    const i = line.indexOf(':')
    if (i > 0) {
      const key = line.slice(0, i).trim()
      let value: any = line.slice(i + 1).trim()
      if (value.startsWith('[') && value.endsWith(']')) {
        value = value.slice(1, -1).split(',').map((s: string) => s.trim().replace(/['"]/g, ''))
      } else if (value.startsWith("'") || value.startsWith('"')) {
        value = value.slice(1, -1)
      }
      fm[key] = value
    }
  })
  return fm
}

function calcReadingTime(text: string): number {
  const bodyStart = text.indexOf('---', 3)
  const body = bodyStart >= 0 ? text.slice(bodyStart + 3) : text
  const words = body.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 220))
}

function extractDescription(raw: string, fm: Record<string, any>): string {
  if (fm.description) return String(fm.description)
  const bodyStart = raw.indexOf('---', 3)
  const body = bodyStart >= 0 ? raw.slice(bodyStart + 3).trim() : raw
  const firstP = body.match(/\n\n(.+?)(?:\n|$)/)?.[1] || ''
  return firstP.slice(0, 120).replace(/[#*`\[\]]/g, '').trim()
}

function buildPosts(modules: Record<string, any>, prefix: string): Post[] {
  return Object.entries(modules)
    .filter(([path]) => !path.endsWith('index.md'))
    .map(([path, raw]) => {
      const fm = parseFrontmatter(raw as string)
      const slug = path.replace(/.*\//, '').replace('.md', '')
      return {
        title: fm.title || slug,
        date: fm.date || '',
        tags: Array.isArray(fm.tags) ? fm.tags : [],
        description: extractDescription(raw as string, fm),
        author: fm.author || '',
        cover: fm.cover || null,
        url: `/${prefix}posts/${slug}`,
        slug,
        readingTime: calcReadingTime(raw as string),
      }
    })
    .sort((a, b) => {
      const dateCmp = (b.date || '').localeCompare(a.date || '')
      if (dateCmp !== 0) return dateCmp
      return (a.slug || '').localeCompare(b.slug || '')
    })
}

const zhPosts = computed(() => buildPosts(zhModules, 'zh/'))
const enPosts = computed(() => buildPosts(enModules, 'en/'))
const jaPosts = computed(() => buildPosts(jaModules, 'ja/'))

function resolvePosts(lang?: string) {
  const l = (lang || 'zh-CN').toLowerCase()
  if (l.startsWith('en')) return enPosts.value
  if (l.startsWith('ja')) return jaPosts.value
  return zhPosts.value
}

export function usePosts() {
  const { lang } = useData()

  const allPosts = computed<Post[]>(() => resolvePosts(lang.value))

  return { allPosts }
}

export function getAdjacentPosts(currentSlug: string, langOverride?: string) {
  const { lang } = useData()
  const posts = resolvePosts(langOverride ?? lang.value)
  const idx = posts.findIndex(p => p.slug.toLowerCase() === currentSlug.toLowerCase())
  return {
    prev: idx > 0 ? posts[idx - 1] : null,
    next: idx >= 0 && idx < posts.length - 1 ? posts[idx + 1] : null,
  }
}
