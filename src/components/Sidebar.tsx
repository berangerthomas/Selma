import React, { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n'
import TabbedMarkdown from './TabbedMarkdown'
import { buildMarkdownPath, defaultLanguage, isSupportedLanguage } from '../utils/localization'
import { useTextSize } from '../hooks/useTextSize'
import { useTree } from '../context/TreeContext'
import { HighlightMatch } from '../utils/highlight'
import AttachmentList from './AttachmentList'
import { Attachment } from '../types'
import CopyButton from './CopyButton'
import { getParents, hasMultipleParents } from '../utils/dagUtils'
import { fetchMarkdownContent } from '../utils/fetchMarkdown'

type SidebarProps = {
  open: boolean
  onClose?: () => void
  node?: { id?: string; name?: string; attachments?: Attachment[] } | null
  initialWidth?: number
  minWidth?: number
  maxWidth?: number
  onWidthChange?: (w: number) => void
}

const mdCache = new Map<string, string>()

export default function Sidebar({ open, onClose, node, initialWidth = 420, minWidth = 220, maxWidth = 720, onWidthChange }: SidebarProps) {
  const { searchQuery, activeSearchType, dagData, setActiveId, activeId } = useTree()
  const [width, setWidth] = useState<number>(initialWidth)
  const [presentationMode, setPresentationMode] = useState<'tabs' | 'linear'>('tabs')
  const dragging = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(0)
  const [markdownContent, setMarkdownContent] = useState<string>('')
  const [currentPath, setCurrentPath] = useState<string | undefined>()
  const { t, lang } = useI18n()
  const { textSizeClass, increaseSize, decreaseSize, canIncrease, canDecrease } = useTextSize()

  // Label reflects the current presentation mode (icon shows current state)
  const viewModeLabel = presentationMode === 'linear'
    ? t('markdown_view_linear', { defaultValue: 'Linear view' })
    : t('markdown_view_tabs', { defaultValue: 'Tabbed view' })

  useEffect(() => {
    let mounted = true
    async function load() {
      if (!node || !node.id) {
        setMarkdownContent('')
        return
      }

      const cacheKey = `${lang}_${node.id}`
      if (mdCache.has(cacheKey)) {
        setMarkdownContent(mdCache.get(cacheKey)!)
        return
      }

      setMarkdownContent(`*${t('loading', { defaultValue: 'Loading...' })}*`)

      try {
        const text = await fetchMarkdownContent(lang, node.id)
        if (!mounted) return
        if (text !== null) {
          mdCache.set(cacheKey, text)
          setMarkdownContent(text)
          setCurrentPath(`/details/${lang}/${node.id}.md`)
        } else {
          const title = t(`nodes.${node.id}.name`, { defaultValue: node.name })
          const mdFallback = `# ${title}\n\n*${t('description_not_provided', { defaultValue: 'No description provided.' })}*`
          if (mounted) {
            mdCache.set(cacheKey, mdFallback)
            setMarkdownContent(mdFallback)
            setCurrentPath(`/details/${node.id}.md`)
          }
        }
      } catch (err) {
        const title = t(`nodes.${node.id}.name`, { defaultValue: node.name })
        const mdFallback = `# ${title}\n\n*${t('description_not_provided', { defaultValue: 'No description provided.' })}*`
        if (mounted) {
          mdCache.set(cacheKey, mdFallback)
          setMarkdownContent(mdFallback)
        }
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [node, lang, t])

  const moveListenerRef = useRef<((e: MouseEvent) => void) | null>(null)
  const upListenerRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    // Cleanup on unmount in case listeners remain
    return () => {
      if (moveListenerRef.current) window.removeEventListener('mousemove', moveListenerRef.current)
      if (upListenerRef.current) window.removeEventListener('mouseup', upListenerRef.current as any)
      // touch
      if (moveListenerRef.current) window.removeEventListener('touchmove', moveListenerRef.current as any)
      if (upListenerRef.current) window.removeEventListener('touchend', upListenerRef.current as any)
    }
  }, [])

  function handlePointerDown(e: React.MouseEvent) {
    dragging.current = true
    startX.current = e.clientX
    startWidth.current = width
    document.body.style.userSelect = 'none'

    const onMouseMove = (ev: MouseEvent) => {
      const dx = startX.current - ev.clientX
      const newWidth = Math.min(maxWidth, Math.max(minWidth, startWidth.current + dx))
      setWidth(newWidth)
      if (typeof onWidthChange === 'function') onWidthChange(newWidth)
    }

    const onMouseUp = () => {
      dragging.current = false
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('touchmove', onMouseMove as any)
      window.removeEventListener('touchend', onMouseUp as any)
      moveListenerRef.current = null
      upListenerRef.current = null

      // Prevent the click event that follows mouseup (when released outside the sidebar)
      // from bubbling up and closing the sidebar
      const preventClick = (e: MouseEvent) => {
        e.stopPropagation()
        e.preventDefault()
        window.removeEventListener('click', preventClick, true)
      }
      window.addEventListener('click', preventClick, true)
      setTimeout(() => window.removeEventListener('click', preventClick, true), 50)
    }

    moveListenerRef.current = onMouseMove
    upListenerRef.current = onMouseUp

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    // touch support
    window.addEventListener('touchmove', onMouseMove as any)
    window.addEventListener('touchend', onMouseUp as any)
  }

  return (
    <div
      className={`sidebar ${open ? 'open' : 'closed'}`}
      style={{ width }}
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-hidden={!open}
    >
      <div className="sidebar-handle" onMouseDown={handlePointerDown} title={t('resize_handle_title', { defaultValue: 'Resize column' })} />
      <div className="sidebar-inner">
        <div className="sidebar-header">
          <div className="sidebar-title">
            {node ? <HighlightMatch text={t(`nodes.${node.id}.name`, { defaultValue: node.name || '' })} query={searchQuery} /> : t('details_default_title', { defaultValue: 'Details' })}
          </div>
          <div className="sidebar-actions">
            {node?.id && (
              <CopyButton
                textToCopy={markdownContent}
                className="sidebar-open-tab"
                title={t('copy_content', { defaultValue: 'Copy content' })}
              />
            )}
            <button
              className="sidebar-view-toggle text-sm font-bold"
              onClick={decreaseSize}
              disabled={!canDecrease}
              title={t('decrease_text_size', { defaultValue: 'Decrease text' })}
            >
              A-
            </button>
            <button
              className="sidebar-view-toggle text-[15px] font-bold"
              onClick={increaseSize}
              disabled={!canIncrease}
              title={t('increase_text_size', { defaultValue: 'Increase text' })}
            >
              A+
            </button>
            {node?.id && (
              <button
                className="sidebar-view-toggle"
                onClick={() => setPresentationMode((prev) => (prev === 'tabs' ? 'linear' : 'tabs'))}
                title={viewModeLabel}
                aria-label={viewModeLabel}
              >
                {presentationMode === 'tabs' ? '▦' : '≡'}
              </button>
            )}
            {node?.id && (
              <button
                className="sidebar-open-tab"
                onClick={() => {
                  const mdPath = buildMarkdownPath(lang && isSupportedLanguage(lang) ? lang : defaultLanguage, node.id as string)
                  const url = `?route=markdown-viewer&path=${encodeURIComponent(mdPath)}&nodeId=${encodeURIComponent(node.id as string)}&sanitize=1&view=${presentationMode}`
                  window.open(url, '_blank')
                }}
                title={t('open_in_new_tab', { defaultValue: 'Open in new tab' })}
                aria-label={t('open_in_new_tab', { defaultValue: 'Open in new tab' })}
              >
                ↗
              </button>
            )}
            <button className="sidebar-close" onClick={onClose} aria-label={t('close', { defaultValue: 'Close' })}>×</button>
          </div>
        </div>

        {node?.attachments && node.attachments.length > 0 && (
          <div className="border-b border-gray-200 dark:border-gray-700">
            <AttachmentList attachments={node.attachments} lang={lang || undefined} />
          </div>
        )}

        {/* Also appears in: multi-parent node indicator */}
        {node?.id && dagData && hasMultipleParents(dagData, node.id) && (
          <div className="mt-2 text-xs text-amber-600 dark:text-amber-400
                          border border-amber-200 dark:border-amber-800 rounded px-2 py-1.5">
            <span className="font-semibold block mb-0.5">
              {t('belongs_to', { defaultValue: 'Belongs to:' })}
            </span>
            <div className="flex flex-wrap gap-1">
              {getParents(dagData, node.id).filter(pid => pid !== activeId).map(pid => (
                <button
                  key={pid}
                  onClick={() => setActiveId(pid)}
                  className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40
                             hover:bg-amber-200 dark:hover:bg-amber-800/60 transition-colors"
                >
                  {dagData?.nodes[pid]?.name ?? pid}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="sidebar-content">
          <TabbedMarkdown key={node?.id || 'none'} content={markdownContent} className={`max-w-none ${textSizeClass}`} proseSize={textSizeClass} presentationMode={presentationMode} basePath={currentPath} searchQuery={activeSearchType === 'deep' ? searchQuery : undefined} />
        </div>
      </div>
    </div>
  )
}