<template>
  <div class="blog-post-meta">
    <!-- breadcrumbs -->
    <p class="blog-breadcrumbs">
      <a :href="withBase('/' + locale + '/' + sectionDir + '/')">{{ breadcrumbText }}</a>
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
      <span v-if="readingTime" class="blog-read">{{ t('postMeta.readingTime', { min: readingTime }) }}</span>
      <BlogOutline class="blog-outline-inline" />
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
import { useLifePosts } from '../composables/useLifePosts'
import { useI18n } from '../composables/useI18n'
import BlogOutline from './BlogOutline.vue'

const { frontmatter, page } = useData()
const fm = computed(() => frontmatter.value)
const tags = computed(() => fm.value.tags || [])
const { allPosts } = usePosts()
const { lifePosts } = useLifePosts()
const { t, locale } = useI18n()

// ========== 文章识别 ==========
// 从当前页面相对路径提取 slug
const currentSlug = computed(() => {
  const rp = page.value.relativePath || ''
  return rp.replace(/.*\//, '').replace(/\.md$/, '')
})

// 检测文章所属目录（posts / life）
const relativePath = computed(() => page.value.relativePath || '')
const isLifeDir = computed(() => /\/life\//.test(relativePath.value))
const sectionDir = computed(() => isLifeDir.value ? 'life' : 'posts')

// 面包屑文案
const breadcrumbText = computed(() => {
  if (isLifeDir.value) return t('nav.life')
  return t('postMeta.breadcrumb')
})

// ========== 文章数据 ==========
// 查找当前文章对象，从 posts 或 life 中获取
const post = computed(() => {
  return allPosts.value.find(p => p.slug === currentSlug.value) ||
         lifePosts.value.find(p => p.slug === currentSlug.value) ||
         null
})
const readingTime = computed(() => post.value?.readingTime || null)

// 格式化日期为中文显示
const formattedDate = computed(() => {
  if (!fm.value.date) return ''
  try {
    return new Date(fm.value.date).toLocaleDateString(t('dateLocale'), {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return fm.value.date
  }
})
</script>
