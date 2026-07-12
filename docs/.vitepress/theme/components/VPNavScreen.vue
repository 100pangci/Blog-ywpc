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
