<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

interface GalleryItem {
  src: string
  title: string
  desc: string
}

const props = defineProps<{ items: GalleryItem[] }>()

// --- Lightbox state ---
const isOpen = ref(false)
const activeIndex = ref(0)

// --- Slide transition ---
const prevIndex = ref(-1)
const direction = ref(1)
const isTransitioning = ref(false)

// --- Zoom & Pan ---
const zoom = ref(1)
const panX = ref(0)
const panY = ref(0)
const isZoomed = computed(() => zoom.value > 1)
const isPanning = ref(false)
let panStartX = 0
let panStartY = 0
let panMoved = false

// --- Touch swipe ---
let touchStartX = 0
let touchStartY = 0
let touchMoveX = 0
let touchMoveY = 0
let isSwiping = false
const touchOffset = ref(0)
const SWIPE_THRESHOLD = 50

const hasPrev = computed(() => activeIndex.value > 0)
const hasNext = computed(() => activeIndex.value < props.items.length - 1)

const imgStyle = computed(() => {
  if (isTransitioning.value) return {}
  return {
    transform: `translate(${panX.value + touchOffset.value}px, ${panY.value}px) scale(${zoom.value})`,
    cursor: isZoomed.value ? (isPanning.value ? 'grabbing' : 'grab') : 'zoom-in',
  }
})

// --- Open / Close ---
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

// --- Slide transition ---
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

// --- Zoom & Pan ---
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

// --- Touch swipe ---
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

// --- Image preloading ---
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

// --- Keyboard ---
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

<style scoped>
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 22px;
  margin-top: 28px;
}

.gallery-item {
  position: relative;
  display: block;
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  text-decoration: none;
  color: inherit;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1),
              box-shadow 0.4s ease,
              border-color 0.4s ease;
}

.gallery-item:hover {
  transform: translateY(-6px);
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 16px 40px rgba(233, 82, 149, 0.16);
}

.gallery-media {
  position: relative;
  overflow: hidden;
}

.gallery-item img {
  width: 100%;
  height: 220px;
  object-fit: cover;
  display: block;
  transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}

.gallery-item:hover img {
  transform: scale(1.06);
}

.gallery-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 45%, rgba(0, 0, 0, 0.45) 100%);
  opacity: 0;
  transition: opacity 0.4s ease;
}

.gallery-item:hover .gallery-overlay {
  opacity: 1;
}

.gallery-caption {
  padding: 14px 18px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.gallery-title {
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  transition: color 0.3s ease;
}

.gallery-item:hover .gallery-title {
  color: var(--vp-c-brand-1);
}

.gallery-desc {
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  line-height: 1.5;
}

@media (max-width: 768px) {
  .gallery-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 14px;
    margin-top: 20px;
  }

  .gallery-item img {
    height: 150px;
  }

  .gallery-caption {
    padding: 10px 12px 12px;
  }

  .gallery-title {
    font-size: 0.92rem;
  }

  .gallery-desc {
    font-size: 0.78rem;
  }
}

@media (max-width: 380px) {
  .gallery-grid {
    grid-template-columns: 1fr;
  }
}

/* Lightbox overlay */
.lightbox-overlay {
  --lb-bg: rgba(245, 245, 245, 0.95);
  --lb-text: #1a1a1a;
  --lb-text-dim: rgba(0, 0, 0, 0.55);
  --lb-btn-bg: rgba(0, 0, 0, 0.08);
  --lb-btn-bg-hover: rgba(0, 0, 0, 0.15);
  --lb-btn-text: #1a1a1a;
  --lb-border: rgba(0, 0, 0, 0.2);

  position: fixed;
  inset: 0;
  z-index: 9999;
  background: var(--lb-bg);
  backdrop-filter: blur(8px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 0;
}

.lightbox-main {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-height: 0;
  width: 100%;
  max-height: calc(100vh - 80px);
}

/* Stage */
.lightbox-stage {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  max-width: 95vw;
  max-height: calc(100vh - 100px);
  touch-action: none;
  overflow: hidden;
}

.lightbox-img {
  max-width: 95vw;
  max-height: calc(100vh - 100px);
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5);
  user-select: none;
  -webkit-user-drag: none;
}

