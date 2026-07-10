import { computed } from 'vue'
import { useData } from 'vitepress'

interface Post {
  title: string
  date: string
  tags: string[]
  description: string
  url: string
  slug: string
}

const zhModules = import.meta.glob('../../../zh/life/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})
const enModules = import.meta.glob('../../../en/life/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})
const jaModules = import.meta.glob('../../../ja/life/*.md', {
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

function buildPosts(modules: Record<string, any>, prefix: string): Post[] {
  return Object.entries(modules)
    .filter(([path]) => !path.endsWith('index.md'))
    .map(([path, raw]) => {
      const content = raw as string
      const frontmatter = parseFrontmatter(content)
      const bodyStart = content.indexOf('---', 3)
      const body = bodyStart >= 0 ? content.slice(bodyStart + 3).trim() : content
      const firstP = body.match(/\n\n(.+?)(?:\n|$)/)?.[1] || ''
      const description = frontmatter.description || firstP.slice(0, 120).replace(/[#*`\[\]]/g, '').trim()
      const slug = path.replace(/.*\//, '').replace('.md', '')
      return {
        title: frontmatter.title || slug,
        date: frontmatter.date || '',
        tags: frontmatter.tags || [],
        description,
        url: `/${prefix}life/${slug}`,
        slug,
      }
    })
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
}

const zhPosts = computed(() => buildPosts(zhModules, 'zh/'))
const enPosts = computed(() => buildPosts(enModules, 'en/'))
const jaPosts = computed(() => buildPosts(jaModules, 'ja/'))

export function useLifePosts() {
  const { lang } = useData()

  const lifePosts = computed<Post[]>(() => {
    const l = lang.value || 'zh-CN'
    if (l.startsWith('en')) return enPosts.value
    if (l.startsWith('ja')) return jaPosts.value
    return zhPosts.value
  })

  return { lifePosts }
}
