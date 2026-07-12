<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { onContentUpdated } from 'vitepress'
import { useData } from 'vitepress'
import { useI18n } from '../composables/useI18n'

const { frontmatter, theme } = useData()
const { t } = useI18n()

interface HeaderItem {
  element: HTMLHeadingElement
  title: string
  link: string
  level: number
  children: HeaderItem[]
}

const headers = ref<HeaderItem[]>([])
const open = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

onContentUpdated(() => {
  headers.value = getHeaders(frontmatter.value.outline ?? theme.value.outline)
  open.value = false
})

function getHeaders(range: any): HeaderItem[] {
  const els = [
    ...document.querySelectorAll<HTMLHeadingElement>('.VPDoc :where(h1,h2,h3,h4,h5,h6)')
  ].filter(el => el.id && el.hasChildNodes())

  const items = els.map(el => {
    const level = Number(el.tagName[1])
    let title = ''
    for (const node of el.childNodes) {
      if (node.nodeType === 1) {
        const cn = (node as HTMLElement).className
        if (/\b(?:VPBadge|header-anchor|footnote-ref|ignore-header)\b/.test(cn)) continue
        title += (node as HTMLElement).textContent
      } else if (node.nodeType === 3) {
        title += node.textContent
      }
    }
    return { element: el, title, link: '#' + el.id, level, children: [] }
  })

  return buildTree(items, range)
}

function buildTree(data: HeaderItem[], range: any): HeaderItem[] {
  if (range === false) return []
  const levelsRange = (typeof range === 'object' && !Array.isArray(range) ? range.level : range) || 2
  const [high, low] = typeof levelsRange === 'number'
    ? [levelsRange, levelsRange]
    : levelsRange === 'deep' ? [2, 6] : levelsRange

  const result: HeaderItem[] = []
  const stack: HeaderItem[] = []

  for (const item of data) {
    const node = { ...item, children: [] }
    if (node.level > low || node.level < high) continue
    let parent = stack[stack.length - 1]
    while (parent && parent.level >= node.level) {
      stack.pop()
      parent = stack[stack.length - 1]
    }
    if (parent) parent.children.push(node)
    else result.push(node)
    stack.push(node)
  }
  return result
}

function toggle() {
  open.value = !open.value
  if (open.value) {
    nextTick(() => {
      const dd = dropdownRef.value
      if (!dd) return
      dd.style.removeProperty('left')
      dd.style.removeProperty('right')
      dd.style.removeProperty('transform')
      dd.style.removeProperty('max-height')

      const btnRect = dd.parentElement!.getBoundingClientRect()
      const spaceBelow = window.innerHeight - btnRect.bottom - 12
      dd.style.maxHeight = Math.min(360, Math.max(160, spaceBelow)) + 'px'

      const rect = dd.getBoundingClientRect()
      if (rect.left < 8) {
        dd.style.left = '8px'
        dd.style.right = 'auto'
        dd.style.transform = 'none'
      } else if (rect.right > window.innerWidth - 8) {
        dd.style.left = 'auto'
        dd.style.right = '8px'
        dd.style.transform = 'none'
      }
    })
  }
}

function onClickOutside(e: Event) {
  if (!(e.target as HTMLElement).closest('.blog-outline')) {
    open.value = false
  }
}

watch(open, (val) => {
  if (val) {
    document.addEventListener('click', onClickOutside)
  } else {
    document.removeEventListener('click', onClickOutside)
  }
})

</script>

<template>
  <span v-if="headers.length > 0" class="blog-outline">
    <button class="blog-outline-btn" :class="{ open }" @click="toggle">
      {{ t('postMeta.outline') }}
      <span class="vpi-chevron-right blog-outline-icon" />
    </button>
    <Transition name="outline-fade">
      <div v-if="open" ref="dropdownRef" class="blog-outline-dropdown" @click="open = false">
        <div class="blog-outline-body">
          <template v-for="h in headers" :key="h.link">
            <a :href="h.link" class="blog-outline-link" :class="{ 'blog-outline-nested': h.level > 2 }">{{ h.title }}</a>
            <a
              v-for="child in h.children"
              :key="child.link"
              :href="child.link"
              class="blog-outline-link blog-outline-nested"
            >{{ child.title }}</a>
          </template>
        </div>
      </div>
    </Transition>
  </span>
</template>

