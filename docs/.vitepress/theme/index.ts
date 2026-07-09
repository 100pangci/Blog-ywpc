import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import { useData } from 'vitepress'
import type { Theme } from 'vitepress'
import { withBlogTheme } from 'vitepress-plugin-blog'
import 'vitepress-plugin-blog/style.css'
import GiscusComment from './components/GiscusComment.vue'
import Busuanzi from './components/Busuanzi.vue'
import BlogPostMeta from './components/BlogPostMeta.vue'
import BlogPostNav from './components/BlogPostNav.vue'
import './style/vars.css'

const enhanced = {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      'doc-before': () => {
        const { frontmatter } = useData()
        if (frontmatter.value.blogPost) {
          return h(BlogPostMeta)
        }
        return null
      },
      'doc-after': () => {
        const { frontmatter } = useData()
        const showComments = frontmatter.value.comment !== false
        const children = [h(Busuanzi)]
        if (frontmatter.value.blogPost) {
          children.unshift(h(BlogPostNav))
        }
        if (showComments) {
          children.push(h(GiscusComment))
        }
        return children
      },
    })
  },
} satisfies Theme

export default withBlogTheme(enhanced)
