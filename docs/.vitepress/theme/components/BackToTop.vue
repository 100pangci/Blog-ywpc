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

<style scoped>
.back-to-top {
  position: fixed;
  bottom: 32px;
  right: 32px;
  z-index: 999;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-elv);
  color: var(--vp-c-text-2);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  transition: background 0.25s, color 0.25s, box-shadow 0.25s, transform 0.25s;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.back-to-top:hover {
  color: var(--vp-c-brand-1);
  box-shadow: 0 4px 16px rgba(233, 82, 149, 0.2);
  transform: translateY(-2px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@media (max-width: 768px) {
  .back-to-top {
    bottom: 20px;
    right: 20px;
    width: 40px;
    height: 40px;
  }
}
</style>