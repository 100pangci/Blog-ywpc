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

<style scoped>
.blog-post-nav {
  margin-top: 48px;
}
.blog-nav {
  display: grid;
  grid-row-gap: 8px;
  padding-top: 20px;
  border-top: 1px solid var(--vp-c-divider);
}
@media (min-width: 640px) {
  .blog-nav {
    grid-template-columns: repeat(2, 1fr);
    grid-column-gap: 12px;
  }
}
.blog-nav-link {
  display: block;
  padding: 10px 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  text-decoration: none;
  transition: border-color 0.25s;
}
.blog-nav-link:hover {
  border-color: var(--vp-c-brand-1);
}
.blog-nav-link.next {
  text-align: right;
}
.blog-nav-label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  line-height: 18px;
  color: var(--vp-c-text-2);
}
.blog-nav-title {
  display: block;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  color: var(--vp-c-brand-1);
}
.blog-nav-spacer {
  display: none;
}
@media (min-width: 640px) {
  .blog-nav-spacer {
    display: block;
  }
}
</style>