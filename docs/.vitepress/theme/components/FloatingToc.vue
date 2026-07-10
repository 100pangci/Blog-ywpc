<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

let mo: MutationObserver | null = null
let el: HTMLElement | null = null
let docTop = 0
let naturalHeight = 0

function remeasure() {
  if (!el || !document.contains(el)) return
  el.style.transform = ''
  el.style.removeProperty('max-height')
  el.style.removeProperty('overflow-y')
  void el.offsetHeight
  docTop = el.getBoundingClientRect().top + window.scrollY
  naturalHeight = el.offsetHeight
}

function apply() {
  if (!el || !document.contains(el)) return

  const scrollTop = window.scrollY
  const winHeight = window.innerHeight
  const topGap = 88
  const bottomGap = 24
  const maxHeight = winHeight - topGap - bottomGap

  const naturalTop = docTop - scrollTop
  const maxTop = winHeight - naturalHeight - bottomGap

  if (maxTop <= topGap) {
    el.style.transform = `translateY(${topGap - naturalTop}px)`
    el.style.setProperty('max-height', `${maxHeight}px`, 'important')
    el.style.setProperty('overflow-y', 'auto', 'important')
    return
  }

  el.style.removeProperty('max-height')
  el.style.removeProperty('overflow-y')

  if (naturalTop >= topGap && naturalTop <= maxTop) {
    el.style.transform = ''
    return
  }

  const anchor = naturalTop < topGap ? topGap : maxTop
  el.style.transform = `translateY(${anchor - naturalTop}px)`
}

function onScroll() {
  requestAnimationFrame(apply)
}

function onResize() {
  if (!el || !document.contains(el)) return
  remeasure()
  apply()
}

function free() {
  if (!el) return
  el.style.transform = ''
  el.style.removeProperty('max-height')
  el.style.removeProperty('overflow-y')
  el = null
  docTop = 0
  naturalHeight = 0
}

function grab(found: HTMLElement) {
  free()
  el = found
  remeasure()
  apply()
}

onMounted(() => {
  mo = new MutationObserver(() => {
    const found = document.querySelector<HTMLElement>('.VPDoc .aside-container')
    if (found) {
      if (found !== el) grab(found)
    } else if (el) {
      free()
    }
  })
  mo.observe(document.body, { childList: true, subtree: true })

  const found = document.querySelector<HTMLElement>('.VPDoc .aside-container')
  if (found) grab(found)

  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  mo?.disconnect()
  free()
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onResize)
})
</script>

<template></template>
