<template>
  <div class="giscus-comment">
    <div class="giscus-placeholder" v-if="!scriptLoaded">
      <p>评论加载中...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface Props {
  repo?: string
  repoId?: string
  category?: string
  categoryId?: string
}

const props = withDefaults(defineProps<Props>(), {
  repo: '100pangci/Blog-ywpc',
  repoId: 'R_kgDOTTRCWA',
  category: 'Announcements',
  categoryId: 'DIC_kwDOTTRCWM4DA1Gl',
})

const scriptLoaded = ref(false)

function getTheme(): string {
  if (typeof document === 'undefined') return 'light'
  const stored = localStorage.getItem('vitepress-theme-appearance')
  if (stored === 'dark') return 'dark'
  if (stored === 'light') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function sendGiscusTheme(theme: string) {
  const iframe = document.querySelector<HTMLIFrameElement>('.giscus-comment iframe')
  if (iframe?.contentWindow) {
    iframe.contentWindow.postMessage(
      { giscus: { setConfig: { theme: theme === 'dark' ? 'dark_dimmed' : 'light' } } },
      'https://giscus.app'
    )
  }
}

let observer: MutationObserver | null = null

onMounted(() => {
  const currentTheme = getTheme()

  const script = document.createElement('script')
  script.src = 'https://giscus.app/client.js'
  script.setAttribute('data-repo', props.repo)
  script.setAttribute('data-repo-id', props.repoId)
  script.setAttribute('data-category', props.category)
  script.setAttribute('data-category-id', props.categoryId)
  script.setAttribute('data-mapping', 'pathname')
  script.setAttribute('data-strict', '0')
  script.setAttribute('data-reactions-enabled', '1')
  script.setAttribute('data-emit-metadata', '0')
  script.setAttribute('data-input-position', 'bottom')
  script.setAttribute('data-theme', currentTheme)
  script.setAttribute('data-lang', 'zh-CN')
  script.setAttribute('crossorigin', 'anonymous')
  script.setAttribute('async', '')
  script.onload = () => {
    scriptLoaded.value = true

    observer = new MutationObserver(() => {
      sendGiscusTheme(getTheme())
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  }
  document.querySelector('.giscus-comment')?.appendChild(script)
})

onUnmounted(() => {
  observer?.disconnect()
})
</script>
