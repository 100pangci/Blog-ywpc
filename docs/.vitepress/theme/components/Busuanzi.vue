<template>
  <div class="busuanzi-container">
    <span class="busuanzi-site">
      本站总访问量 <span id="busuanzi_value_site_pv"></span> 次
      &nbsp;|&nbsp;
      访客数 <span id="busuanzi_value_site_uv"></span> 人
    </span>
    <span class="busuanzi-page" v-if="isDocPage">
      &nbsp;|&nbsp;
      本文阅读量 <span id="busuanzi_value_page_pv"></span> 次
    </span>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const isDocPage = ref(false)

onMounted(() => {
  isDocPage.value = !!document.querySelector('.content')
  const script = document.createElement('script')
  script.src = 'https://busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js'
  script.async = true
  document.head.appendChild(script)
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
}
.busuanzi-container span {
  margin: 0 4px;
}
</style>
