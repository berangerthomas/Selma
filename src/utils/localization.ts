// Use Vite's meta.glob to automatically detect locale directories at build time
const locales = import.meta.glob('../../public/locales/*/common.json')

export const supportedLanguages = Object.keys(locales)
  .map((path) => {
    const match = path.match(/locales\/([^/]+)\/common\.json$/)
    return match ? match[1] : null
  })
  .filter(Boolean) as string[]

export type SupportedLanguage = string

export const defaultLanguage: SupportedLanguage = supportedLanguages.includes('en') ? 'en' : supportedLanguages[0]

const languagePattern = supportedLanguages.join('|')

export const translatedMarkdownPathPattern = new RegExp(`^/details/(${languagePattern})/(.+)$`)
export const rootMarkdownPathPattern = /^\/details\/([^/]+)$/

export function isSupportedLanguage(language: string): language is SupportedLanguage {
  return supportedLanguages.includes(language as SupportedLanguage)
}

export function getNextSupportedLanguage(currentLanguage: string): SupportedLanguage {
  const currentIndex = supportedLanguages.findIndex((language) => language === currentLanguage)
  const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % supportedLanguages.length : 0
  return supportedLanguages[nextIndex]
}

export function buildMarkdownPath(language: SupportedLanguage, nodeId: string) {
  return `/details/${language}/${nodeId}.md`
}

export function replaceMarkdownLanguage(path: string, language: SupportedLanguage) {
  const translatedMatch = path.match(translatedMarkdownPathPattern)
  if (translatedMatch) {
    return `/details/${language}/${translatedMatch[2]}`
  }

  const rootMatch = path.match(rootMarkdownPathPattern)
  if (rootMatch) {
    return `/details/${language}/${rootMatch[1]}`
  }

  return path
}

export function stripMarkdownLanguage(path: string) {
  const translatedMatch = path.match(translatedMarkdownPathPattern)
  return translatedMatch ? `/details/${translatedMatch[2]}` : path
}