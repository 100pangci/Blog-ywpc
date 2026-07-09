<template>
  <div class="giscus-comment">
    <div class="giscus-placeholder" v-if="!scriptLoaded">
      <p>评论加载中...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface Props {
  repo?: string
  repoId?: string
  category?: string
  categoryId?: string
}

const props = withDefaults(defineProps<Props>(), {
  repo: '100pangci/Blog-ywpc',
  repoId: '<你的Giscus Repo ID>',
  category: 'Announcements',
  categoryId: '<你的Giscus Category ID>',
})

const scriptLoaded = ref(false)

onMounted(() => {
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
  script.setAttribute('data-theme', 'preferred_color_scheme')
  script.setAttribute('data-lang', 'zh-CN')
  script.setAttribute('crossorigin', 'anonymous')
  script.setAttribute('async', '')
  script.onload = () => {
    scriptLoaded.value = true
  }
  document.querySelector('.giscus-comment')?.appendChild(script)
})
</script>
