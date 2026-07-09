<template>
  <div class="busuanzi-container">
    <span class="busuanzi-site">
      本站总访问量 <span class="busuanzi-value" :data-key="'site_pv'">{{ stats.site_pv || '—' }}</span> 次
      &nbsp;|&nbsp;
      访客数 <span class="busuanzi-value" :data-key="'site_uv'">{{ stats.site_uv || '—' }}</span> 人
    </span>
    <span v-if="isDocPage" class="busuanzi-page">
      &nbsp;|&nbsp;
      本文阅读量 <span class="busuanzi-value" :data-key="'page_pv'">{{ stats.page_pv || '—' }}</span> 次
    </span>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const isDocPage = ref(false)
const stats = ref<Record<string, string>>({})

let scriptEl: HTMLScriptElement | null = null
let timer: number | null = null
const timeoutMs = 6000

function loadBusuanzi() {
  const cb = 'BusuanziCallback_' + Math.floor(Math.random() * 1e12)
  ;(window as any)[cb] = (data: Record<string, string>) => {
    cleanup()
    if (data && typeof data === 'object') {
      stats.value = {
        site_pv: String(data.site_pv ?? ''),
        site_uv: String(data.site_uv ?? ''),
        page_pv: String(data.page_pv ?? ''),
      }
    }
  }
  scriptEl = document.createElement('script')
  scriptEl.async = true
  scriptEl.referrerPolicy = 'no-referrer-when-downgrade'
  scriptEl.onerror = () => {
    cleanup()
  }
  scriptEl.src = `https://busuanzi.ibruce.info/busuanzi?jsonpCallback=${cb}`
  document.head.appendChild(scriptEl)

  timer = window.setTimeout(() => {
    cleanup()
  }, timeoutMs)
}

function cleanup() {
  if (timer !== null) {
    clearTimeout(timer)
    timer = null
  }
  if (scriptEl && scriptEl.parentNode) {
    scriptEl.parentNode.removeChild(scriptEl)
    scriptEl = null
  }
}

onMounted(() => {
  isDocPage.value = !!document.querySelector('.content')
  loadBusuanzi()
})

onUnmounted(() => {
  cleanup()
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
.busuanzi-value {
  color: var(--vp-c-brand-1);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  min-width: 1.4em;
  display: inline-block;
  text-align: center;
}
</style>