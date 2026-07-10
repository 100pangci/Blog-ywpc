<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

interface GalleryItem {
  src: string
  title: string
  desc: string
}

const props = defineProps<{ items: GalleryItem[] }>()

const activeIndex = ref<number | null>(null)
const zoom = ref(1)
const panX = ref(0)
const panY = ref(0)
const isZoomed = computed(() => zoom.value > 1)
const isPanning = ref(false)
let panStartX = 0
let panStartY = 0
let moved = false

function open(index: number) {
  activeIndex.value = index
  zoom.value = 1
  panX.value = 0
  panY.value = 0
  document.body.style.overflow = 'hidden'
}

function close() {
  activeIndex.value = null
  document.body.style.overflow = ''
}

function prev() {
  if (activeIndex.value !== null && activeIndex.value > 0) {
    activeIndex.value--
    resetZoom()
  }
}

function next() {
  if (activeIndex.value !== null && activeIndex.value < props.items.length - 1) {
    activeIndex.value++
    resetZoom()
  }
}

const hasPrev = computed(() => activeIndex.value !== null && activeIndex.value > 0)
const hasNext = computed(() => activeIndex.value !== null && activeIndex.value < props.items.length - 1)

function resetZoom() {
  zoom.value = 1
  panX.value = 0
  panY.value = 0
}

function onWheel(e: WheelEvent) {
  if (activeIndex.value === null) return
  e.preventDefault()
  const delta = e.deltaY > 0 ? -0.1 : 0.1
  zoom.value = Math.max(0.5, Math.min(5, zoom.value + delta))
}

function onImageClick() {
  if (zoom.value > 1) {
    resetZoom()
  } else {
    zoom.value = 2
  }
}

function onPointerDown(e: PointerEvent) {
  if (!isZoomed.value) return
  isPanning.value = true
  moved = false
  panStartX = e.clientX - panX.value
  panStartY = e.clientY - panY.value
  const el = e.currentTarget as HTMLElement
  el.setPointerCapture(e.pointerId)
}

function onPointerMove(e: PointerEvent) {
  if (!isPanning.value) return
  const dx = Math.abs(e.clientX - (panStartX + panX.value))
  const dy = Math.abs(e.clientY - (panStartY + panY.value))
  if (dx > 3 || dy > 3) moved = true
  panX.value = e.clientX - panStartX
  panY.value = e.clientY - panStartY
}

function onPointerUp() {
  isPanning.value = false
}

function onStageClick(e: MouseEvent) {
  if (moved) return
  onImageClick()
}

function onKeydown(e: KeyboardEvent) {
  if (activeIndex.value === null) return
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
      <div v-if="activeIndex !== null" class="lightbox-overlay" @click.self="close">
        <button class="lightbox-close" @click="close" aria-label="Close">✕</button>

        <div class="lightbox-main">
          <div
            class="lightbox-stage"
            @wheel.prevent="onWheel"
            @pointerdown="onPointerDown"
            @pointermove="onPointerMove"
            @pointerup="onPointerUp"
            @pointercancel="onPointerUp"
            @click.self="close"
          >
            <img
              :src="props.items[activeIndex]?.src"
              :alt="props.items[activeIndex]?.title"
              :style="{ transform: `translate(${panX}px, ${panY}px) scale(${zoom})`, cursor: isZoomed ? 'grab' : 'zoom-in' }"
              :class="{ 'is-dragging': isPanning }"
              @click="onStageClick"
              draggable="false"
            />
            <Transition name="nav-fade">
              <button v-if="hasPrev" class="lightbox-nav lightbox-prev" @click.stop="prev" aria-label="Previous">‹</button>
            </Transition>
            <Transition name="nav-fade">
              <button v-if="hasNext" class="lightbox-nav lightbox-next" @click.stop="next" aria-label="Next">›</button>
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

/* Lightbox */
.lightbox-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(6px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 0;
}

.lightbox-main {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-height: 0;
  width: 100%;
  max-height: calc(100vh - 120px);
}

.lightbox-stage {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  max-width: 90vw;
  max-height: calc(100vh - 160px);
  touch-action: none;
}

.lightbox-stage img {
  max-width: 90vw;
  max-height: calc(100vh - 160px);
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5);
  cursor: zoom-in;
  transition: none;
  user-select: none;
  -webkit-user-drag: none;
}

.lightbox-stage img.is-dragging {
  cursor: grabbing !important;
}

.lightbox-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  font-size: 18px;
  cursor: pointer;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.lightbox-close:hover {
  background: rgba(255, 255, 255, 0.3);
}

.lightbox-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  font-size: 28px;
  cursor: pointer;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, opacity 0.2s;
  line-height: 1;
}

.lightbox-nav:hover {
  background: rgba(255, 255, 255, 0.3);
}

.lightbox-prev {
  left: -52px;
}

.lightbox-next {
  right: -52px;
}

.lightbox-controls {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 12px;
  color: rgba(255, 255, 255, 0.6);
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
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
}

.lightbox-zoom-btn:hover:not(:disabled) {
  border-color: rgba(255, 255, 255, 0.5);
  color: #fff;
}

.lightbox-zoom-btn:disabled {
  opacity: 0.3;
  cursor: default;
}

.lightbox-info {
  padding: 16px 24px;
  color: #fff;
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

.lightbox-enter-active,
.lightbox-leave-active {
  transition: opacity 0.25s ease;
}

.lightbox-enter-from,
.lightbox-leave-to {
  opacity: 0;
}

.nav-fade-enter-active,
.nav-fade-leave-active {
  transition: opacity 0.2s ease;
}

.nav-fade-enter-from,
.nav-fade-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .lightbox-overlay {
    padding: 24px 0;
  }

  .lightbox-nav {
    width: 36px;
    height: 36px;
    font-size: 22px;
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
