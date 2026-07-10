---
title: ギャラリー
aside: false
comment: false
---

<script setup>
const items = [
  { src: 'https://picsum.photos/seed/1/600/400', title: '作品 1', desc: '説明文' },
  { src: 'https://picsum.photos/seed/2/600/400', title: '作品 2', desc: '説明文' },
  { src: 'https://picsum.photos/seed/3/600/400', title: '作品 3', desc: '説明文' },
  { src: 'https://picsum.photos/seed/4/600/400', title: '作品 4', desc: '説明文' },
  { src: 'https://picsum.photos/seed/5/600/400', title: '作品 5', desc: '説明文' },
  { src: 'https://picsum.photos/seed/6/600/400', title: '作品 6', desc: '説明文' },
]
</script>

# ギャラリー

写真、デザイン、オープンソースプロジェクトを展示しています。

<LightboxGallery :items="items" />
