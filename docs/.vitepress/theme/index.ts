import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import { withBlogTheme } from 'vitepress-plugin-blog'
import 'vitepress-plugin-blog/style.css'
import GiscusComment from './components/GiscusComment.vue'
import Busuanzi from './components/Busuanzi.vue'
import './style/vars.css'

const blogTheme = withBlogTheme(DefaultTheme)

export default {
  ...blogTheme,
  Layout: () => {
    return h(blogTheme.Layout!, null, {
      'doc-after': () => [h(Busuanzi), h(GiscusComment)],
    })
  },
} satisfies Theme
