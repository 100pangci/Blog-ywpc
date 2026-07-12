<template>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useData } from 'vitepress'
import { useI18n } from '../composables/useI18n'

const { frontmatter } = useData()
const { t, locale } = useI18n()

// ========== 计数展示 ==========
function formatText(sitePV: number, siteUV: number) {
  return t('busuanzi.sitePV').replace('{count}', String(sitePV))
    + '  |  '
    + t('busuanzi.siteUV').replace('{count}', String(siteUV))
}

function inject(el: HTMLElement, text: string) {
  el.textContent = text
  el.style.cssText = 'line-height:24px;font-size:12px;font-weight:500;color:var(--vp-c-text-3);opacity:0.5;pointer-events:none'
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

// ========== 生命周期 ==========
onMounted(() => {
  if (frontmatter.value.layout !== 'home') return

  waitForFooter(() => {
    const container = document.querySelector('.VPFooter .container')!
    let el = container.querySelector('.busuanzi-in-footer') as HTMLElement
    if (!el) {
      el = document.createElement('div')
      el.className = 'busuanzi-in-footer'
      container.appendChild(el)
    }

    inject(el, formatText(0, 0))

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
  })
})
</script>
