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

watch([searchQuery, activeTag], () => {
  currentPage.value = 1
})

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

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
const showPagination = computed(() => filtered.value.length > pageSize.value)

const pagePosts = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
})
</script>

<style scoped>
.blog-index {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.blog-index__controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  background-color: var(--vp-c-bg-soft);
}

.blog-index__search {
  width: 100%;
  max-width: 400px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
  background-color: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 14px;
  line-height: 20px;
  transition: border-color 0.25s;
}

.blog-index__search::placeholder { color: var(--vp-c-text-3); }

.blog-index__search:focus {
  outline: none;
  border-color: var(--vp-c-brand-1);
}

.blog-index__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.blog-index__tag {
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid transparent;
  background-color: var(--vp-c-default-soft);
  color: var(--vp-c-text-2);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.25s, border-color 0.25s, background-color 0.25s;
}

.blog-index__tag:hover {
  color: var(--vp-c-brand-1);
}

.blog-index__tag--active {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  background-color: var(--vp-c-brand-soft);
}

.blog-index__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

@media (min-width: 640px) {
  .blog-index__grid {
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }
}

.blog-card {
  display: block;
  border: 1px solid var(--vp-c-bg-soft);
  border-radius: 12px;
  background-color: var(--vp-c-bg-soft);
  overflow: hidden;
  transition: border-color 0.25s, background-color 0.25s;
}

.blog-card:hover {
  border-color: var(--vp-c-brand-1);
}

.blog-card__link {
  display: flex;
  flex-direction: column;
  height: 100%;
  color: inherit !important;
  text-decoration: none !important;
  font-weight: inherit !important;
}

.blog-card__link:hover {
  text-decoration: none !important;
}

.blog-card__cover {
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background-color: var(--vp-c-bg);
}

.blog-card__cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.blog-card__content {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 16px;
  gap: 6px;
}

.blog-card__header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--vp-c-text-3);
}

.blog-card__title {
  margin: 0 !important;
  padding: 0 !important;
  font-size: 15px;
  font-weight: 600;
  line-height: 22px;
  color: var(--vp-c-text-1) !important;
  text-decoration: none !important;
  border: none !important;
}

.blog-card__link:hover .blog-card__title {
  color: var(--vp-c-brand-1) !important;
  text-decoration: none !important;
}

.blog-card__excerpt {
  flex-grow: 1;
  margin: 0 !important;
  padding: 0 !important;
  font-size: 13px;
  font-weight: 400;
  line-height: 20px;
  color: var(--vp-c-text-2);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.blog-card__footer {
  margin-top: 8px;
  padding-top: 12px;
  border-top: 1px solid var(--vp-c-divider);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.blog-card__author {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--vp-c-text-2);
}

.blog-card__tags {
  display: flex !important;
  flex-wrap: wrap;
  gap: 4px !important;
  margin: 0 !important;
  padding: 0 !important;
  list-style: none !important;
}

.blog-card__tags li {
  display: inline-flex !important;
  padding: 2px 6px !important;
  margin: 0 !important;
  border-radius: 4px;
  background-color: var(--vp-c-default-soft);
  font-size: 11px !important;
  font-weight: 500;
  line-height: 16px !important;
  color: var(--vp-c-text-3);
  list-style: none !important;
}

.blog-card__tags li::before,
.blog-card__tags li::marker {
  display: none !important;
  content: none !important;
}

.blog-index__empty {
  padding: 40px 20px;
  border-radius: 12px;
  border: 1px dashed var(--vp-c-divider);
  text-align: center;
  font-size: 14px;
  color: var(--vp-c-text-2);
}

.blog-index__pagination {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 12px;
  background-color: var(--vp-c-bg-soft);
}

.blog-index__pagination-info {
  font-size: 13px;
  font-weight: 500;
  color: var(--vp-c-text-2);
}

.blog-index__pagination-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}

.blog-index__pagination-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  padding: 0 6px;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  background-color: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.25s, color 0.25s;
}

.blog-index__pagination-btn:hover:not(:disabled) {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.blog-index__pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.blog-index__pagination-current {
  padding: 0 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--vp-c-text-2);
}

.blog-index__page-size {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--vp-c-text-2);
}

.blog-index__page-size-select {
  padding: 4px 12px;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  background-color: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 13px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.25s;
}

.blog-index__page-size-select:hover,
.blog-index__page-size-select:focus {
  border-color: var(--vp-c-brand-1);
  outline: none;
}

@media (max-width: 640px) {
  .blog-index__pagination {
    flex-direction: column;
    align-items: stretch;
    text-align: center;
  }

  .blog-index__pagination-controls {
    justify-content: center;
  }

  .blog-index__page-size {
    justify-content: center;
  }
}
</style>
