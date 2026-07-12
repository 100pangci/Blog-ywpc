<script setup lang="ts">
import { ref } from 'vue'
import VPNavScreenAppearance from 'vitepress/dist/client/theme-default/components/VPNavScreenAppearance.vue'
import VPNavScreenMenu from 'vitepress/dist/client/theme-default/components/VPNavScreenMenu.vue'
import VPNavScreenSocialLinks from 'vitepress/dist/client/theme-default/components/VPNavScreenSocialLinks.vue'
import VPNavScreenTranslations from 'vitepress/dist/client/theme-default/components/VPNavScreenTranslations.vue'

defineProps<{
  open: boolean
}>()

const screen = ref<HTMLElement | null>(null)
</script>

<template>
  <transition name="cloth">
    <div v-if="open" class="VPNavScreen" ref="screen" id="VPNavScreen">
      <div class="container">
        <slot name="nav-screen-content-before" />
        <VPNavScreenMenu class="menu" />
        <VPNavScreenTranslations class="translations" />
        <VPNavScreenAppearance class="appearance" />
        <VPNavScreenSocialLinks class="social-links" />
        <slot name="nav-screen-content-after" />
      </div>
    </div>
  </transition>
</template>

<style scoped>
.VPNavScreen {
  position: fixed;
  top: calc(var(--vp-nav-height) + 4px);
  right: 12px;
  width: 280px;
  max-height: calc(100vh - var(--vp-nav-height) - 24px);
  background-color: var(--vp-nav-screen-bg-color);
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  overflow-y: auto;
  pointer-events: auto;
  will-change: clip-path;
  z-index: 200;
}

.cloth-enter-active {
  animation: cloth-unfold 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.cloth-leave-active {
  animation: cloth-fold 0.22s cubic-bezier(0.55, 0, 0.7, 0.3) 0.06s forwards;
}

.cloth-enter-active .container {
  animation: cloth-content-in 0.2s ease 0.05s both;
}

.cloth-leave-active .container {
  animation: cloth-content-out 0.06s ease forwards;
}

.cloth-enter-active .menu {
  animation-delay: 0.05s;
}

.cloth-enter-active .translations {
  animation-delay: 0.1s;
}

.cloth-enter-active .appearance {
  animation-delay: 0.15s;
}

.cloth-enter-active .social-links {
  animation-delay: 0.2s;
}

@keyframes cloth-unfold {
  0% {
    clip-path: inset(0 0 100% 100%);
  }
  100% {
    clip-path: inset(0);
  }
}

@keyframes cloth-fold {
  0% {
    clip-path: inset(0);
  }
  100% {
    clip-path: inset(0 0 100% 100%);
  }
}

@keyframes cloth-content-in {
  0% {
    opacity: 0;
    transform: translateY(8px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes cloth-content-out {
  0% {
    opacity: 1;
    transform: translateY(0);
  }
  100% {
    opacity: 0;
    transform: translateY(6px);
  }
}

@media (min-width: 768px) {
  .VPNavScreen {
    display: none;
  }
}

.container {
  padding: 16px 20px 20px;
}

.menu + .translations,
.menu + .appearance,
.translations + .appearance {
  margin-top: 16px;
}

.menu + .social-links {
  margin-top: 12px;
}

.appearance + .social-links {
  margin-top: 12px;
}
</style>
