import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import GiscusComment from './components/GiscusComment.vue'
import Busuanzi from './components/Busuanzi.vue'
import './style/vars.css'

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      'doc-after': () => [h(Busuanzi), h(GiscusComment)],
    })
  },
} satisfies Theme
