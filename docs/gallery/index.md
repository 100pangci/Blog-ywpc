---
title: 作品展示
layout: page
comment: false
---

<script setup>
// 作品展示页 — 画廊网格布局，使用 picsum.photos 占位图
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
  <a v-for="item in items" :key="item.src" class="gallery-item" href="javascript:void(0)">
    <div class="gallery-media">
      <img :src="item.src" :alt="item.title" loading="lazy" />
      <div class="gallery-overlay"></div>
    </div>
    <div class="gallery-caption">
      <strong class="gallery-title">{{ item.title }}</strong>
      <span class="gallery-desc">{{ item.desc }}</span>
    </div>
  </a>
</div>

<style scoped>
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 22px;
  margin-top: 28px;
}

.gallery-item {
  position: relative;
  display: block;
  border-radius: 16px;
  overflow: hidden;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  text-decoration: none;
  color: inherit;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1),
              box-shadow 0.4s ease,
              border-color 0.4s ease;
}

.gallery-item:hover {
  transform: translateY(-6px);
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 16px 40px rgba(233, 82, 149, 0.16);
}

.gallery-media {
  position: relative;
  overflow: hidden;
}

.gallery-item img {
  width: 100%;
  height: 220px;
  object-fit: cover;
  display: block;
  transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}

.gallery-item:hover img {
  transform: scale(1.06);
}

.gallery-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 45%, rgba(0, 0, 0, 0.45) 100%);
  opacity: 0;
  transition: opacity 0.4s ease;
}

.gallery-item:hover .gallery-overlay {
  opacity: 1;
}

.gallery-caption {
  padding: 14px 18px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.gallery-title {
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  transition: color 0.3s ease;
}

.gallery-item:hover .gallery-title {
  color: var(--vp-c-brand-1);
}

.gallery-desc {
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  line-height: 1.5;
}

@media (max-width: 768px) {
  .gallery-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 14px;
    margin-top: 20px;
  }

  .gallery-item img {
    height: 150px;
  }

  .gallery-caption {
    padding: 10px 12px 12px;
  }

  .gallery-title {
    font-size: 0.92rem;
  }

  .gallery-desc {
    font-size: 0.78rem;
  }
}

@media (max-width: 380px) {
  .gallery-grid {
    grid-template-columns: 1fr;
  }
}
</style>