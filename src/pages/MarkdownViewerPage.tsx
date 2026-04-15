import React, { useState, useEffect, Suspense, useRef } from 'react'
const TabbedMarkdown = React.lazy(() => import('../components/TabbedMarkdown'))
import { useI18n } from '../i18n'
import { useTheme } from '../hooks/useTheme'
import { useTextSize } from '../hooks/useTextSize'
import { replaceMarkdownLanguage, stripMarkdownLanguage, supportedLanguages } from '../utils/localization'
import { PrintMarkdownButton } from '../components/PrintMarkdownButton'

const ThemeIcon = ({ isDark }: { isDark: boolean }) => (
  !isDark ? (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] block">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] block">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
)

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
  const { textSizeClass, increaseSize, decreaseSize, canIncrease, canDecrease } = useTextSize()
  const contentRef = useRef<HTMLDivElement>(null)
  const [showLangMenu, setShowLangMenu] = useState(false)

  useEffect(() => {
    let mounted = true
    if (!currentPath) {
      setError(t('no_path_specified', { defaultValue: 'No path specified.' }))
      return
    }

    ;(async () => {
      try {
        let res = await fetch(currentPath)
        if (!mounted) return

        // If no translation is found, fall back to the root path
        if (!res.ok) {
          const fallbackPath = stripMarkdownLanguage(currentPath)
          if (fallbackPath !== currentPath) {
            res = await fetch(fallbackPath)
            if (!mounted) return
          }
        }

        if (!res.ok) {
          setError(`${t('file_not_found', { defaultValue: 'File not found:' })} ${currentPath}`)
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

  function changeLang(newLang: string) {
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

  // Label reflects the current presentation mode (icon shows current state)
  const viewModeLabel = presentationMode === 'linear'
    ? t('markdown_view_linear', { defaultValue: 'Linear view' })
    : t('markdown_view_tabs', { defaultValue: 'Tabbed view' })

  if (error) {
    return <div className="min-h-screen p-6"><div className="text-red-600">{error}</div></div>
  }

  return (
    <div style={{ background: "transparent", color: "var(--text-main)" }} className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 relative">
      <div style={{ position: 'fixed', top: '18px', left: '18px', zIndex: 50, display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={togglePresentationMode}
          aria-label={viewModeLabel}
          title={viewModeLabel}
          className="p-[6px] bg-white/80 dark:bg-neutral-800/80 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded transition-colors backdrop-blur-sm border border-neutral-200 dark:border-neutral-700 shadow-sm"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', color: 'inherit', fontSize: '18px' }}
        >
          {presentationMode === 'tabs' ? '▦' : '≡'}
        </button>
        
        <div 
          className="relative flex items-center h-[32px]"
          onMouseEnter={() => setShowLangMenu(true)}
          onMouseLeave={() => setShowLangMenu(false)}
        >
          <button
            aria-label={t('change_language', { defaultValue: 'Language' })}
            title={t('change_language', { defaultValue: 'Language' }) + `: ${lang.toUpperCase()}`}
            className="p-[6px] bg-white/80 dark:bg-neutral-800/80 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded transition-colors backdrop-blur-sm border border-neutral-200 dark:border-neutral-700 shadow-sm h-full"
            style={{ fontSize: '13px', fontWeight: 'bold', width: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'inherit', cursor: 'default' }}
          >
            {lang.toUpperCase()}
          </button>

          {showLangMenu && (
            <div 
              className="absolute top-full left-0 pt-1 z-50"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="py-1 min-w-[50px] bg-[var(--panel-bg)] border border-[var(--border-color)] shadow-[0_4px_12px_var(--toolbar-shadow)] rounded-md flex flex-col backdrop-blur-md">
                {supportedLanguages.map(l => (
                  <button
                    key={l}
                    onClick={() => changeLang(l)}
                    className={`w-full py-1.5 px-3 text-[13px] font-bold bg-transparent border-none cursor-pointer transition-colors
                      ${l === lang 
                        ? 'text-blue-500 dark:text-blue-400' 
                        : 'text-[var(--text-muted)] hover:text-blue-500 dark:hover:text-blue-400'
                      }`}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={toggleTheme}
          aria-label={t('toggle_theme', { defaultValue: 'Toggle Theme' })}
          title={t('toggle_theme', { defaultValue: 'Toggle Theme' })}
          className="p-[6px] bg-white/80 dark:bg-neutral-800/80 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded transition-colors backdrop-blur-sm border border-neutral-200 dark:border-neutral-700 shadow-sm"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', color: 'inherit' }}
        >
          <ThemeIcon isDark={isDark} />
        </button>
        
        <PrintMarkdownButton
          contentRef={contentRef}
          title={`${t('document', { defaultValue: 'Document' })} ${currentPath}`}
          className="!bg-white/80 dark:!bg-neutral-800/80 hover:!bg-neutral-100 dark:hover:!bg-neutral-700 backdrop-blur-sm border border-neutral-200 dark:border-neutral-700 shadow-sm !w-[32px] !h-[32px]"
        />
        {/*
          This is where you control the global text width of the viewer:
          You can adjust the "800px" value up or down to suit your preference.
        */}
        <button
          onClick={decreaseSize}
          disabled={!canDecrease}
          title={t('decrease_text_size', { defaultValue: 'Decrease text' })}
          className="p-[6px] bg-white/80 dark:bg-neutral-800/80 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded transition-colors backdrop-blur-sm border border-neutral-200 dark:border-neutral-700 shadow-sm disabled:opacity-30"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', color: 'inherit', fontSize: '13px', fontWeight: 'bold' }}
        >
          A-
        </button>
        <button
          onClick={increaseSize}
          disabled={!canIncrease}
          title={t('increase_text_size', { defaultValue: 'Increase text' })}
          className="p-[6px] bg-white/80 dark:bg-neutral-800/80 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded transition-colors backdrop-blur-sm border border-neutral-200 dark:border-neutral-700 shadow-sm disabled:opacity-30"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', color: 'inherit', fontSize: '15px', fontWeight: 'bold' }}
        >
          A+
        </button>
      </div>

      {/*
        C'est ICI que tu contrôles la largeur globale du texte de ton onglet :
        Tu peux ajuster la valeur "800px" à la hausse ou à la baisse selon ta convenance !
      */}
      <main id="viewer" ref={contentRef} className="mx-auto w-full" style={{ maxWidth: '700px' }}>
        <Suspense fallback={<div>*{t('loading', { defaultValue: 'Loading...' })}*</div>}>
          <TabbedMarkdown
            key={stripMarkdownLanguage(currentPath)}
            content={markdown || `*${t('loading', { defaultValue: 'Loading...' })}*`}
            className={`max-w-none dark:prose-invert ${textSizeClass}`}
            sanitize={sanitize}
            presentationMode={presentationMode}
            introClassName="mb-20"
            basePath={currentPath}
          />
        </Suspense>
      </main>
    </div>
  )
}
