import zh, { messages as zhMessages } from './zh'
import en, { messages as enMessages } from './en'
import ja, { messages as jaMessages } from './ja'

export type Locale = 'zh' | 'en' | 'ja'

export interface LocaleData {
  key: string
  label: string
  lang: string
  description: string
  nav: { text: string; link: string }[]
  outlineLabel: string
  editText: string
  lastUpdatedText: string
  docFooterPrev: string
  docFooterNext: string
  darkModeSwitchLabel: string
  sidebarMenuLabel: string
  returnToTopLabel: string
  notFound: { title: string; quote: string; linkLabel: string; linkText: string }
  search: { buttonText: string; buttonAriaLabel: string; noResultsText: string; resetButtonTitle: string; selectText: string; navigateText: string; closeText: string }
}

export const LOCALE_DATA: LocaleData[] = [zh, en, ja]

export const MESSAGES: Record<Locale, Record<string, Record<string, string>>> = {
  zh: zhMessages,
  en: enMessages,
  ja: jaMessages,
}

export function buildLocaleConfig(d: LocaleData) {
  return {
    label: d.label,
    lang: d.lang,
    title: "Ywpc's Blog",
    description: d.description,
    themeConfig: {
      nav: d.nav,
      outline: { level: [2, 3], label: d.outlineLabel },
      editLink: { pattern: 'https://github.com/100pangci/Blog-ywpc/edit/main/docs/:path', text: d.editText },
      lastUpdated: { text: d.lastUpdatedText, formatOptions: { dateStyle: 'short' as const, timeStyle: 'short' as const } },
      docFooter: { prev: d.docFooterPrev, next: d.docFooterNext },
      darkModeSwitchLabel: d.darkModeSwitchLabel,
      sidebarMenuLabel: d.sidebarMenuLabel,
      returnToTopLabel: d.returnToTopLabel,
      notFound: d.notFound,
    },
  }
}
