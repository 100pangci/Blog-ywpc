<template>
  <div class="blog-list">
    <div class="blog-list__controls">
      <input
        v-model="searchQuery"
        type="search"
        class="blog-list__search"
        placeholder="搜索文章标题或描述..."
        aria-label="搜索文章"
      />
      <div class="blog-list__filters">
        <button
          :class="['blog-list__tag', { 'blog-list__tag--active': activeTag === 'all' }]"
          @click="activeTag = 'all'"
        >
          全部
        </button>
        <button
          v-for="tag in allTags"
          :key="tag"
          :class="['blog-list__tag', { 'blog-list__tag--active': activeTag === tag }]"
          @click="activeTag = tag"
        >
          {{ tag }}
        </button>
      </div>
    </div>

    <div v-if="filtered.length" class="blog-list__grid">
      <article v-for="post in filtered" :key="post.url" class="blog-list__card">
          <a :href="withBase(post.url)" class="blog-list__link">
          <div class="blog-list__card-body">
            <h2 class="blog-list__title">{{ post.title }}</h2>
            <div class="blog-list__meta">
              <time v-if="post.date">{{ post.date }}</time>
              <span v-if="post.readingTime"> · {{ post.readingTime }} min read</span>
            </div>
            <p v-if="post.description" class="blog-list__desc">{{ post.description }}</p>
            <div v-if="post.tags.length" class="blog-list__tags">
              <span v-for="tag in post.tags" :key="tag" class="blog-list__tag-item">{{ tag }}</span>
            </div>
          </div>
        </a>
      </article>
    </div>

    <div v-else class="blog-list__empty">
      <p>没有找到匹配的文章</p>
    </div>
  </div>
</template>

<script setup lang="ts">
// 技术博客列表组件 — 支持搜索和标签筛选
import { ref, computed } from 'vue'
import { withBase } from 'vitepress'
import { usePosts } from '../composables/usePosts'

const { allPosts } = usePosts()
const searchQuery = ref('')        // 搜索关键词
const activeTag = ref('all')       // 当前选中的标签

// 所有标签（去重、排序）
const allTags = computed(() => {
  const set = new Set<string>()
  allPosts.value.forEach(p => p.tags.forEach(t => set.add(t)))
  return Array.from(set).sort()
})

// 过滤后的文章列表（同时匹配搜索和标签）
const filtered = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  const tag = activeTag.value
  return allPosts.value.filter(p => {
    const matchSearch = !q ||
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
    const matchTag = tag === 'all' || p.tags.includes(tag)
    return matchSearch && matchTag
  })
})
</script>

<style scoped>
.blog-list__controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  background-color: var(--vp-c-bg-soft);
  margin-bottom: 24px;
}

.blog-list__search {
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

.blog-list__search::placeholder { color: var(--vp-c-text-3); }

.blog-list__search:focus {
  outline: none;
  border-color: var(--vp-c-brand-1);
}

.blog-list__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.blog-list__tag {
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid transparent;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.25s, background 0.25s;
}

.blog-list__tag:hover { border-color: var(--vp-c-brand-1); }

.blog-list__tag--active {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-1);
  color: #fff;
}

.dark .blog-list__tag--active {
  color: var(--vp-c-bg);
}

.blog-list__grid {
  display: grid;
  gap: 18px;
}

.blog-list__card {
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  overflow: hidden;
  background: linear-gradient(180deg, var(--vp-c-bg-elv) 0%, var(--vp-c-bg-soft) 100%);
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
  transition: transform 0.35s ease, box-shadow 0.35s ease, border-color 0.35s ease;
}

.blog-list__card:hover {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 12px 32px rgba(233,82,149,0.12);
  transform: translateY(-4px);
}

.blog-list__link {
  display: block;
  padding: 26px 28px;
  text-decoration: none;
  color: inherit;
}

.blog-list__title {
  margin: 0 0 8px;
  font-size: 1.2rem;
  font-weight: 650;
  letter-spacing: -0.01em;
  color: var(--vp-c-text-1);
  transition: color 0.3s ease;
}

.blog-list__card:hover .blog-list__title {
  color: var(--vp-c-brand-1);
}

.blog-list__meta {
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  margin-bottom: 12px;
}

.blog-list__desc {
  margin: 0 0 12px;
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
  line-height: 1.6;
}

.blog-list__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.blog-list__tag-item {
  display: inline-block;
  padding: 2px 10px;
  font-size: 0.75rem;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  border-radius: 999px;
  letter-spacing: 0.02em;
}

.blog-list__empty {
  text-align: center;
  padding: 80px 0;
  color: var(--vp-c-text-2);
}

@media (max-width: 768px) {
  .blog-list__card a { padding: 20px; }
  .blog-list__title { font-size: 1.1rem; }
  .blog-list__controls { padding: 12px; }
}
</style>