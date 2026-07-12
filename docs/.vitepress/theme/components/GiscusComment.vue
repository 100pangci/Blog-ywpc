<template>
  <div class="giscus-comment">
    <div class="giscus-placeholder" v-if="!scriptLoaded">
      <p>{{ t('giscus.loading') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
// Giscus 评论组件 — 基于 GitHub Discussions 的评论系统
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from '../composables/useI18n'
import { giscusTheme } from '../config/giscusTheme'

interface Props {
  repo?: string
  repoId?: string
  category?: string
  categoryId?: string
}

// 默认配置对应 100pangci/Blog-ywpc 仓库的 Discussions
const props = withDefaults(defineProps<Props>(), {
  repo: '100pangci/Blog-ywpc',
  repoId: 'R_kgDOTTRCWA',
  category: 'Announcements',
  categoryId: 'DIC_kwDOTTRCWM4DA1Gl',
})

const scriptLoaded = ref(false)
const { t, locale } = useI18n()



// 获取当前主题（light / dark），与 VitePress 主题同步
function getMode(): string {
  if (typeof document === 'undefined') return 'light'
  const stored = localStorage.getItem('vitepress-theme-appearance')
  if (stored === 'dark') return 'dark'
  if (stored === 'light') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

// 通过 postMessage 通知 Giscus iframe 切换主题
function sendGiscusTheme(mode: string) {
  const iframe = document.querySelector<HTMLIFrameElement>('.giscus-comment iframe')
  if (iframe?.contentWindow) {
    iframe.contentWindow.postMessage(
      { giscus: { setConfig: { theme: giscusTheme(mode) } } },
      'https://giscus.app'
    )
  }
}

let observer: MutationObserver | null = null

// ========== 生命周期 ==========
onMounted(() => {
  const currentMode = getMode()

  // 动态创建 Giscus 脚本并注入到容器
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
  script.setAttribute('data-theme', giscusTheme(currentMode))
  script.setAttribute('data-lang', locale.value === 'zh' ? 'zh-CN' : locale.value === 'ja' ? 'ja' : 'en')
  script.setAttribute('crossorigin', 'anonymous')
  script.setAttribute('async', '')
  script.onload = () => {
    scriptLoaded.value = true

    // 监听 html 的 class 变化以同步切换评论主题
    observer = new MutationObserver(() => {
      sendGiscusTheme(getMode())
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  }
  document.querySelector('.giscus-comment')?.appendChild(script)
})

onUnmounted(() => {
  observer?.disconnect()
})
</script>

