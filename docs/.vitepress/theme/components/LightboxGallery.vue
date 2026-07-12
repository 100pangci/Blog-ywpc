<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

// ========== 类型与属性 ==========
interface GalleryItem {
  src: string
  title: string
  desc: string
}

const props = defineProps<{ items: GalleryItem[] }>()

// ========== 状态 ==========
const isOpen = ref(false)
const activeIndex = ref(0)

// 轮播动画
const prevIndex = ref(-1)
const direction = ref(1)
const isTransitioning = ref(false)

// 缩放与拖拽
const zoom = ref(1)
const panX = ref(0)
const panY = ref(0)
const isZoomed = computed(() => zoom.value > 1)
const isPanning = ref(false)
let panStartX = 0
let panStartY = 0
let panMoved = false

// 触摸滑动
let touchStartX = 0
let touchStartY = 0
let touchMoveX = 0
let touchMoveY = 0
let isSwiping = false
const touchOffset = ref(0)
const SWIPE_THRESHOLD = 50

// ========== 计算属性 ==========
const hasPrev = computed(() => activeIndex.value > 0)
const hasNext = computed(() => activeIndex.value < props.items.length - 1)

const imgStyle = computed(() => {
  if (isTransitioning.value) return {}
  return {
    transform: `translate(${panX.value + touchOffset.value}px, ${panY.value}px) scale(${zoom.value})`,
    cursor: isZoomed.value ? (isPanning.value ? 'grabbing' : 'grab') : 'zoom-in',
  }
})

// ========== 打开 / 关闭 ==========
function open(index: number) {
  activeIndex.value = index
  resetZoom()
  isOpen.value = true
  document.body.style.overflow = 'hidden'
  preloadAdjacent(index)
}

function close() {
  isOpen.value = false
  prevIndex.value = -1
  isTransitioning.value = false
  document.body.style.overflow = ''
}

// ========== 轮播切换 ==========
function slideTo(newIndex: number, dir: number) {
  if (isTransitioning.value || !isOpen.value) return
  if (newIndex < 0 || newIndex >= props.items.length) return

  resetZoom()
  prevIndex.value = activeIndex.value
  direction.value = dir
  isTransitioning.value = true
  activeIndex.value = newIndex
  preloadAdjacent(newIndex)
}

function onTransitionEnd() {
  prevIndex.value = -1
  isTransitioning.value = false
}

function prev() {
  slideTo(activeIndex.value - 1, -1)
}

function next() {
  slideTo(activeIndex.value + 1, 1)
}

// ========== 缩放与平移 ==========
function resetZoom() {
  zoom.value = 1
  panX.value = 0
  panY.value = 0
}

function onWheel(e: WheelEvent) {
  if (!isOpen.value) return
  e.preventDefault()
  const delta = e.deltaY > 0 ? -0.1 : 0.1
  zoom.value = Math.max(0.5, Math.min(5, zoom.value + delta))
}

function onImageClick() {
  if (isSwiping || panMoved) return
  if (isZoomed.value) {
    resetZoom()
  } else {
    zoom.value = 2
  }
}

function onPointerDown(e: PointerEvent) {
  if (!isZoomed.value) return
  isPanning.value = true
  panMoved = false
  panStartX = e.clientX - panX.value
  panStartY = e.clientY - panY.value
  const el = e.currentTarget as HTMLElement
  el.setPointerCapture(e.pointerId)
}

function onPointerMove(e: PointerEvent) {
  if (!isPanning.value) return
  const dx = Math.abs(e.clientX - (panStartX + panX.value))
  const dy = Math.abs(e.clientY - (panStartY + panY.value))
  if (dx > 3 || dy > 3) panMoved = true
  panX.value = e.clientX - panStartX
  panY.value = e.clientY - panStartY
}

function onPointerUp() {
  isPanning.value = false
}

function onStageClick() {
  if (panMoved || isSwiping) return
  onImageClick()
}

// ========== 触摸滑动 ==========
function onTouchStart(e: TouchEvent) {
  if (!isOpen.value || isZoomed.value || isTransitioning.value) return
  touchStartX = e.touches[0].clientX
  touchStartY = e.touches[0].clientY
  touchMoveX = 0
  touchMoveY = 0
  isSwiping = false
}

