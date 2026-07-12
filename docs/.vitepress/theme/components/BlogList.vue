<template>
  <div class="blog-index">
    <div class="blog-index__controls">
      <input
        v-model="searchQuery"
        type="search"
        class="blog-index__search"
        :placeholder="t('blogList.search')"
        :aria-label="t('blogList.search')"
      />
      <div v-if="allTags.length" class="blog-index__filters">
        <button
          :class="['blog-index__tag', { 'blog-index__tag--active': activeTag === 'all' }]"
          @click="activeTag = 'all'"
        >
          {{ t('blogList.all') }}
        </button>
        <button
          v-for="tag in allTags"
          :key="tag"
          :class="['blog-index__tag', { 'blog-index__tag--active': activeTag === tag }]"
          @click="activeTag = tag"
        >
          #{{ tag }}
        </button>
      </div>
    </div>

    <div v-if="pagePosts.length" class="blog-index__grid">
      <article v-for="post in pagePosts" :key="post.url" class="blog-card">
        <a :href="withBase(post.url)" class="blog-card__link">
          <div v-if="post.cover" class="blog-card__cover">
            <img :src="post.cover" :alt="post.title" loading="lazy" />
          </div>
          <div class="blog-card__content">
            <div class="blog-card__header">
              <time v-if="post.date">{{ post.date }}</time>
              <span v-if="post.readingTime">{{ t('blogList.readingTime', { min: post.readingTime }) }}</span>
            </div>
            <h2 class="blog-card__title">{{ post.title }}</h2>
            <p v-if="post.description" class="blog-card__excerpt">{{ post.description }}</p>
            <div class="blog-card__footer">
              <div v-if="post.author" class="blog-card__author">
                <span>{{ post.author }}</span>
              </div>
              <ul v-if="post.tags.length" class="blog-card__tags">
                <li v-for="tag in post.tags" :key="tag">#{{ tag }}</li>
              </ul>
            </div>
          </div>
        </a>
      </article>
    </div>

    <div v-else class="blog-index__empty">
      <p>{{ t('blogList.empty') }}</p>
    </div>

    <div v-if="showPagination" class="blog-index__pagination">
      <div class="blog-index__pagination-info">
        {{ t('blogList.pageInfo', { current: currentPage, total: totalPages, count: filtered.length }) }}
      </div>
      <div class="blog-index__pagination-controls">
        <button
          class="blog-index__pagination-btn"
          :disabled="currentPage <= 1"
          @click="currentPage--"
        >
           {{ t('blogList.prev') }}
        </button>
        <span class="blog-index__pagination-current">{{ currentPage }}</span>
        <button
          class="blog-index__pagination-btn"
          :disabled="currentPage >= totalPages"
          @click="currentPage++"
        >
           {{ t('blogList.next') }}
        </button>
        <span class="blog-index__page-size">
           {{ t('blogList.perPage') }}
           <select v-model.number="pageSize" class="blog-index__page-size-select">
             <option v-for="s in pageSizes" :key="s" :value="s">{{ s }}</option>
           </select>
           {{ t('blogList.unit') }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { withBase } from 'vitepress'
import { useContent } from '../composables/useContent'
import { useI18n } from '../composables/useI18n'

const props = withDefaults(defineProps<{
  type?: 'tech' | 'life'
}>(), {
  type: 'tech'
})

const { allPosts: sourcePosts } = useContent(props.type === 'life' ? 'life' : 'posts')
const { t } = useI18n()

const searchQuery = ref('')
const activeTag = ref('all')
const currentPage = ref(1)
const pageSize = ref(10)
const pageSizes = [5, 10, 20]

// ========== 搜索与筛选 ==========
watch([searchQuery, activeTag], () => {
  currentPage.value = 1
})

// ========== 计算属性 ==========
const allTags = computed(() => {
  const set = new Set<string>()
  sourcePosts.value.forEach(p => p.tags.forEach(t => set.add(t)))
  return Array.from(set).sort()
})

const filtered = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  const tag = activeTag.value
  return sourcePosts.value.filter(p => {
    const matchSearch = !q ||
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
    const matchTag = tag === 'all' || p.tags.includes(tag)
    return matchSearch && matchTag
  })
})

// ========== 分页逻辑 ==========
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
const showPagination = computed(() => filtered.value.length > pageSize.value)

const pagePosts = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
})
</script>

