<template>
  <div class="busuanzi-container">
    <span>
      {{ t('busuanzi.sitePV').replace('{count}', String(sitePV)) }}
      &nbsp;|&nbsp;
      {{ t('busuanzi.siteUV').replace('{count}', String(siteUV)) }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from '../composables/useI18n'

const { t } = useI18n()
const sitePV = ref(0)
const siteUV = ref(0)

onMounted(() => {
  const cb = 'BusuanziCallback_' + Math.floor(1099511627776 * Math.random())
  const timeout = setTimeout(() => { (window as any)[cb] = undefined }, 8000)

  ;(window as any)[cb] = (data: any) => {
    clearTimeout(timeout)
    sitePV.value = data.site_pv ?? 0
    siteUV.value = data.site_uv ?? 0
    ;(window as any)[cb] = undefined
  }

  const script = document.createElement('script')
  script.async = true
  script.referrerPolicy = 'no-referrer-when-downgrade'
  script.src = `//busuanzi.ibruce.info/busuanzi?jsonpCallback=${cb}`
  document.head.appendChild(script)
})
</script>

<style scoped>
.busuanzi-container {
  text-align: center;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  padding: 8px 0 0;
}
</style>
