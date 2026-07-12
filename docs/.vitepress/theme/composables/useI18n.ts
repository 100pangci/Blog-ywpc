import { computed } from 'vue'
import { useData } from 'vitepress'
import { MESSAGES } from '../../i18n'
import type { Locale } from '../../i18n'

// ========== useI18n 组合式函数 ==========
export function useI18n() {
  const { lang } = useData()

  const locale = computed<Locale>(() => {
    const l = lang.value || 'zh-CN'
    if (l.startsWith('en')) return 'en'
    if (l.startsWith('ja')) return 'ja'
    return 'zh'
  })

  function t(key: string, vars?: Record<string, string | number>): string {
    const keys = key.split('.')
    let msg: any = MESSAGES[locale.value]
    for (const k of keys) {
      msg = msg?.[k]
      if (msg === undefined) return key
    }
    if (typeof msg !== 'string') return key
    if (!vars) return msg
    return Object.entries(vars).reduce((acc, [k, v]) => acc.replace(`{${k}}`, String(v)), msg)
  }

  return { locale, t }
}
