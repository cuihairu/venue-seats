import DefaultTheme from 'vitepress/theme'
import './custom.css'

const LANG_KEY = 'vs-docs-lang'
// must match `base` in docs/.vitepress/config.mts; scripts/check-pages.mjs guards it
const BASE = '/venue-seats/'

const isZhPage = (href: string) => href.startsWith(`${BASE}zh/`)
const browserPrefersZh = () =>
  (navigator.languages ?? [navigator.language]).some((lang) => lang.toLowerCase().startsWith('zh'))

export default {
  ...DefaultTheme,
  enhanceApp({ router }) {
    if (typeof window === 'undefined' || !router) return
    const remember = (href: string) => localStorage.setItem(LANG_KEY, isZhPage(href) ? 'zh' : 'en')
    // A first visit without a stored choice follows the browser language; the
    // choice is remembered, so every later manual switch always wins.
    if (!localStorage.getItem(LANG_KEY) && browserPrefersZh() && !isZhPage(window.location.pathname)) {
      const tail = window.location.pathname.startsWith(BASE)
        ? window.location.pathname.slice(BASE.length)
        : window.location.pathname.replace(/^\//, '')
      const target = `${BASE}zh/${tail}${window.location.hash}`
      remember(target)
      router.go(target)
    } else {
      remember(window.location.pathname)
    }
    router.onAfterRouteChanged = (to) => remember(to)
  },
}
