<template>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useData } from 'vitepress'
import { useI18n } from '../composables/useI18n'

const { frontmatter, site, theme } = useData()
const { t } = useI18n()

// 组件名沿用 Busuanzi，但数据源可切换：
// themeConfig.counterEndpoint 填了地址 → 自部署 Cloudflare Worker（见 docs/counter-worker.js）
// 留空 → 回退到公共不蒜子服务
const endpoint = ((theme.value as any).counterEndpoint as string | undefined || '').trim()

// ========== 计数展示 ==========
function formatText(sitePV: number, siteUV: number) {
  return t('busuanzi.sitePV').replace('{count}', String(sitePV))
    + '  |  '
    + t('busuanzi.siteUV').replace('{count}', String(siteUV))
}

function inject(el: HTMLElement, text: string) {
  el.textContent = text
}

function waitForFooter(cb: () => void) {
  if (document.querySelector('.VPFooter .container')) {
    cb()
    return
  }
  const timer = setInterval(() => {
    if (document.querySelector('.VPFooter .container')) {
      clearInterval(timer)
      cb()
    }
  }, 50)
  setTimeout(() => clearInterval(timer), 5000)
}

// 当前页面路径（去掉 base），用于 worker 的按页计数
function currentPagePath(): string {
  const base = site.value.base || '/'
  const path = window.location.pathname
  return (path.startsWith(base) ? path.slice(base.length - 1) : path) || '/'
}

// ========== 数据源 ==========
async function loadFromWorker(el: HTMLElement) {
  const url = `${endpoint}?page=${encodeURIComponent(currentPagePath())}`
  const signal = typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(5000) : undefined
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`counter request failed: ${res.status}`)
  const data = await res.json()
  inject(el, formatText(data.site_pv ?? 0, data.site_uv ?? 0))
}

function loadFromBusuanzi(el: HTMLElement) {
  const cb = 'BusuanziCallback_' + Math.floor(1099511627776 * Math.random())
  const timeout = setTimeout(() => { (window as any)[cb] = undefined }, 8000)

  ;(window as any)[cb] = (data: any) => {
    clearTimeout(timeout)
    inject(el, formatText(data.site_pv ?? 0, data.site_uv ?? 0))
    ;(window as any)[cb] = undefined
  }

  const script = document.createElement('script')
  script.async = true
  script.referrerPolicy = 'no-referrer-when-downgrade'
  script.src = `//busuanzi.ibruce.info/busuanzi?jsonpCallback=${cb}`
  document.head.appendChild(script)
}

// ========== 生命周期 ==========
onMounted(() => {
  if (frontmatter.value.layout !== 'home') return

  waitForFooter(async () => {
    const container = document.querySelector('.VPFooter .container')!
    let el = container.querySelector('.busuanzi-in-footer') as HTMLElement
    if (!el) {
      el = document.createElement('div')
      el.className = 'busuanzi-in-footer'
      container.appendChild(el)
    }

    inject(el, formatText(0, 0))

    if (!endpoint) {
      loadFromBusuanzi(el)
      return
    }

    try {
      await loadFromWorker(el)
    } catch {
      // worker 不可用时回退到公共服务，避免整块统计消失
      loadFromBusuanzi(el)
    }
  })
})
</script>
