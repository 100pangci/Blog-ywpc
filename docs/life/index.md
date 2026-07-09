<script setup lang="ts">
import { computed } from 'vue'

interface Post {
  title: string
  date: string
  tags: string[]
  description: string
  link: string
}

const modules = import.meta.glob('./*.md', { query: '?raw', import: 'default', eager: true })

const posts = computed<Post[]>(() => {
  return Object.entries(modules)
    .filter(([path]) => path !== './index.md')
    .map(([path, raw]) => {
      const content = raw as string
      const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
      const frontmatter: Record<string, any> = {}

      if (fmMatch) {
        fmMatch[1].split('\n').forEach(line => {
          const i = line.indexOf(':')
          if (i > 0) {
            const key = line.slice(0, i).trim()
            let value: any = line.slice(i + 1).trim()
            if (value.startsWith('[') && value.endsWith(']')) {
              value = value.slice(1, -1).split(',').map((s: string) => s.trim().replace(/['"]/g, ''))
            } else if (value.startsWith("'") || value.startsWith('"')) {
              value = value.slice(1, -1)
            }
            frontmatter[key] = value
          }
        })
      }

      const bodyStart = content.indexOf('---', 3)
      const body = bodyStart >= 0 ? content.slice(bodyStart + 3).trim() : content
      const firstP = body.match(/\n\n(.+?)(?:\n|$)/)?.[1] || ''
      const description = frontmatter.description || firstP.slice(0, 120).replace(/[#*`\[\]]/g, '').trim()

      const slug = path.replace('./', '').replace('.md', '')

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
</script>

<template>
  <h1>生活随笔</h1>
  <div class="post-list">
    <article v-for="post in posts" :key="post.link" class="post-card">
      <a :href="post.link">
        <h2 class="post-title">{{ post.title }}</h2>
        <div class="post-meta">
          <time v-if="post.date">{{ post.date }}</time>
          <span v-if="post.tags.length" class="post-tags">
            <span v-for="tag in post.tags" :key="tag" class="post-tag">{{ tag }}</span>
          </span>
        </div>
        <p class="post-desc">{{ post.description }}</p>
      </a>
    </article>
  </div>
  <div v-if="posts.length === 0" class="post-empty">
    <p>暂无文章</p>
  </div>
</template>

<style scoped>
.post-list {
  display: grid;
  gap: 20px;
  margin-top: 24px;
}

.post-card {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  transition: border-color 0.3s, box-shadow 0.3s, transform 0.3s;
  overflow: hidden;
}

.post-card:hover {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 4px 24px rgba(59, 130, 246, 0.1);
  transform: translateY(-2px);
}

.post-card a {
  display: block;
  padding: 24px;
  text-decoration: none;
  color: inherit;
}

.post-title {
  margin: 0 0 8px;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.post-card:hover .post-title {
  color: var(--vp-c-brand-1);
}

.post-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  flex-wrap: wrap;
}

.post-tags {
  display: flex;
  gap: 6px;
}

.post-tag {
  display: inline-block;
  padding: 1px 8px;
  font-size: 0.75rem;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  border-radius: 4px;
}

.post-desc {
  margin: 0;
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
  line-height: 1.6;
}

.post-empty {
  text-align: center;
  padding: 60px 0;
  color: var(--vp-c-text-2);
}
</style>
