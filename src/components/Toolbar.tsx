import React, { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n'
import { useTheme } from '../hooks/useTheme'
import { getNextSupportedLanguage } from '../utils/localization'

type Props = {
  onCollapseAll: () => void
  onSearch: (query: string) => void
  onNextResult?: () => void
  onPrevResult?: () => void
  currentResultIndex?: number
  totalResults?: number
  onResetView?: () => void
}

export default function Toolbar({ onCollapseAll, onSearch, onNextResult, onPrevResult, onResetView, currentResultIndex = -1, totalResults = 0 }: Props) {
  const { lang, setLang, t } = useI18n()
  const [pos, setPos] = useState({ left: 12, top: 12 })
  const dragging = useRef(false)
  const startRef = useRef({ x: 0, y: 0, left: 12, top: 12 })
  const [query, setQuery] = useState('')
  const { isDark, toggleTheme } = useTheme()

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

  function toggleLang() {
    setLang(getNextSupportedLanguage(lang))
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
        <button 
          className="btn" 
          style={{ padding: '2px 6px', fontSize: '14px', background: 'transparent' }} 
          aria-label="Toggle Theme" 
          onMouseDown={(e) => e.stopPropagation()} 
          onClick={toggleTheme}
        >
          {isDark ? '☀️' : '🌙'}
        </button>
      </div>
      <div className="toolbar-body">
        <div className="toolbar-row">
          <button className="btn" onClick={() => onCollapseAll()}>{t('collapse_all')}</button>
          <button className="btn" onClick={onResetView} aria-label={t('reset_view', { defaultValue: 'Reset View' })}>🏠</button>
          <button className="btn" onClick={toggleLang}>{t('change_language')}: {lang.toUpperCase()}</button>
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
          <button className="btn" onClick={handleSearch}>{t('go')}</button>
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
