import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import { useData } from 'vitepress'
import type { Theme } from 'vitepress'
import { withBlogTheme } from 'vitepress-plugin-blog'
import 'vitepress-plugin-blog/style.css'
import GiscusComment from './components/GiscusComment.vue'
import Busuanzi from './components/Busuanzi.vue'
import TagsDisplay from './components/TagsDisplay.vue'
import './style/vars.css'

const enhanced = {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      'doc-before': () => {
        const { frontmatter } = useData()
        const tags = frontmatter.value.tags
        if (tags && Array.isArray(tags) && tags.length) {
          return h(TagsDisplay, { tags })
        }
        return null
      },
      'doc-after': () => {
        const { frontmatter } = useData()
        const showComments = frontmatter.value.comment !== false
        return [h(Busuanzi), showComments ? h(GiscusComment) : null]
      },
    })
  },
} satisfies Theme

export default withBlogTheme(enhanced)
