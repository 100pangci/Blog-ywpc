---
comment: false
---

<script setup lang="ts">
import { useLifePosts } from '../.vitepress/theme/composables/useLifePosts'

const { lifePosts: posts } = useLifePosts()
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
  gap: 18px;
  margin-top: 28px;
}

.post-card {
  position: relative;
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  overflow: hidden;
  background: linear-gradient(180deg, var(--vp-c-bg-elv) 0%, var(--vp-c-bg-soft) 100%);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1),
              box-shadow 0.4s ease,
              border-color 0.4s ease;
}

.post-card::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(180deg, var(--vp-c-brand-1), var(--vp-c-brand-3));
  opacity: 0;
  transition: opacity 0.35s ease;
}

.post-card:hover {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 14px 36px rgba(233, 82, 149, 0.14);
  transform: translateY(-4px);
}

.post-card:hover::before {
  opacity: 1;
}

.post-card a {
  display: block;
  padding: 26px 28px;
  text-decoration: none;
  color: inherit;
}

.post-title {
  margin: 0 0 10px;
  font-size: 1.3rem;
  font-weight: 650;
  letter-spacing: -0.01em;
  color: var(--vp-c-text-1);
  transition: color 0.3s ease;
}

.post-card:hover .post-title {
  color: var(--vp-c-brand-1);
}

.post-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
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
  padding: 2px 10px;
  font-size: 0.75rem;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  border-radius: 999px;
  letter-spacing: 0.02em;
}

.post-desc {
  margin: 0;
  font-size: 0.92rem;
  color: var(--vp-c-text-2);
  line-height: 1.75;
}

.post-empty {
  text-align: center;
  padding: 80px 0;
  color: var(--vp-c-text-2);
}

@media (max-width: 768px) {
  .post-list {
    gap: 14px;
    margin-top: 20px;
  }

  .post-card a {
    padding: 20px;
  }

  .post-title {
    font-size: 1.15rem;
  }

  .post-desc {
    font-size: 0.88rem;
  }
}
</style>
