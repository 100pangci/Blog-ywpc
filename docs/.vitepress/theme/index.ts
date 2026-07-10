// 主题入口 — 通过 VitePress 插槽机制注册自定义组件
import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import { useData } from 'vitepress'
import type { Theme } from 'vitepress'
import GiscusComment from './components/GiscusComment.vue'
import Busuanzi from './components/Busuanzi.vue'
import BlogPostMeta from './components/BlogPostMeta.vue'
import BlogPostNav from './components/BlogPostNav.vue'
import BlogList from './components/BlogList.vue'
import BackToTop from './components/BackToTop.vue'
import LoadingBar from './components/LoadingBar.vue'
import './style/vars.css'

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      // 正文前插槽：文章元信息（面包屑、标题、标签等），仅 blogPost 页面
      'doc-before': () => {
        const { frontmatter } = useData()
        if (frontmatter.value.blogPost) {
          return h(BlogPostMeta)
        }
        return null
      },
      // 正文后插槽：上下篇导航 + 计数 + Giscus 评论
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
      // 布局顶部：加载进度条 + 回到顶部按钮
      'layout-top': () => [h(LoadingBar), h(BackToTop)],
    })
  },
  // 全局注册 BlogList 组件，供 Markdown 中通过 <BlogList /> 调用
  enhanceApp({ app }) {
    app.component('BlogList', BlogList)
  },
} satisfies Theme