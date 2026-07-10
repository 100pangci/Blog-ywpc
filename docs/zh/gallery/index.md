---
title: 作品展示
aside: false
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

<LightboxGallery :items="items" />
