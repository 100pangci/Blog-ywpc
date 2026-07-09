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
const ids = ['busuanzi_value_site_pv', 'busuanzi_value_site_uv', 'busuanzi_value_page_pv']

let scriptEl: HTMLScriptElement | null = null
let timer: number | null = null

function dash() {
  ids.forEach(id => {
    const span = document.getElementById(id)
    if (span && span.textContent === '...') span.textContent = '—'
  })
}

onMounted(() => {
  isDocPage.value = !!document.querySelector('.content')

  const cb = 'BusuanziCallback_' + Math.floor(Math.random() * 1e12)
  ;(window as any)[cb] = (data: Record<string, string>) => {
    if (scriptEl && scriptEl.parentNode) {
      scriptEl.parentNode.removeChild(scriptEl)
      scriptEl = null
    }
    if (timer !== null) { clearTimeout(timer); timer = null }
    if (data) {
      ['site_pv', 'site_uv', 'page_pv'].forEach(key => {
        const span = document.getElementById('busuanzi_value_' + key)
        if (span && data[key] != null) span.textContent = String(data[key])
      })
    }
    // clean stale callbacks
    delete (window as any)[cb]
  }

  scriptEl = document.createElement('script')
  scriptEl.async = true
  scriptEl.referrerPolicy = 'no-referrer-when-downgrade'
  scriptEl.onerror = () => { dash(); cleanup() }
  scriptEl.src = `https://busuanzi.ibruce.info/busuanzi?jsonpCallback=${cb}`
  document.head.appendChild(scriptEl)

  timer = window.setTimeout(() => {
    dash()
    cleanup()
  }, 8000)
})

function cleanup() {
  if (scriptEl && scriptEl.parentNode) {
    scriptEl.parentNode.removeChild(scriptEl)
    scriptEl = null
  }
  if (timer !== null) { clearTimeout(timer); timer = null }
}

onUnmounted(() => { cleanup() })
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