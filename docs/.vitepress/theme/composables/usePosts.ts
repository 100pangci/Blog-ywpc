import { computed } from 'vue'

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

const modules = import.meta.glob('../../../posts/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

function parseFrontmatter(raw: string): Record<string, any> {
  const match = raw.match(/^---\n([\s\S]*?)\n---/)
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

const allPosts = computed<Post[]>(() => {
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
        url: `/posts/${slug}`,
        slug,
        readingTime: calcReadingTime(raw as string),
      }
    })
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
})

export function usePosts() {
  return { allPosts }
}

export function getAdjacentPosts(currentSlug: string) {
  const posts = allPosts.value
  const idx = posts.findIndex(p => p.slug === currentSlug)
  return {
    prev: idx > 0 ? posts[idx - 1] : null,
    next: idx >= 0 && idx < posts.length - 1 ? posts[idx + 1] : null,
  }
}
