import React, { useEffect, useState, Suspense } from 'react'
const MarkdownRenderer = React.lazy(() => import('../components/MarkdownRenderer'))
import { useI18n } from '../i18n'
import { useTheme } from '../hooks/useTheme'

export default function MarkdownViewerPage() {
  const params = new URLSearchParams(window.location.search)
  const initialPath = params.get('path') || ''
  const sanitize = params.get('sanitize') !== '0'

  const [currentPath, setCurrentPath] = useState<string>(initialPath)
  const [markdown, setMarkdown] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

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
        if (!res.ok && currentPath.match(/^\/details\/(en|fr)\//)) {
          const fallbackPath = currentPath.replace(/^\/details\/(en|fr)\//, '/details/')
          res = await fetch(fallbackPath)
          if (!mounted) return
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

  function toggleLang() {
    const newLang = lang === 'en' ? 'fr' : 'en'
    setLang(newLang)

    // Si le chemin actuel est un document traduit (ex: /details/fr/nom_fichier.md), on l'adapte
    let match = currentPath.match(/^\/details\/(en|fr)\/(.+)$/)
    if (match) {
      const newPath = `/details/${newLang}/${match[2]}`
      setCurrentPath(newPath)
      updateUrlPath(newPath)
      return
    }

    // Cas où le chemin serait directement /details/nom_fichier.md
    match = currentPath.match(/^\/details\/(.+)$/)
    if (match) {
      const newPath = `/details/${newLang}/${match[1]}`
      setCurrentPath(newPath)
      updateUrlPath(newPath)
    }
  }

  if (error) {
    return <div className="min-h-screen p-6"><div className="text-red-600">{error}</div></div>
  }

  return (
    <div style={{ background: "transparent", color: "var(--text-main)" }} className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 relative">
      <div style={{ position: 'fixed', top: '18px', left: '18px', zIndex: 50, display: 'flex', gap: '8px' }}>
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
        {isDark ? '🌙' : '☀️'}
      </button>
      </div>

      {/*
        C'est ICI que tu contrôles la largeur globale du texte de ton onglet :
        Tu peux ajuster la valeur "800px" à la hausse ou à la baisse selon ta convenance !
      */}
      <main id="viewer" className="mx-auto w-full" style={{ maxWidth: '700px' }}>
        <Suspense fallback={<div>*Chargement…*</div>}>
          <MarkdownRenderer
            content={markdown || '*Chargement…*'}
            sanitize={sanitize}
            className="max-w-none lg:prose-lg dark:prose-invert"
          />
        </Suspense>
      </main>
    </div>
  )
}
