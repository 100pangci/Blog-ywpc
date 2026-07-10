<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

let mo: MutationObserver | null = null
let ao: MutationObserver | null = null
let el: HTMLElement | null = null
let docTop = 0
let naturalHeight = 0
let isConstrained = false
let lastActive: Element | null = null
let tightened = false

function remeasure() {
  if (!el || !document.contains(el)) return
  el.style.transform = ''
  if (isConstrained) {
    el.style.removeProperty('max-height')
    el.style.removeProperty('overflow-y')
    isConstrained = false
  }
  void el.offsetHeight
  docTop = el.getBoundingClientRect().top + window.scrollY
  naturalHeight = el.offsetHeight
}

function apply() {
  if (!el || !document.contains(el)) return

  const scrollTop = window.scrollY
  const winHeight = window.innerHeight
  const topGap = Math.max(88, Math.floor(winHeight * 0.15))
  const bottomGap = 24
  const maxHeight = winHeight - topGap - bottomGap

  if (!isConstrained) {
    el.style.setProperty('max-height', `${maxHeight}px`, 'important')
    el.style.setProperty('overflow-y', 'auto', 'important')
    isConstrained = true
  }

  if (scrollTop <= 0) {
    tightened = false
    if (isConstrained) el.scrollTop = 0
  } else if (!tightened && isConstrained) {
    tightened = true
    const firstLink = el.querySelector<HTMLElement>('.outline-link')
    if (firstLink) {
      const offset = firstLink.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop
      el.scrollTo({ top: offset, behavior: 'smooth' })
    }
  }

  const naturalTop = docTop - scrollTop
  const maxTop = winHeight - naturalHeight - bottomGap

  if (maxTop <= topGap) {
    el.style.transform = `translateY(${topGap - naturalTop}px)`
    return
  }

  if (naturalTop >= topGap && naturalTop <= maxTop) {
    el.style.transform = ''
    return
  }

  const anchor = naturalTop < topGap ? topGap : maxTop
  el.style.transform = `translateY(${anchor - naturalTop}px)`
}

function watchActive() {
  ao?.disconnect()
  const outline = document.querySelector('.VPDocAsideOutline')
  if (!outline) return
  lastActive = null
  ao = new MutationObserver(() => {
    const active = outline.querySelector<HTMLElement>('.outline-link.active')
    if (active && active !== lastActive && el && el.scrollHeight > el.clientHeight) {
      lastActive = active
      const offset = active.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop
      el.scrollTo({ top: offset, behavior: 'smooth' })
    }
  })
  ao.observe(outline, { attributes: true, subtree: true, attributeFilter: ['class'] })
}

function free() {
  if (!el) return
  el.style.transform = ''
  if (isConstrained) {
    el.style.removeProperty('max-height')
    el.style.removeProperty('overflow-y')
    isConstrained = false
  }
  el = null
  docTop = 0
  naturalHeight = 0
}

function grab(found: HTMLElement) {
  free()
  el = found
  remeasure()
  apply()
  watchActive()
}

function onResize() {
  if (!el || !document.contains(el)) return
  remeasure()
  apply()
}

onMounted(() => {
  mo = new MutationObserver(() => {
    const found = document.querySelector<HTMLElement>('.VPDoc .aside-container')
    if (found) {
      if (found !== el) {
        lastActive = null
        grab(found)
      }
    } else if (el) {
      free()
    }
  })
  mo.observe(document.body, { childList: true, subtree: true })

  const found = document.querySelector<HTMLElement>('.VPDoc .aside-container')
  if (found) grab(found)

  window.addEventListener('scroll', apply, { passive: true })
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  mo?.disconnect()
  ao?.disconnect()
  free()
  window.removeEventListener('scroll', apply)
  window.removeEventListener('resize', onResize)
})
</script>

<template></template>
