<template>
  <Teleport to="body">
    <Transition name="fade">
      <button
        v-show="visible"
        class="back-to-top"
        @click="scrollToTop"
        :aria-label="t('backToTop')"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
// 回到顶部按钮 — 滚动时显示/隐藏，点击平滑回到顶部
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute } from 'vitepress'
import { useI18n } from '../composables/useI18n'

const route = useRoute()
const { t } = useI18n()
const isHome = computed(() => /^\/(Blog-ywpc\/)?(zh\/?|en\/?|ja\/?)?$/.test(route.path))
const visible = ref(false)

// ========== 滚动控制 ==========
function onScroll() {
  if (isHome.value) {
    visible.value = false
    return
  }
  visible.value = window.scrollY > 0
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
})
</script>
