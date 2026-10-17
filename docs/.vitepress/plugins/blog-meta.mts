// Vite 插件 — 构建期解析文章元数据
//
// 文章列表（标题/日期/标签/简介/阅读时间）在构建期一次性解析完成，
// 通过虚拟模块 `virtual:blog-meta` 提供给客户端。这样客户端既不打包
// 全部 Markdown 原文，也不需要在浏览器里跑 YAML 解析器。
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { load as loadYaml, JSON_SCHEMA } from 'js-yaml'
import type { Plugin } from 'vite'

// ========== 类型 ==========
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

// ========== 常量 ==========
const VIRTUAL_ID = 'virtual:blog-meta'
const RESOLVED_ID = '\0' + VIRTUAL_ID

// 本文件位于 docs/.vitepress/plugins/，向上两级即 docs/
const DOCS_DIR = fileURLToPath(new URL('../../', import.meta.url))

const LOCALES: Locale[] = ['zh', 'en', 'ja']
const CONTENT_TYPES: ContentType[] = ['posts', 'life']

// ========== Frontmatter 解析 ==========
function parseFrontmatter(raw: string): Record<string, any> {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return {}
  const parsed = loadYaml(match[1], { schema: JSON_SCHEMA })
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? (parsed as Record<string, any>)
    : {}
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

function contentBody(raw: string): string {
  const bodyStart = raw.indexOf('---', 3)
  return (bodyStart >= 0 ? raw.slice(bodyStart + 3) : raw).trim()
}

function calcReadingTime(raw: string): number {
  const body = contentBody(raw)
  const cjkCount = body.split('').filter(isCJK).length
  if (cjkCount > body.length * 0.3) {
    return Math.max(1, Math.round(body.replace(/\s/g, '').length / 500))
  }
  const words = body.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 220))
}

// ========== 描述提取 ==========
// 没写 description 时取正文第一段（跳过标题/引用/列表/代码块/图片等）
function extractDescription(raw: string, fm: Record<string, any>): string {
  if (fm.description) return String(fm.description)
  const body = contentBody(raw)
  for (const block of body.split(/\r?\n\s*\r?\n/)) {
    const text = block.trim()
    if (!text) continue
    if (/^(#{1,6}\s|>|[-*+]\s|\d+\.\s|```|\||<)/.test(text)) continue
    return text
      .replace(/\s+/g, ' ')
      .replace(/[#*`\[\]]/g, '')
      .trim()
      .slice(0, 120)
  }
  return ''
}

// ========== 扫描与排序 ==========
function buildPosts(locale: Locale, type: ContentType): PostMeta[] {
  const dir = path.join(DOCS_DIR, locale, type)
  if (!fs.existsSync(dir)) return []

  return fs.readdirSync(dir)
    .filter(file => file.endsWith('.md') && file !== 'index.md')
    .map((file) => {
      const raw = fs.readFileSync(path.join(dir, file), 'utf-8')
      const fm = parseFrontmatter(raw)
      if (fm.published === false) return null

      const slug = file.replace(/\.md$/, '')
      return {
        title: fm.title || slug,
        date: fm.date ? String(fm.date) : '',
        tags: Array.isArray(fm.tags) ? fm.tags.map(String) : [],
        description: extractDescription(raw, fm),
        author: fm.author || '',
        cover: fm.cover || null,
        url: `/${locale}/${type}/${slug}`,
        slug,
        readingTime: calcReadingTime(raw),
      } satisfies PostMeta
    })
    .filter((post): post is PostMeta => post !== null)
    .sort((a, b) => {
      const dateCmp = (b.date || '').localeCompare(a.date || '')
      if (dateCmp !== 0) return dateCmp
      return (a.slug || '').localeCompare(b.slug || '')
    })
}

export function scanBlogMeta(): BlogMeta {
  const meta = {} as BlogMeta
  for (const type of CONTENT_TYPES) {
    meta[type] = {} as Record<Locale, PostMeta[]>
    for (const locale of LOCALES) {
      meta[type][locale] = buildPosts(locale, type)
    }
  }
  return meta
}

// ========== 插件 ==========
export function blogMetaPlugin(): Plugin {
  const docsDirPosix = DOCS_DIR.replace(/\\/g, '/')

  return {
    name: 'blog-meta',

    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID
    },

    load(id) {
      if (id !== RESOLVED_ID) return
      return `export const BLOG_META = ${JSON.stringify(scanBlogMeta())};\n`
    },

    // 开发态：文章增删改后失效虚拟模块，下次整页刷新时重新解析
    handleHotUpdate({ file, server }) {
      const normalized = file.replace(/\\/g, '/')
      if (!normalized.endsWith('.md') || !normalized.startsWith(docsDirPosix)) return
      invalidate(server)
      return []
    },

    configureServer(server) {
      // 新增/删除文章不会走 handleHotUpdate，需要单独监听
      const onFsEvent = (file: string) => {
        const normalized = file.replace(/\\/g, '/')
        if (!normalized.endsWith('.md') || !normalized.startsWith(docsDirPosix)) return
        invalidate(server)
      }
      server.watcher.on('add', onFsEvent)
      server.watcher.on('unlink', onFsEvent)
    },
  }
}

function invalidate(server: { moduleGraph: { getModuleById: (id: string) => any; invalidateModule: (mod: any) => void } }) {
  const mod = server.moduleGraph.getModuleById(RESOLVED_ID)
  if (mod) server.moduleGraph.invalidateModule(mod)
}
