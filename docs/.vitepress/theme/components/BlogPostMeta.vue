<template>
  <div class="blog-post-meta">
    <!-- breadcrumbs -->
    <p class="blog-breadcrumbs">
      <a :href="withBase('/posts/')">技术博客</a>
      <span aria-hidden="true"> / </span>
      <span>{{ fm.title }}</span>
    </p>

    <!-- title -->
    <h1 class="blog-title">{{ fm.title }}</h1>

    <!-- description -->
    <p v-if="fm.description" class="blog-desc">{{ fm.description }}</p>

    <!-- details -->
    <div class="blog-details">
      <div v-if="fm.author" class="blog-author">
        <span>{{ fm.author }}</span>
      </div>
      <time v-if="fm.date" :datetime="fm.date" class="blog-time">{{ formattedDate }}</time>
      <span v-if="readingTime" class="blog-read"> · {{ readingTime }} min read</span>
    </div>

    <!-- tags -->
    <ul v-if="tags && tags.length" class="blog-tags">
      <li v-for="tag in tags" :key="tag">{{ tag }}</li>
    </ul>

    <!-- cover -->
    <figure v-if="fm.cover" class="blog-cover">
      <img :src="fm.cover" :alt="fm.title" loading="lazy" />
    </figure>
  </div>
</template>

<script setup lang="ts">
// 文章元信息组件 — 面包屑、标题、描述、作者、日期、标签、封面
import { computed } from 'vue'
import { useData, withBase } from 'vitepress'
import { usePosts } from '../composables/usePosts'

const { frontmatter, page } = useData()
const fm = computed(() => frontmatter.value)
const tags = computed(() => fm.value.tags || [])
const { allPosts } = usePosts()

// 从当前页面相对路径提取 slug
const currentSlug = computed(() => {
  const rp = page.value.relativePath || ''
  return rp.replace(/.*\//, '').replace(/\.md$/, '')
})

// 查找当前文章对象以获取阅读时间等额外信息
const post = computed(() => allPosts.value.find(p => p.slug === currentSlug.value) || null)
const readingTime = computed(() => post.value?.readingTime || null)

// 格式化日期为中文显示
const formattedDate = computed(() => {
  if (!fm.value.date) return ''
  try {
    return new Date(fm.value.date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return fm.value.date
  }
})
</script>

<style scoped>
.blog-post-meta {
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--vp-c-divider);
}
.blog-breadcrumbs {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-text-3);
}
.blog-breadcrumbs a {
  color: var(--vp-c-text-2);
  text-decoration: none;
  transition: color 0.25s;
}
.blog-breadcrumbs a:hover {
  color: var(--vp-c-brand-1);
}
.blog-title {
  margin: 0;
  font-size: 28px;
  font-weight: 600;
  line-height: 36px;
  letter-spacing: -0.02em;
}
@media (min-width: 768px) {
  .blog-title {
    font-size: 36px;
    line-height: 44px;
  }
}
.blog-desc {
  margin: 12px 0 0;
  font-size: 15px;
  line-height: 24px;
  color: var(--vp-c-text-2);
}
.blog-details {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  font-size: 13px;
  font-weight: 500;
  color: var(--vp-c-text-3);
}
.blog-author {
  display: flex;
  align-items: center;
  gap: 6px;
}
.blog-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
}
.blog-tags li {
  display: inline-flex;
  padding: 3px 10px;
  margin: 0;
  border-radius: 999px;
  background: var(--vp-c-brand-soft);
  font-size: 12px;
  font-weight: 600;
  line-height: 16px;
  color: var(--vp-c-brand-1);
}
.blog-tags li::before,
.blog-tags li::marker {
  display: none;
  content: none;
}
.blog-cover {
  margin: 20px 0 0;
  border-radius: 8px;
  overflow: hidden;
}
.blog-cover img {
  display: block;
  width: 100%;
  height: auto;
}
</style>