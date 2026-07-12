<template>
  <footer v-if="prev || next" class="blog-post-nav">
    <nav class="blog-nav">
      <a v-if="prev" :href="withBase(prev.url)" class="blog-nav-link prev">
        <span class="blog-nav-label">{{ t('postNav.prev') }}</span>
        <span class="blog-nav-title">{{ prev.title }}</span>
      </a>
      <span v-if="!prev || !next" class="blog-nav-spacer" />
      <a v-if="next" :href="withBase(next.url)" class="blog-nav-link next">
        <span class="blog-nav-label">{{ t('postNav.next') }}</span>
        <span class="blog-nav-title">{{ next.title }}</span>
      </a>
    </nav>
  </footer>
</template>

<script setup lang="ts">
// 上下篇导航组件 — 基于文章日期顺序提供「上一篇 / 下一篇」链接
import { computed } from 'vue'
import { useData, withBase } from 'vitepress'
import { getAdjacentPosts } from '../composables/usePosts'
import { getAdjacentLifePosts } from '../composables/useLifePosts'
import { useI18n } from '../composables/useI18n'

const { page } = useData()
const { t } = useI18n()

// ========== 获取上下篇 ==========
// 从当前页面相对路径提取 slug
const slug = computed(() => {
  const rp = page.value.relativePath || ''
  return rp.replace(/.*\//, '').replace(/\.md$/, '')
})

const isLifeDir = computed(() => /\/life\//.test(page.value.relativePath || ''))

const adj = computed(() => {
  if (isLifeDir.value) return getAdjacentLifePosts(slug.value)
  return getAdjacentPosts(slug.value)
})
const prev = computed(() => adj.value.prev)
const next = computed(() => adj.value.next)
</script>