function onTouchMove(e: TouchEvent) {
  if (!isOpen.value || isZoomed.value || isTransitioning.value) return

  touchMoveX = e.touches[0].clientX - touchStartX
  touchMoveY = e.touches[0].clientY - touchStartY

  if (!isSwiping && Math.abs(touchMoveX) > Math.abs(touchMoveY) && Math.abs(touchMoveX) > 10) {
    isSwiping = true
  }

  if (isSwiping) {
    e.preventDefault()
    const atLeft = touchMoveX > 0 && !hasPrev.value
    const atRight = touchMoveX < 0 && !hasNext.value
    touchOffset.value = (atLeft || atRight) ? touchMoveX * 0.25 : touchMoveX
  }
}

function onTouchEnd() {
  if (!isSwiping || isTransitioning.value) {
    touchOffset.value = 0
    isSwiping = false
    return
  }

  if (Math.abs(touchOffset.value) > SWIPE_THRESHOLD) {
    if (touchOffset.value > 0) prev()
    else next()
  }

  touchOffset.value = 0
  isSwiping = false
}

// ========== 图片预加载 ==========
const preloaded = new Set<string>()
function preloadAdjacent(index: number) {
  for (const i of [index - 1, index + 1]) {
    if (i >= 0 && i < props.items.length) {
      const src = props.items[i].src
      if (!preloaded.has(src)) {
        const img = new Image()
        img.src = src
        preloaded.add(src)
      }
    }
  }
}

// ========== 键盘与生命周期 ==========
function onKeydown(e: KeyboardEvent) {
  if (!isOpen.value) return
  if (e.key === 'Escape') close()
  if (e.key === 'ArrowLeft') prev()
  if (e.key === 'ArrowRight') next()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <div class="gallery-grid">
    <div
      v-for="(item, index) in props.items"
      :key="index"
      class="gallery-item"
      @click="open(index)"
    >
      <div class="gallery-media">
        <img :src="item.src" :alt="item.title" loading="lazy" />
        <div class="gallery-overlay"></div>
      </div>
      <div class="gallery-caption">
        <strong class="gallery-title">{{ item.title }}</strong>
        <span class="gallery-desc">{{ item.desc }}</span>
      </div>
    </div>
  </div>

  <Teleport to="body">
    <Transition name="lightbox">
      <div v-if="isOpen" class="lightbox-overlay" @click.self="close">
        <button class="lightbox-close" @click="close" aria-label="Close">✕</button>

        <div class="lightbox-main">
          <div
            class="lightbox-stage"
            @wheel.prevent="onWheel"
            @touchstart.passive="onTouchStart"
            @touchmove="onTouchMove"
            @touchend="onTouchEnd"
            @touchcancel="onTouchEnd"
          >
            <img
              v-if="prevIndex >= 0"
              :src="props.items[prevIndex].src"
              class="lightbox-img lightbox-img--leaving"
              :class="direction > 0 ? 'slide-out-left' : 'slide-out-right'"
              draggable="false"
            />
            <img
              :key="activeIndex"
              :src="props.items[activeIndex].src"
              class="lightbox-img lightbox-img--current"
              :class="{
                'slide-in-right': isTransitioning && direction > 0,
                'slide-in-left': isTransitioning && direction < 0,
                'is-dragging': isPanning,
              }"
              :style="imgStyle"
              @click="onStageClick"
              @animationend="onTransitionEnd"
              @pointerdown="onPointerDown"
              @pointermove="onPointerMove"
              @pointerup="onPointerUp"
              @pointercancel="onPointerUp"
              draggable="false"
            />
            <Transition name="nav-fade">
              <button v-if="hasPrev" class="lightbox-nav lightbox-prev" @click.stop="prev" aria-label="Previous">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
            </Transition>
            <Transition name="nav-fade">
              <button v-if="hasNext" class="lightbox-nav lightbox-next" @click.stop="next" aria-label="Next">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18" /></svg>
              </button>
            </Transition>
          </div>

          <div class="lightbox-controls">
            <span class="lightbox-counter">{{ activeIndex + 1 }} / {{ props.items.length }}</span>
            <span class="lightbox-zoom-label">{{ Math.round(zoom * 100) }}%</span>
            <button class="lightbox-zoom-btn" @click="resetZoom" :disabled="zoom === 1">重置</button>
          </div>
        </div>

        <div class="lightbox-info">
          <strong>{{ props.items[activeIndex]?.title }}</strong>
          <span>{{ props.items[activeIndex]?.desc }}</span>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

