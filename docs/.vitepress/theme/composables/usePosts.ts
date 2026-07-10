// 文章数据组合式函数 — 扫描 posts/ 目录下的 Markdown 文件并解析 frontmatter
import { computed } from 'vue'

/** 文章数据结构 */
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

// 通过 Vite 的 import.meta.glob 批量加载 posts/ 下所有 Markdown 原始内容
const modules = import.meta.glob('../../../posts/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

/** 简易 frontmatter 解析（YAML 键值对，支持数组和引号） */
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
        // 处理数组格式: [tag1, tag2]
        value = value.slice(1, -1).split(',').map((s: string) => s.trim().replace(/['"]/g, ''))
      } else if (value.startsWith("'") || value.startsWith('"')) {
        // 处理引号包裹的值
        value = value.slice(1, -1)
      }
      fm[key] = value
    }
  })
  return fm
}

/** 估算阅读时间（按英文 220 词/分钟，中文按词数估算） */
function calcReadingTime(text: string): number {
  const bodyStart = text.indexOf('---', 3)
  const body = bodyStart >= 0 ? text.slice(bodyStart + 3) : text
  const words = body.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 220))
}

/** 提取文章描述：优先使用 frontmatter 中的 description，否则取正文第一段 */
function extractDescription(raw: string, fm: Record<string, any>): string {
  if (fm.description) return String(fm.description)
  const bodyStart = raw.indexOf('---', 3)
  const body = bodyStart >= 0 ? raw.slice(bodyStart + 3).trim() : raw
  const firstP = body.match(/\n\n(.+?)(?:\n|$)/)?.[1] || ''
  return firstP.slice(0, 120).replace(/[#*`\[\]]/g, '').trim()
}

/** 所有已发布文章（已排序，排除 index.md） */
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
    // 按日期降序排列
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
})

/** 获取所有文章列表 */
export function usePosts() {
  return { allPosts }
}

/** 获取相邻文章（上下篇导航） */
export function getAdjacentPosts(currentSlug: string) {
  const posts = allPosts.value
  const idx = posts.findIndex(p => p.slug === currentSlug)
  return {
    prev: idx > 0 ? posts[idx - 1] : null,
    next: idx >= 0 && idx < posts.length - 1 ? posts[idx + 1] : null,
  }
}
