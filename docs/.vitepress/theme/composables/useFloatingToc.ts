import { onMounted, onUnmounted } from 'vue'

export function useFloatingToc() {
  let initDone = false
  let leftValue = 0

  function update() {
    const el = document.querySelector<HTMLElement>('.VPDoc .aside-container')
    if (!el) return

    if (!initDone) {
      const rect = el.getBoundingClientRect()
      leftValue = rect.left
      initDone = true
    }

    const winHeight = window.innerHeight
    const docHeight = document.documentElement.scrollHeight
    const maxScroll = docHeight - winHeight
    const topGap = 88

    if (maxScroll <= 0) {
      el.style.setProperty('position', 'fixed', 'important')
      el.style.setProperty('top', `${topGap}px`, 'important')
      el.style.setProperty('left', `${leftValue}px`, 'important')
      return
    }

    const scrollTop = window.scrollY
    const progress = scrollTop / maxScroll

    const asideHeight = el.offsetHeight
    const bottomGap = 24
    const maxTop = winHeight - asideHeight - bottomGap

    if (maxTop <= topGap) {
      el.style.setProperty('position', 'fixed', 'important')
      el.style.setProperty('top', `${topGap}px`, 'important')
      el.style.setProperty('left', `${leftValue}px`, 'important')
      el.style.setProperty('width', '256px', 'important')
      el.style.setProperty('max-height', `${winHeight - topGap - bottomGap}px`, 'important')
      el.style.setProperty('overflow-y', 'auto', 'important')
      return
    }

    const target = topGap + (maxTop - topGap) * progress

    el.style.setProperty('position', 'fixed', 'important')
    el.style.setProperty('top', `${target}px`, 'important')
    el.style.setProperty('left', `${leftValue}px`, 'important')
    el.style.setProperty('width', '256px', 'important')
    el.style.setProperty('max-height', `${winHeight - topGap - bottomGap}px`, 'important')
    el.style.setProperty('overflow-y', 'auto', 'important')
  }

  onMounted(() => {
    window.addEventListener('scroll', update, { passive: true })
    update()
  })

  onUnmounted(() => {
    window.removeEventListener('scroll', update)
  })
}
