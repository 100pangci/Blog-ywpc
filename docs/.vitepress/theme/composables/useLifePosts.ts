import { computed } from 'vue'

interface Post {
  title: string
  date: string
  tags: string[]
  description: string
  link: string
}

const modules = import.meta.glob('../../../life/*.md', {
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

const lifePosts = computed<Post[]>(() => {
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
        link: `/life/${slug}`,
      }
    })
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
})

export function useLifePosts() {
  return { lifePosts }
}
