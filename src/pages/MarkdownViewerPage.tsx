import React, { useEffect, useState, Suspense } from 'react'
const TabbedMarkdown = React.lazy(() => import('../components/TabbedMarkdown'))
import { useI18n } from '../i18n'
import { useTheme } from '../hooks/useTheme'
import { getNextSupportedLanguage, replaceMarkdownLanguage, stripMarkdownLanguage } from '../utils/localization'

export default function MarkdownViewerPage() {
  const params = new URLSearchParams(window.location.search)
  const initialPath = params.get('path') || ''
  const sanitize = params.get('sanitize') !== '0'
  const initialView = params.get('view') === 'linear' ? 'linear' : 'tabs'

  const [currentPath, setCurrentPath] = useState<string>(initialPath)
  const [markdown, setMarkdown] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [presentationMode, setPresentationMode] = useState<'tabs' | 'linear'>(initialView)

  const { lang, setLang, t } = useI18n()
  const { isDark, toggleTheme } = useTheme()

  useEffect(() => {
    let mounted = true
    if (!currentPath) {
      setError('Aucun chemin spécifié.')
      return
    }

    ;(async () => {
      try {
        let res = await fetch(currentPath)
        if (!mounted) return

        // S'il ne trouve pas la trad, on fallback sur la racine au cas où
        if (!res.ok) {
          const fallbackPath = stripMarkdownLanguage(currentPath)
          if (fallbackPath !== currentPath) {
            res = await fetch(fallbackPath)
            if (!mounted) return
          }
        }

        if (!res.ok) {
          setError(`Fichier introuvable: ${currentPath}`)
          return
        }
        const md = await res.text()
        if (!mounted) return
        setMarkdown(md)
        setError(null)
      } catch (err) {
        if (!mounted) return
        setError(String(err))
      }
    })()

    return () => { mounted = false }
  }, [currentPath])

  function updateUrlPath(newPath: string) {
    const newUrl = new URL(window.location.href)
    newUrl.searchParams.set('path', newPath)
    window.history.replaceState(null, '', newUrl.toString())
  }

  function updateUrlView(newView: 'tabs' | 'linear') {
    const newUrl = new URL(window.location.href)
    newUrl.searchParams.set('view', newView)
    window.history.replaceState(null, '', newUrl.toString())
  }

  function toggleLang() {
    const newLang = getNextSupportedLanguage(lang)
    setLang(newLang)

    const newPath = replaceMarkdownLanguage(currentPath, newLang)
    if (newPath !== currentPath) {
      setCurrentPath(newPath)
      updateUrlPath(newPath)
    }
  }

  function togglePresentationMode() {
    setPresentationMode((prev) => {
      const next = prev === 'tabs' ? 'linear' : 'tabs'
      updateUrlView(next)
      return next
    })
  }

  const viewModeLabel = presentationMode === 'tabs'
    ? t('markdown_view_linear', { defaultValue: 'Vue linéaire' })
    : t('markdown_view_tabs', { defaultValue: 'Avec onglets' })

  if (error) {
    return <div className="min-h-screen p-6"><div className="text-red-600">{error}</div></div>
  }

  return (
    <div style={{ background: "transparent", color: "var(--text-main)" }} className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 relative">
      <div style={{ position: 'fixed', top: '18px', left: '18px', zIndex: 50, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={toggleLang}
            aria-label={t('change_language', { defaultValue: 'Traduction' })}
            title={t('change_language', { defaultValue: 'Traduction' }) + `: ${lang.toUpperCase()}`}
            className="translate-btn"
            style={{ position: 'static' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="translate-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">     
              <path d="M12 2v20M2 12h20" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span className="hidden sm:inline">{t('change_language', { defaultValue: 'Traduction' })}:</span>   
            <span className="translate-lang">{lang.toUpperCase()}</span>
          </button>

          <button
            onClick={toggleTheme}
            aria-label="Toggle Theme"
            className="translate-btn"
            style={{ position: 'static', padding: '6px 10px', fontSize: '16px' }}
          >
            {isDark ? '☀️' : '🌙'}
          </button>
        </div>

        <button
          onClick={togglePresentationMode}
          aria-label={viewModeLabel}
          title={viewModeLabel}
          className="translate-btn"
          style={{ position: 'static', alignSelf: 'flex-start' }}
        >
          <span aria-hidden="true">{presentationMode === 'tabs' ? '≡' : '▦'}</span>
          <span className="translate-lang">{viewModeLabel}</span>
        </button>
      </div>

      {/*
        C'est ICI que tu contrôles la largeur globale du texte de ton onglet :
        Tu peux ajuster la valeur "800px" à la hausse ou à la baisse selon ta convenance !
      */}
      <main id="viewer" className="mx-auto w-full" style={{ maxWidth: '700px' }}>
        <Suspense fallback={<div>*Chargement…*</div>}>
          <TabbedMarkdown
            key={stripMarkdownLanguage(currentPath)}
            content={markdown || '*Chargement…*'}
            className="max-w-none lg:prose-lg dark:prose-invert"
            sanitize={sanitize}
            presentationMode={presentationMode}
            introClassName="mb-20"
          />
        </Suspense>
      </main>
    </div>
  )
}
