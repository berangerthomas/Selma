import React, { useEffect, useRef, useState, RefObject } from 'react'
import { useI18n } from '../i18n'
import { useTheme } from '../hooks/useTheme'
import { supportedLanguages } from '../utils/localization'
import { PrintAndExportButtons } from './PrintButton'

type Props = {
  onCollapseAll: () => void
  onExpandAll?: () => void
  onSearch: (query: string) => void
  onNextResult?: () => void
  onPrevResult?: () => void
  currentResultIndex?: number
  totalResults?: number
  onResetView?: () => void
  svgRef?: RefObject<SVGSVGElement | null>
  canGoBack?: boolean
  canGoForward?: boolean
  onGoBack?: () => void
  onGoForward?: () => void
}

const ExpandIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] block">
    <polyline points="15 3 21 3 21 9" />
    <line x1="14" y1="10" x2="21" y2="3" />
    <polyline points="9 21 3 21 3 15" />
    <line x1="10" y1="14" x2="3" y2="21" />
    <polyline points="21 15 21 21 15 21" />
    <line x1="14" y1="14" x2="21" y2="21" />
    <polyline points="3 9 3 3 9 3" />
    <line x1="10" y1="10" x2="3" y2="3" />
  </svg>
)

const CollapseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] block">
    <polyline points="19 14 14 14 14 19" />
    <line x1="21" y1="21" x2="14" y2="14" />
    <polyline points="5 10 10 10 10 5" />
    <line x1="3" y1="3" x2="10" y2="10" />
    <polyline points="14 5 14 10 19 10" />
    <line x1="21" y1="3" x2="14" y2="10" />
    <polyline points="10 19 10 14 5 14" />
    <line x1="3" y1="21" x2="10" y2="14" />
  </svg>
)

const ArrowRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] block">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
)

const FitView = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] block">
    <rect x="3" y="3" width="18" height="18" rx="3" ry="3" />
  </svg>
)

const ArrowLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] block">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
)

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

