<!--
  自部署页面计数器
  后端：Cloudflare Worker（见 docs/counter-worker.js）
  部署后请将下方 COUNTER_ENDPOINT 改为你的 worker 地址，
  例如 https://blog-counter.xxxx.workers.dev/counter
-->
<template>
  <div class="busuanzi-container">
    <span class="busuanzi-site">
      本站总访问量 <span id="counter_site_pv" class="counter-val">{{ disp.site_pv }}</span> 次
      &nbsp;|&nbsp;
      访客数 <span id="counter_site_uv" class="counter-val">{{ disp.site_uv }}</span> 人
    </span>
    <span v-if="isDocPage" class="busuanzi-page">
      &nbsp;|&nbsp;
      本文阅读量 <span id="counter_page_pv" class="counter-val">{{ disp.page_pv }}</span> 次
    </span>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'

const COUNTER_ENDPOINT = 'https://blog-counter.你的名字.workers.dev/counter'

const isDocPage = ref(false)
const disp = reactive({ site_pv: '...', site_uv: '...', page_pv: '...' })
const ids = ['counter_site_pv', 'counter_site_uv', 'counter_page_pv']

onMounted(async () => {
  isDocPage.value = !!document.querySelector('.content')

  const page = window.location.pathname.replace(/\/Blog-ywpc/, '') || '/'
  let ok = false

  try {
    const res = await fetch(`${COUNTER_ENDPOINT}?page=${encodeURIComponent(page)}`, {
      signal: AbortSignal.timeout(5000),
    })
    if (res.ok) {
      const data = await res.json()
      disp.site_pv = String(data.site_pv ?? '—')
      disp.site_uv = String(data.site_uv ?? '—')
      disp.page_pv = String(data.page_pv ?? '—')
      ok = true
    }
  } catch {}

  if (!ok) {
    disp.site_pv = '—'
    disp.site_uv = '—'
    disp.page_pv = '—'
  }
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
.counter-val {
  color: var(--vp-c-brand-1);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
</style>