.lightbox-img--leaving {
  position: absolute;
  z-index: 1;
  border-radius: 8px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5);
}

.lightbox-img--current {
  position: relative;
  z-index: 2;
}

.lightbox-img--current:not([style*="scale"]) {
  cursor: zoom-in;
}

.lightbox-img.is-dragging {
  cursor: grabbing !important;
}

/* Slide animations */
@keyframes slideOutLeft {
  from { transform: translateX(0); opacity: 1; }
  to { transform: translateX(-10%); opacity: 0; }
}

@keyframes slideOutRight {
  from { transform: translateX(0); opacity: 1; }
  to { transform: translateX(10%); opacity: 0; }
}

@keyframes slideInLeft {
  from { transform: translateX(-10%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

@keyframes slideInRight {
  from { transform: translateX(10%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

.slide-out-left {
  animation: slideOutLeft 320ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.slide-out-right {
  animation: slideOutRight 320ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.slide-in-left {
  animation: slideInLeft 320ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.slide-in-right {
  animation: slideInRight 320ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

/* Close button */
.lightbox-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: var(--lb-btn-bg);
  color: var(--lb-btn-text);
  font-size: 18px;
  cursor: pointer;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, transform 0.2s;
}

.lightbox-close:hover {
  background: var(--lb-btn-bg-hover);
  transform: scale(1.05);
}

/* Nav buttons */
.lightbox-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  background: var(--lb-btn-bg);
  color: var(--lb-btn-text);
  cursor: pointer;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, transform 0.2s;
}

.lightbox-nav svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.lightbox-nav:hover {
  background: var(--lb-btn-bg-hover);
  transform: translateY(-50%) scale(1.08);
}

.lightbox-prev {
  left: 12px;
}

.lightbox-next {
  right: 12px;
}

/* Controls */
.lightbox-controls {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 12px;
  color: var(--lb-text-dim);
  font-size: 14px;
  font-weight: 500;
}

.lightbox-zoom-label {
  min-width: 48px;
  text-align: center;
}

.lightbox-zoom-btn {
  padding: 4px 12px;
  border-radius: 6px;
  border: 1px solid var(--lb-border);
  background: transparent;
  color: var(--lb-text-dim);
  font-size: 12px;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
}

.lightbox-zoom-btn:hover:not(:disabled) {
  border-color: var(--lb-text);
  color: var(--lb-text);
}

.lightbox-zoom-btn:disabled {
  opacity: 0.3;
  cursor: default;
}

/* Info */
.lightbox-info {
  padding: 16px 24px;
  color: var(--lb-text);
  text-align: center;
  font-size: 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.lightbox-info strong {
  font-size: 16px;
  font-weight: 600;
}

.lightbox-info span {
  opacity: 0.7;
}

/* Overlay transition */
.lightbox-enter-active,
.lightbox-leave-active {
  transition: opacity 0.25s ease;
}

.lightbox-enter-from,
.lightbox-leave-to {
  opacity: 0;
}

/* Nav fade transition */
.nav-fade-enter-active,
.nav-fade-leave-active {
  transition: opacity 0.2s ease;
}

.nav-fade-enter-from,
.nav-fade-leave-to {
  opacity: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .lightbox-overlay {
    padding: 24px 0;
  }

  .lightbox-nav {
    width: 36px;
    height: 36px;
  }

  .lightbox-nav svg {
    width: 16px;
    height: 16px;
  }

  .lightbox-prev {
    left: 8px;
  }

  .lightbox-next {
    right: 8px;
  }

  .lightbox-info {
    font-size: 13px;
    padding: 12px 16px;
  }

  .lightbox-controls {
    font-size: 12px;
    gap: 12px;
  }
}
</style>

<style>
.dark .lightbox-overlay {
  --lb-bg: rgba(0, 0, 0, 0.88);
  --lb-text: #fff;
  --lb-text-dim: rgba(255, 255, 255, 0.55);
  --lb-btn-bg: rgba(255, 255, 255, 0.12);
  --lb-btn-bg-hover: rgba(255, 255, 255, 0.25);
  --lb-btn-text: #fff;
  --lb-border: rgba(255, 255, 255, 0.25);
}
</style>
