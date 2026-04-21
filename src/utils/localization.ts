// Use Vite's meta.glob to automatically detect locale directories at build time
// checking any json file so it catches either taxonomy.json or ui.json
const localesFiles = import.meta.glob('../../public/locales/*/*.json')

export const supportedLanguages = Array.from(
  new Set(
    Object.keys(localesFiles)
      .map((path) => {
        const match = path.match(/locales\/([^/]+)\/[^/]+\.json$/)
        return match ? match[1] : null
      })
      .filter(Boolean) as string[]
  )
)

export type SupportedLanguage = string

// S'il n'y a aucune langue détectée, on utilise 'en' par défaut
export const defaultLanguage: SupportedLanguage = supportedLanguages.includes('en')
  ? 'en'
  : (supportedLanguages.length > 0 ? supportedLanguages[0] : 'en')

const languagePattern = supportedLanguages.length > 0 ? supportedLanguages.join('|') : 'en'

export const translatedMarkdownPathPattern = new RegExp(`^/details/(${languagePattern})/(.+)$`)
export const rootMarkdownPathPattern = /^\/details\/([^/]+)$/

export function isSupportedLanguage(language: string): language is SupportedLanguage {
  return supportedLanguages.length === 0 ? language === 'en' : supportedLanguages.includes(language as SupportedLanguage)
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