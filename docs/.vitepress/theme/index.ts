// 主题入口 — 通过 VitePress 插槽机制注册自定义组件
import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import { useData } from 'vitepress'
import type { Theme } from 'vitepress'
import Busuanzi from './components/Busuanzi.vue'
import GiscusComment from './components/GiscusComment.vue'
import BlogPostMeta from './components/BlogPostMeta.vue'
import BlogPostNav from './components/BlogPostNav.vue'
import BlogList from './components/BlogList.vue'
import BackToTop from './components/BackToTop.vue'
import LoadingBar from './components/LoadingBar.vue'
import FloatingToc from './components/FloatingToc.vue'
import LightboxGallery from './components/LightboxGallery.vue'
import './style/light.css'
import './style/dark.css'

// ========== 主题配置 ==========
export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      // 正文前插槽：文章元信息（面包屑、标题、标签等），有标签或 blogPost 标记的页面均展示
      'doc-before': () => {
        const { page, frontmatter } = useData()
        if (frontmatter.value.blogPost || frontmatter.value.tags?.length) {
          return h(BlogPostMeta, { key: page.value.relativePath || '' })
        }
        return null
      },

      // 正文后插槽：上下篇导航 + Giscus 评论
      'doc-after': () => {
        const { page, frontmatter } = useData()
        const pageKey = page.value.relativePath || ''
        const showComments = frontmatter.value.comment !== false
        const showNav = frontmatter.value.blogPost || frontmatter.value.tags?.length
        const children: any[] = []
        if (showNav) {
          children.push(h(BlogPostNav, { key: pageKey }))
        }
        if (showComments) {
          children.push(h(GiscusComment, { key: pageKey + '-comment' }))
        }
        return children.length ? children : null
      },
      // 布局顶部：加载进度条 + 回到顶部按钮 + 站点统计（通过 DOM 注入到页脚）
      'layout-top': () => [h(LoadingBar), h(BackToTop), h(FloatingToc), h(Busuanzi)],
    })
  },
  // ========== 全局注册 ==========
  // 全局注册 BlogList 组件，供 Markdown 中通过 <BlogList /> 调用
  enhanceApp({ app }) {
    app.component('BlogList', BlogList)
    app.component('LightboxGallery', LightboxGallery)
  },
} satisfies Theme