<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

let observer: MutationObserver | null = null
let el: HTMLElement | null = null
let docTop = 0
let elHeight = 0

function getDocTop(target: HTMLElement) {
  let top = 0
  let cur: HTMLElement | null = target
  while (cur) {
    top += cur.offsetTop
    cur = cur.offsetParent as HTMLElement | null
  }
  return top
}

function applyFloating() {
  if (!el || !document.contains(el)) return

  const scrollTop = window.scrollY
  const winHeight = window.innerHeight
  const topGap = 88
  const bottomGap = 24

  const naturalTop = docTop - scrollTop
  const maxTop = winHeight - elHeight - bottomGap

  if (maxTop <= topGap) {
    el.style.transform = `translateY(${topGap - naturalTop}px)`
    return
  }

  // 在视口内跟随自然滚动，不偏移
  if (naturalTop >= topGap && naturalTop <= maxTop) {
    el.style.transform = ''
    return
  }

  // 超出边界时粘住
  const targetTop = naturalTop < topGap ? topGap : maxTop
  el.style.transform = `translateY(${targetTop - naturalTop}px)`
}

function onScroll() {
  requestAnimationFrame(applyFloating)
}

function onResize() {
  if (el && document.contains(el)) {
    docTop = getDocTop(el)
    elHeight = el.offsetHeight
    applyFloating()
  }
}

function reset() {
  if (el) {
    el.style.transform = ''
    el.style.transition = ''
  }
  el = null
  docTop = 0
  elHeight = 0
}

function tryCapture(elCandidate: HTMLElement) {
  if (el === elCandidate) return
  reset()
  el = elCandidate
  // 加过渡动画消除生硬感
  el.style.transition = 'transform 0.1s linear'
  docTop = getDocTop(el)
  elHeight = el.offsetHeight
  applyFloating()
}

onMounted(() => {
  observer = new MutationObserver(() => {
    if (el && !document.contains(el)) reset()
    const found = document.querySelector<HTMLElement>('.VPDoc .aside-container')
    if (found && found !== el) tryCapture(found)
  })
  observer.observe(document.body, { childList: true, subtree: true })

  const found = document.querySelector<HTMLElement>('.VPDoc .aside-container')
  if (found) tryCapture(found)

  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  observer?.disconnect()
  reset()
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onResize)
})
</script>

<template></template>
