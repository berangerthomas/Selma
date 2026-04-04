import React from 'react'
import i18n from 'i18next'
import HttpApi from 'i18next-http-backend'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next, useTranslation } from 'react-i18next'

// Initialize i18next with HTTP backend (loads /locales/{{lng}}/{{ns}}.json)
i18n
  .use(HttpApi)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    supportedLngs: ['en', 'fr'],
    fallbackLng: 'en',
    ns: ['common'],
    defaultNS: 'common',
    backend: { loadPath: '/locales/{{lng}}/{{ns}}.json' },
    detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] },
    react: { useSuspense: false },
    interpolation: { escapeValue: false }
  })

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng
  localStorage.setItem('i18nextLng', lng)
})

// Initialize lang attribute right away
const initialLang = i18n.language || localStorage.getItem('i18nextLng') || 'fr'
if (!i18n.language) {
  i18n.changeLanguage(initialLang)
}
document.documentElement.lang = initialLang

export function useI18n() {
  const { t, i18n: instance } = useTranslation()
  const lang = instance.language || 'en'
  const setLang = (l: string) => {
    instance.changeLanguage(l)
  }
  return { lang, setLang, t }
}

export default i18n

