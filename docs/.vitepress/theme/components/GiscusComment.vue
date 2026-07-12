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

// ========== 主题配置 ==========
const themes: Record<string, string> = {
  light: [
    'main{',
    '--color-canvas-default:transparent;',
    '--color-canvas-subtle:rgba(246,246,247,0.5);',
    '--color-canvas-overlay:rgba(255,255,255,0.6);',
    '--color-fg-default:#333;',
    '--color-fg-muted:#666;',
    '--color-fg-subtle:#999;',
    '--color-accent-fg:#e95295;',
    '--color-accent-subtle:rgba(233,82,149,0.08);',
    '--color-accent-emphasis:#e95295;',
    '--color-btn-bg:transparent;',
    '--color-btn-border:rgba(0,0,0,0.1);',
    '--color-btn-hover-bg:rgba(233,82,149,0.08);',
    '--color-btn-hover-border:rgba(233,82,149,0.3);',
    '--color-btn-active-bg:rgba(233,82,149,0.14);',
    '--color-btn-active-border:rgba(233,82,149,0.4);',
    '--color-btn-primary-bg:#e95295;',
    '--color-btn-primary-hover-bg:#eb6ea5;',
    '--color-btn-primary-text:#fff;',
    '--color-border-default:rgba(0,0,0,0.08);',
    '--color-border-muted:rgba(0,0,0,0.04);',
    '--color-input-bg:rgba(255,255,255,0.25);',
    '--color-input-border:rgba(0,0,0,0.12);',
    '--color-social-reaction-bg-hover:rgba(233,82,149,0.08);',
    '--color-social-reaction-bg-reacted-hover:rgba(233,82,149,0.14);',
    '--color-segmented-control-bg:rgba(246,246,247,0.3);',
    '--color-segmented-control-button-bg:transparent;',
    '--color-segmented-control-button-selected-border:rgba(233,82,149,0.5);',
    '--color-input-contrast-bg:rgba(246,246,247,0.25);',
    'color-scheme:light',
    '}',
  ].join(''),
  dark: [
    'main{',
    '--color-canvas-default:transparent;',
    '--color-canvas-subtle:rgba(37,37,40,0.5);',
    '--color-canvas-overlay:rgba(30,30,32,0.6);',
    '--color-fg-default:rgba(255,255,255,0.90);',
    '--color-fg-muted:rgba(235,235,245,0.75);',
    '--color-fg-subtle:rgba(235,235,245,0.52);',
    '--color-accent-fg:#f5b1aa;',
    '--color-accent-subtle:rgba(245,177,170,0.08);',
    '--color-accent-emphasis:#f5b1aa;',
    '--color-btn-bg:transparent;',
    '--color-btn-border:rgba(255,255,255,0.1);',
    '--color-btn-hover-bg:rgba(245,177,170,0.08);',
    '--color-btn-hover-border:rgba(245,177,170,0.3);',
    '--color-btn-active-bg:rgba(245,177,170,0.14);',
    '--color-btn-active-border:rgba(245,177,170,0.4);',
    '--color-btn-primary-bg:#f5b1aa;',
    '--color-btn-primary-hover-bg:#f4b3c2;',
    '--color-btn-primary-text:#1a1a1c;',
    '--color-border-default:rgba(255,255,255,0.08);',
    '--color-border-muted:rgba(255,255,255,0.04);',
    '--color-input-bg:rgba(30,30,32,0.25);',
    '--color-input-border:rgba(255,255,255,0.12);',
    '--color-social-reaction-bg-hover:rgba(245,177,170,0.08);',
    '--color-social-reaction-bg-reacted-hover:rgba(245,177,170,0.14);',
    '--color-segmented-control-bg:rgba(37,37,40,0.3);',
    '--color-segmented-control-button-bg:transparent;',
    '--color-segmented-control-button-selected-border:rgba(245,177,170,0.5);',
    '--color-input-contrast-bg:rgba(37,37,40,0.25);',
    'color-scheme:dark',
    '}',
  ].join(''),
}

function giscusTheme(mode: string): string {
  const css = themes[mode === 'dark' ? 'dark' : 'light']
  return 'data:text/css;base64,' + btoa(unescape(encodeURIComponent(css)))
}

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

<style scoped>
.giscus-comment {
  margin-top: 32px;
  padding: 20px;
  border-radius: 12px;
  backdrop-filter: blur(16px) saturate(140%);
  -webkit-backdrop-filter: blur(16px) saturate(140%);
  border: 1px solid var(--vp-c-divider);
}

.giscus-comment iframe {
  background: transparent !important;
}

.giscus-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  font-size: 14px;
  color: var(--vp-c-text-3);
}
</style>
