<template>
  <div class="busuanzi-container">
    <span id="busuanzi_container_site_pv">
      本站总访问量 <span id="busuanzi_value_site_pv"></span> 次
      &nbsp;|&nbsp;
      访客数 <span id="busuanzi_value_site_uv"></span> 人
    </span>
    <span v-if="isDocPage" id="busuanzi_container_page_pv">
      &nbsp;|&nbsp;
      本文阅读量 <span id="busuanzi_value_page_pv"></span> 次
    </span>
  </div>
</template>

<script setup lang="ts">
// 不蒜子页面计数器组件 — 显示站点总访问量/访客数和本文阅读量
// 注意：此组件依赖第三方服务 busuanzi.ibruce.info，若其不可用则计数不显示
import { ref, onMounted } from 'vue'

const isDocPage = ref(false)

onMounted(() => {
  // 检测当前页面是否为文档页面（有 .content 元素）以显示「本文阅读量」
  isDocPage.value = !!document.querySelector('.content')

  // 动态加载不蒜子脚本
  const el = document.createElement('script')
  el.async = true
  el.referrerPolicy = 'no-referrer-when-downgrade'
  el.src = '//busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js'
  document.head.appendChild(el)
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
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0;
}

#busuanzi_container_site_pv,
#busuanzi_container_page_pv {
  display: inline;
}

#busuanzi_value_site_pv,
#busuanzi_value_site_uv,
#busuanzi_value_page_pv {
  color: var(--vp-c-brand-1);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
</style>