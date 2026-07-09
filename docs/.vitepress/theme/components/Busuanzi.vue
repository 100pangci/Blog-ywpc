<template>
  <div class="busuanzi-container">
    <span class="busuanzi-site">
      本站总访问量 <span id="busuanzi_value_site_pv" class="busuanzi-val">...</span> 次
      &nbsp;|&nbsp;
      访客数 <span id="busuanzi_value_site_uv" class="busuanzi-val">...</span> 人
    </span>
    <span v-if="isDocPage" class="busuanzi-page">
      &nbsp;|&nbsp;
      本文阅读量 <span id="busuanzi_value_page_pv" class="busuanzi-val">...</span> 次
    </span>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const isDocPage = ref(false)

let timer: number | null = null

onMounted(() => {
  isDocPage.value = !!document.querySelector('.content')

  const el = document.createElement('script')
  el.async = true
  el.referrerPolicy = 'no-referrer-when-downgrade'
  el.src = 'https://busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js'
  document.head.appendChild(el)

  timer = window.setTimeout(() => {
    ;['busuanzi_value_site_pv', 'busuanzi_value_site_uv', 'busuanzi_value_page_pv'].forEach(id => {
      const span = document.getElementById(id)
      if (span && span.textContent === '...') span.textContent = '—'
    })
  }, 5000)
})

onUnmounted(() => {
  if (timer !== null) clearTimeout(timer)
})
</script>

<style scoped>
.busuanzi-container {
  text-align: center;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  padding: 16px 0;
  border-top: 1px solid var(--vp-c-divider);
  margin-top: 32px;
  flex-wrap: wrap;
  justify-content: center;
  display: flex;
  gap: 2px;
}
.busuanzi-site,
.busuanzi-page {
  white-space: nowrap;
}
.busuanzi-val {
  color: var(--vp-c-brand-1);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
</style>