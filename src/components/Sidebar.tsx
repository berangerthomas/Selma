import React, { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n'
import MarkdownRenderer from './MarkdownRenderer'

type SidebarProps = {
  open: boolean
  onClose?: () => void
  node?: { id?: string; name?: string } | null
  initialWidth?: number
  minWidth?: number
  maxWidth?: number
  onWidthChange?: (w: number) => void
}

const mdCache = new Map<string, string>()

export default function Sidebar({ open, onClose, node, initialWidth = 420, minWidth = 220, maxWidth = 720, onWidthChange }: SidebarProps) {
  const [width, setWidth] = useState<number>(initialWidth)
  const dragging = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(0)
  const [markdownContent, setMarkdownContent] = useState<string>('')
  const { t, lang } = useI18n()

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

      setMarkdownContent(`*${t('loading', { defaultValue: 'Chargement...' })}*`)
      
      try {
        const preferredPath = `/details/${lang}/${node.id}.md`
        let res = await fetch(preferredPath)
        if (!mounted) return
        const isHtml = (r: Response) => r?.ok && r.headers?.get?.('content-type')?.includes('text/html')
        if (!res || !res.ok || isHtml(res)) {
          res = await fetch(`/details/${node.id}.md`)
        }
        if (!mounted) return
        if (res && res.ok && !isHtml(res)) {
          const text = await res.text()
          if (mounted) {
            mdCache.set(cacheKey, text)
            setMarkdownContent(text)
          }
        } else {
          const title = t(`nodes.${node.id}.name`, { defaultValue: node.name })
          const mdFallback = `# ${title}\n\n*${t('description_not_provided', { defaultValue: 'Description à venir...'})}*`
          if (mounted) {
            mdCache.set(cacheKey, mdFallback)
            setMarkdownContent(mdFallback)
          }
        }
      } catch (err) {
        const title = t(`nodes.${node.id}.name`, { defaultValue: node.name })
        const mdFallback = `# ${title}\n\n*${t('description_not_provided', { defaultValue: 'Description à venir...'})}*`
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
    }

    moveListenerRef.current = onMouseMove
    upListenerRef.current = onMouseUp

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    // touch support
    window.addEventListener('touchmove', onMouseMove as any)
    window.addEventListener('touchend', onMouseUp as any)
  }

  function handleTouchStart(e: React.TouchEvent) {
    const touch = e.touches[0]
    if (!touch) return
    dragging.current = true
    startX.current = touch.clientX
    startWidth.current = width
    document.body.style.userSelect = 'none'

    const onTouchMove = (ev: TouchEvent) => {
      const tt = ev.touches[0]
      if (!tt) return
      const dx = startX.current - tt.clientX
      const newWidth = Math.min(maxWidth, Math.max(minWidth, startWidth.current + dx))
      setWidth(newWidth)
      if (typeof onWidthChange === 'function') onWidthChange(newWidth)
    }

    const onTouchEnd = () => {
      dragging.current = false
      document.body.style.userSelect = ''
      window.removeEventListener('touchmove', onTouchMove as any)
      window.removeEventListener('touchend', onTouchEnd as any)
    }

    window.addEventListener('touchmove', onTouchMove as any)
    window.addEventListener('touchend', onTouchEnd as any)
  }

  return (
    <div
      className={`sidebar ${open ? 'open' : 'closed'}`}
      style={{ width }}
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-hidden={!open}
    >
      <div className="sidebar-handle" onMouseDown={handlePointerDown} title={t('resize_handle_title')} />
      <div className="sidebar-inner">
        <div className="sidebar-header">
          <div className="sidebar-title">
            {node ? t(`nodes.${node.id}.name`, { defaultValue: node.name }) : t('details_default_title')}
          </div>
          <div className="sidebar-actions">
            {node?.id && (
              <button
                className="sidebar-open-tab"
                onClick={() => {
                  const mdPath = `/details/${lang}/${node.id}.md`
                  const url = `/markdown-viewer?path=${encodeURIComponent(mdPath)}&sanitize=1`
                  window.open(url, '_blank')
                }}
                title={t('open_in_new_tab')}
                aria-label={t('open_in_new_tab')}
              >
                ↗
              </button>
            )}
            <button className="sidebar-close" onClick={onClose} aria-label={t('close')}>×</button>
          </div>
        </div>
        <div className="sidebar-content">
          <MarkdownRenderer content={markdownContent} className="max-w-none" />
        </div>
      </div>
    </div>
  )
}
