<template>
  <div class="busuanzi-container">
    <span id="busuanzi_container_site_pv">
      <span v-html="sitePVText" />
      &nbsp;|&nbsp;
      <span v-html="siteUVText" />
    </span>
    <span v-if="isDocPage" id="busuanzi_container_page_pv">
      &nbsp;|&nbsp;
      <span v-html="pagePVText" />
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useI18n } from '../composables/useI18n'

const isDocPage = ref(false)
const { t } = useI18n()

const sitePVText = computed(() => t('busuanzi.sitePV').replace('{count}', '<span id="busuanzi_value_site_pv"></span>'))
const siteUVText = computed(() => t('busuanzi.siteUV').replace('{count}', '<span id="busuanzi_value_site_uv"></span>'))
const pagePVText = computed(() => t('busuanzi.pagePV').replace('{count}', '<span id="busuanzi_value_page_pv"></span>'))

onMounted(() => {
  isDocPage.value = !!document.querySelector('.content')

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
