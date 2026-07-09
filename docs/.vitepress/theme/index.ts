import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import { withBlogTheme } from 'vitepress-plugin-blog'
import 'vitepress-plugin-blog/style.css'
import GiscusComment from './components/GiscusComment.vue'
import Busuanzi from './components/Busuanzi.vue'
import './style/vars.css'

const enhanced = {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      'doc-after': () => [h(Busuanzi), h(GiscusComment)],
    })
  },
} satisfies Theme

export default withBlogTheme(enhanced)
