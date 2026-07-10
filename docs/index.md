<script setup>
import { onMounted } from 'vue'
import { withBase } from 'vitepress'

onMounted(() => {
  const lang = navigator.language || ''
  let target = '/en/'
  if (lang.startsWith('zh')) {
    target = '/zh/'
  } else if (lang.startsWith('ja')) {
    target = '/ja/'
  }
  window.location.replace(withBase(target))
})
</script>
