---
title: 作品展示
layout: page
comment: false
---

<script setup>
const items = [
  { src: 'https://picsum.photos/seed/1/600/400', title: '示例作品 1', desc: '描述文字' },
  { src: 'https://picsum.photos/seed/2/600/400', title: '示例作品 2', desc: '描述文字' },
  { src: 'https://picsum.photos/seed/3/600/400', title: '示例作品 3', desc: '描述文字' },
  { src: 'https://picsum.photos/seed/4/600/400', title: '示例作品 4', desc: '描述文字' },
  { src: 'https://picsum.photos/seed/5/600/400', title: '示例作品 5', desc: '描述文字' },
  { src: 'https://picsum.photos/seed/6/600/400', title: '示例作品 6', desc: '描述文字' },
]
</script>

# 作品展示

这里展示我的摄影作品、设计稿和开源项目。

<div class="gallery-grid">
  <div v-for="item in items" :key="item.src" class="gallery-item">
    <img :src="item.src" :alt="item.title" loading="lazy" />
    <div class="gallery-caption">
      <strong>{{ item.title }}</strong>
      <span>{{ item.desc }}</span>
    </div>
  </div>
</div>

<style scoped>
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
  margin-top: 24px;
}
.gallery-item {
  border-radius: 8px;
  overflow: hidden;
  background: var(--vp-c-bg-soft);
  transition: transform 0.2s;
}
.gallery-item:hover {
  transform: translateY(-2px);
}
.gallery-item img {
  width: 100%;
  height: 200px;
  object-fit: cover;
  display: block;
}
.gallery-caption {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.gallery-caption span {
  font-size: 0.875rem;
  color: var(--vp-c-text-2);
}
</style>
