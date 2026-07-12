<script setup lang="ts">
// 加载进度条组件 — 页面切换时在顶部显示进度动画
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vitepress'

const router = useRouter()
const isLoading = ref(false)  // 是否正在加载
const progress = ref(0)       // 当前进度（0–100）

let timer: ReturnType<typeof setTimeout> | null = null

// ========== 进度控制 ==========
function start() {
  if (timer) clearTimeout(timer)
  progress.value = 0
  isLoading.value = true
  tick()
}

function tick() {
  const diff = 100 - progress.value
  progress.value += diff * 0.18

  if (progress.value < 95) {
    timer = setTimeout(tick, 200 + Math.random() * 100)
  }
}

function finish() {
  if (timer) clearTimeout(timer)
  progress.value = 100
  setTimeout(() => {
    isLoading.value = false
    progress.value = 0
    }, 300)
}

// ========== 生命周期 ==========
onMounted(() => {
  const originalBefore = router.onBeforeRouteChange
  const originalAfter = router.onAfterRouteChange

  const beforeWrapper = (to: string) => {
    start()
    return originalBefore?.(to)
  }
  const afterWrapper = (to: string) => {
    finish()
    return originalAfter?.(to)
  }

  router.onBeforeRouteChange = beforeWrapper
  router.onAfterRouteChange = afterWrapper

  onUnmounted(() => {
    if (router.onBeforeRouteChange === beforeWrapper) {
      router.onBeforeRouteChange = originalBefore
    }
    if (router.onAfterRouteChange === afterWrapper) {
      router.onAfterRouteChange = originalAfter
    }
  })
})
</script>

<template>
  <Transition name="loading-bar-fade">
    <div
      v-show="isLoading"
      class="loading-bar"
      role="progressbar"
      :aria-valuenow="progress"
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <div class="loading-bar__glow" />
      <div class="loading-bar__inner" :style="{ width: progress + '%' }" />
    </div>
  </Transition>
</template>