export default function Toolbar({ 
  onCollapseAll, 
  onExpandAll, 
  onSearch, 
  onNextResult, 
  onPrevResult, 
  onResetView, 
  currentResultIndex = -1, 
  totalResults = 0, 
  svgRef,
  canGoBack = false,
  canGoForward = false,
  onGoBack,
  onGoForward
}: Props) {
  const { lang, setLang, t } = useI18n()
  const [pos, setPos] = useState({ left: 12, top: 12 })
  const dragging = useRef(false)
  const startRef = useRef({ x: 0, y: 0, left: 12, top: 12 })
  const [query, setQuery] = useState('')
  const { isDark, toggleTheme } = useTheme()
  const [showLangMenu, setShowLangMenu] = useState(false)

  function onHeaderPointerDown(e: React.MouseEvent) {
    e.preventDefault()
    dragging.current = true
    startRef.current = { x: e.clientX, y: e.clientY, left: pos.left, top: pos.top }
    document.body.style.userSelect = 'none'

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return
      const nx = startRef.current.left + (ev.clientX - startRef.current.x)
      const ny = startRef.current.top + (ev.clientY - startRef.current.y)
      setPos({ left: Math.max(6, nx), top: Math.max(6, ny) })
    }
    const onUp = () => {
      dragging.current = false
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  function handleSearch() {
    const q = query.trim()
    if (!q) return
    onSearch(q)
  }

  const hasResults = totalResults > 0 && currentResultIndex >= 0

  return (
    <div
      className="floating-toolbar"
      style={{ left: pos.left, top: pos.top }}
      onMouseDown={(e) => e.stopPropagation()}
      role="region"
      aria-label={t('toolbar_title')}
    >
      <div className="toolbar-header" onMouseDown={onHeaderPointerDown} style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div className="toolbar-title">{t('toolbar_title')}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginRight: '6px', borderRight: '1px solid var(--border-color)', paddingRight: '6px' }}>
            <button
              className="p-[6px] bg-transparent rounded transition-colors"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: canGoBack ? 'inherit' : 'var(--text-muted)', opacity: canGoBack ? 1 : 0.4, border: 'none', cursor: canGoBack ? 'pointer' : 'default', width: '30px', height: '30px'
              }}
              title={t('go_back', { defaultValue: 'Previous' })}
              aria-label={t('go_back', { defaultValue: 'Previous' })}
              onClick={canGoBack ? onGoBack : undefined}
              onMouseDown={(e) => e.stopPropagation()}
              disabled={!canGoBack}
            >
              <ArrowLeftIcon />
            </button>
            <button
              className="p-[6px] bg-transparent rounded transition-colors"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: canGoForward ? 'inherit' : 'var(--text-muted)', opacity: canGoForward ? 1 : 0.4, border: 'none', cursor: canGoForward ? 'pointer' : 'default', width: '30px', height: '30px'
              }}
              title={t('go_forward', { defaultValue: 'Next' })}
              aria-label={t('go_forward', { defaultValue: 'Next' })}
              onClick={canGoForward ? onGoForward : undefined}
              onMouseDown={(e) => e.stopPropagation()}
              disabled={!canGoForward}
            >
              <ArrowRightIcon />
            </button>
          </div>

          <div 
            className="relative flex items-center h-[30px]"
            onMouseEnter={() => setShowLangMenu(true)}
            onMouseLeave={() => setShowLangMenu(false)}
          >
            <button 
              className="p-[6px] bg-transparent hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors h-full"
              title={t('change_language')} 
              aria-label={t('change_language')} 
              onMouseDown={(e) => e.stopPropagation()}
              style={{ fontSize: '13px', fontWeight: 'bold', width: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'inherit', border: 'none', cursor: 'default' }}
            >
              {lang.toUpperCase()}
            </button>
            
            {showLangMenu && (
              <div 
                className="absolute top-full right-0 pt-1 z-50"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="py-1 min-w-[50px] bg-[var(--panel-bg)] border border-[var(--border-color)] shadow-[0_4px_12px_var(--toolbar-shadow)] rounded-md flex flex-col backdrop-blur-md">
                  {supportedLanguages.map(l => (
                    <button
                      key={l}
                      onClick={() => setLang(l)}
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
            className="p-[6px] bg-transparent hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors"
            title={t('toggle_theme', { defaultValue: 'Toggle Theme' })} 
            aria-label={t('toggle_theme', { defaultValue: 'Toggle Theme' })} 
            onMouseDown={(e) => e.stopPropagation()} 
            onClick={toggleTheme}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', color: 'inherit', border: 'none', cursor: 'pointer' }}
          >
            <ThemeIcon isDark={isDark} />
          </button>
        </div>
      </div>
      <div className="toolbar-body">
        <div className="toolbar-row" style={{ display: 'flex', gap: '4px' }}>
          <button 
            className="p-[6px] bg-transparent hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors"
            onClick={onResetView} 
            title={t('fit_view', { defaultValue: 'Fit view' })} 
            aria-label={t('fit_view', { defaultValue: 'Fit view' })} 
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'inherit', border: 'none', cursor: 'pointer' }}
          >
            <FitView />
          </button>
          {onExpandAll && (
            <button 
              className="p-[6px] bg-transparent hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors"
              onClick={() => onExpandAll()} 
              title={t('expand_all')} 
              aria-label={t('expand_all')} 
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'inherit', border: 'none', cursor: 'pointer' }}
            >
              <ExpandIcon />
            </button>
          )}
          <button 
            className="p-[6px] bg-transparent hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors"
            onClick={() => onCollapseAll()} 
            title={t('collapse_toggle')} 
            aria-label={t('collapse_toggle')} 
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'inherit', border: 'none', cursor: 'pointer' }}
          >
            <CollapseIcon />
          </button>
          {svgRef && <PrintAndExportButtons svgRef={svgRef} />}
        </div>
        <div className="toolbar-row">
          <input
            className="toolbar-search"
            placeholder={t('search_placeholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch()
            }}
            aria-label={t('search_placeholder')}
          />
          <button 
            className="p-[6px] bg-transparent hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors"
            onClick={handleSearch} 
            title={t('go')} 
            aria-label={t('go')} 
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'inherit', border: 'none', cursor: 'pointer' }}
          >
            <ArrowRightIcon />
          </button>
        </div>
        {hasResults && (
          <div className="toolbar-row search-nav">
            <span className="search-counter">{currentResultIndex + 1}/{totalResults}</span>
            <button className="btn btn-nav" onClick={onPrevResult} title={t('prev_result')}>◀</button>
            <button className="btn btn-nav" onClick={onNextResult} title={t('next_result')}>▶</button>
          </div>
        )}
      </div>
    </div>
  )
}
