---
title: Gallery
aside: false
comment: false
---

<script setup>
const items = [
  { src: 'https://picsum.photos/seed/1/600/400', title: 'Sample Work 1', desc: 'Description text' },
  { src: 'https://picsum.photos/seed/2/600/400', title: 'Sample Work 2', desc: 'Description text' },
  { src: 'https://picsum.photos/seed/3/600/400', title: 'Sample Work 3', desc: 'Description text' },
  { src: 'https://picsum.photos/seed/4/600/400', title: 'Sample Work 4', desc: 'Description text' },
  { src: 'https://picsum.photos/seed/5/600/400', title: 'Sample Work 5', desc: 'Description text' },
  { src: 'https://picsum.photos/seed/6/600/400', title: 'Sample Work 6', desc: 'Description text' },
]
</script>

# Gallery

My photography, designs, and open-source projects.

<LightboxGallery :items="items" />
