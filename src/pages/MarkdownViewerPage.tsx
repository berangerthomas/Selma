import React, { useState, useEffect, Suspense, useRef } from 'react'
const TabbedMarkdown = React.lazy(() => import('../components/TabbedMarkdown'))
import { useI18n } from '../i18n'
import { useTheme } from '../hooks/useTheme'
import { useTextSize } from '../hooks/useTextSize'
import { replaceMarkdownLanguage, stripMarkdownLanguage, supportedLanguages } from '../utils/localization'
import { PrintMarkdownButton } from '../components/PrintMarkdownButton'
import ThemeIcon from '../components/icons/ThemeIcon'
import LangMenu from '../components/LangMenu'
import { useTaxonomyData } from '../hooks/useTaxonomyData'
import { findNodeById } from '../utils/treeUtils'
import AttachmentList from '../components/AttachmentList'

function isHtmlResponse(r: Response): boolean {
  return r?.ok && (r.headers?.get('content-type')?.includes('text/html') ?? false)
}

export default function MarkdownViewerPage() {
  const params = new URLSearchParams(window.location.search)
  const initialPath = params.get('path') || ''
  const sanitize = params.get('sanitize') !== '0'
  const initialView = params.get('view') === 'linear' ? 'linear' : 'tabs'
  const nodeId = params.get('nodeId')

  const [currentPath, setCurrentPath] = useState<string>(initialPath)
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [isFallback, setIsFallback] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [presentationMode, setPresentationMode] = useState<'tabs' | 'linear'>(initialView)

  const { lang, setLang, t } = useI18n()
  const { isDark, toggleTheme } = useTheme()
  const { textSizeClass, increaseSize, decreaseSize, canIncrease, canDecrease } = useTextSize()
  const contentRef = useRef<HTMLDivElement>(null)

  const { data: treeData } = useTaxonomyData()
  const node = treeData && nodeId ? findNodeById(treeData, nodeId) : null

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

        // If no translation is found (or it serves index.html), fall back to the root path
        if (!res.ok || isHtmlResponse(res)) {
          const fallbackPath = stripMarkdownLanguage(currentPath)
          if (fallbackPath !== currentPath) {
            res = await fetch(fallbackPath)
            if (!mounted) return
          }
        }

        if (!res.ok || isHtmlResponse(res)) {
          // Trigger dynamic fallback rendering
          setIsFallback(true)
          setError(null)
          return
        }

        const md = await res.text()
        if (!mounted) return
        setFileContent(md)
        setIsFallback(false)
        setError(null)
      } catch (err) {
        if (!mounted) return
        // Catch network errors and still show the nice fallback
        setIsFallback(true)
        setError(null)
      }
    })()

    return () => { mounted = false }
  }, [currentPath, t])
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

  // Construct content dynamically
  let displayMarkdown = ''
  if (isFallback) {
    const title = node?.name ? t(`nodes.${node?.id}.name`, { defaultValue: node.name }) : (nodeId || currentPath)
    displayMarkdown = `# ${title}\n\n*${t('description_not_provided', { defaultValue: 'No description provided.' })}*`
  } else {
    displayMarkdown = fileContent || `*${t('loading', { defaultValue: 'Loading...' })}*`
  }

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
          className="p-[6px] cursor-pointer bg-white/80 dark:bg-neutral-800/80 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded transition-colors backdrop-blur-sm border border-neutral-200 dark:border-neutral-700 shadow-sm"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', color: 'inherit', fontSize: '18px' }}
        >
          {presentationMode === 'tabs' ? '▦' : '≡'}
        </button>
        
        {supportedLanguages.length > 1 && (
          <LangMenu 
            lang={lang} 
            supportedLanguages={supportedLanguages} 
            onSelect={changeLang} 
            buttonClassName="p-[6px] cursor-pointer bg-white/80 dark:bg-neutral-800/80 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded transition-colors backdrop-blur-sm border border-neutral-200 dark:border-neutral-700 shadow-sm h-full"
          />
        )}

        <button
          onClick={toggleTheme}
          aria-label={t('toggle_theme', { defaultValue: 'Toggle Theme' })}
          title={t('toggle_theme', { defaultValue: 'Toggle Theme' })}
          className="p-[6px] cursor-pointer bg-white/80 dark:bg-neutral-800/80 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded transition-colors backdrop-blur-sm border border-neutral-200 dark:border-neutral-700 shadow-sm"
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
          className="p-[6px] cursor-pointer bg-white/80 dark:bg-neutral-800/80 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded transition-colors backdrop-blur-sm border border-neutral-200 dark:border-neutral-700 shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', color: 'inherit', fontSize: '13px', fontWeight: 'bold' }}
        >
          A-
        </button>
        <button
          onClick={increaseSize}
          disabled={!canIncrease}
          title={t('increase_text_size', { defaultValue: 'Increase text' })}
          className="p-[6px] cursor-pointer bg-white/80 dark:bg-neutral-800/80 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded transition-colors backdrop-blur-sm border border-neutral-200 dark:border-neutral-700 shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', color: 'inherit', fontSize: '15px', fontWeight: 'bold' }}
        >
          A+
        </button>
      </div>

      {/* This controls the global text width of the tab. You can adjust the "800px" value up or down as needed! */}
      <main id="viewer" ref={contentRef} className="mx-auto w-full" style={{ maxWidth: '700px' }}>
        {node?.attachments && node.attachments.length > 0 && (
          <div className="mb-2 pb-2 border-b border-gray-200 dark:border-neutral-700">
            <AttachmentList attachments={node.attachments} lang={lang || undefined} compact />
          </div>
        )}
        <Suspense fallback={<div>*{t('loading', { defaultValue: 'Loading...' })}*</div>}>
          <TabbedMarkdown
            key={stripMarkdownLanguage(currentPath)}
            content={displayMarkdown}
            className={`max-w-none dark:prose-invert ${textSizeClass}`}
            proseSize={textSizeClass as any}
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
