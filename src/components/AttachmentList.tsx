import { useEffect, useRef, useState } from 'react'
import { Attachment } from '../types'
import { useTextSize } from '../hooks/useTextSize'
import { useI18n } from '../i18n'
import DownloadIcon from '../assets/icons/download.svg?react'

// TODO: replace with Supabase signed URL when migrating to issue #0
const resolveAttachmentUrl = (path: string): string => {
  if (!path) return path
  // If an absolute URL, return as-is
  if (/^https?:\/\//i.test(path)) return path
  // Vite serves files from `public/` at the site root. Normalize paths
  // so callers can pass either `/public/...` or `/...`.
  if (path.startsWith('/public/')) return path.replace(/^\/public/, '')
  if (path.startsWith('public/')) return '/' + path.replace(/^public\//, '')
  return path
}

const humanizeSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B'
  const kb = bytes / 1024
  if (kb < 1024) return kb.toFixed(1) + ' KB'
  const mb = kb / 1024
  if (mb < 1024) return mb.toFixed(1) + ' MB'
  return (mb / 1024).toFixed(1) + ' GB'
}

type Props = {
  attachments?: Attachment[]
  lang?: string
  compact?: boolean
}

export default function AttachmentList({ attachments, lang, compact = false }: Props) {
  const { textSizeClass } = useTextSize()
  const { t } = useI18n()
  const containerClass = `attachment-list max-w-none ${compact ? 'px-2 mt-0 mb-0' : 'px-4 mt-4 mb-2'}`
  const proseSizes = ['prose-sm', 'prose-base', 'prose-lg', 'prose-xl', 'prose-2xl']
  const sizeIdx = Math.max(0, proseSizes.indexOf(textSizeClass))
  // map prose size to a slightly smaller text class for attachments (one step smaller)
  const textSizeMap: Record<string, string> = {
    'prose-sm': 'text-xs',
    'prose-base': 'text-sm',
    'prose-lg': 'text-base',
    'prose-xl': 'text-lg',
    'prose-2xl': 'text-xl'
  }
  const attachmentTextClass = textSizeMap[proseSizes[Math.max(0, sizeIdx - 1)]] || 'text-sm'
  const smallerTextClass = textSizeMap[proseSizes[Math.max(0, sizeIdx - 2)]] || 'text-xs'

  // Hooks (stable order)
  const listRef = useRef<HTMLUListElement | null>(null)
  const [forceSingleRow, setForceSingleRow] = useState<boolean>(false)
  const [showOtherLangs, setShowOtherLangs] = useState<boolean>(false)

  const all = attachments || []
  if (all.length === 0) return null

  // Group attachments: agnostic (no lang), current language, others by language
  const agnostic = all.filter((a) => !a.lang)
  const currentLangList = lang ? all.filter((a) => a.lang === lang) : []
  const other = lang ? all.filter((a) => a.lang && a.lang !== lang) : all.filter((a) => a.lang)
  const othersByLang = other.reduce((map: Record<string, Attachment[]>, att) => {
    const key = att.lang || 'und'
    if (!map[key]) map[key] = []
    map[key].push(att)
    return map
  }, {})
  const otherLangKeys = Object.keys(othersByLang).sort()

  useEffect(() => {
    const el = listRef.current
    if (!el) return

    const update = () => {
      const anchors = Array.from(el.querySelectorAll('a')) as HTMLElement[]
      let total = 0
      anchors.forEach((a) => {
        const prev = a.style.whiteSpace
        a.style.whiteSpace = 'nowrap'
        total += a.scrollWidth
        a.style.whiteSpace = prev
      })
      const avail = el.clientWidth || 0
      setForceSingleRow(total <= avail)
    }

    let ro: ResizeObserver | null = null
    try {
      ro = new ResizeObserver(update)
      ro.observe(el)
      Array.from(el.querySelectorAll('a')).forEach((a) => ro && ro.observe(a))
    } catch (err) {
      window.addEventListener('resize', update)
    }

    update()

    return () => {
      if (ro) {
        ro.disconnect()
      } else {
        window.removeEventListener('resize', update)
      }
    }
  }, [agnostic.length, currentLangList.length, textSizeClass])

  return (
    <div className={containerClass}>
      {/* Top-line: agnostic files then current language */}
      {(agnostic.length > 0 || currentLangList.length > 0) && (
        <ul ref={listRef} className={`list-none pl-0 m-0 flex ${forceSingleRow ? 'flex-nowrap' : 'flex-wrap'} items-center gap-x-5 gap-y-1`}>
          {agnostic.map((attachment, idx) => (
            <li key={`agn-${attachment.path}-${idx}`} className="p-0 m-0">
              <a
                href={resolveAttachmentUrl(attachment.path)}
                download={attachment.name}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1 whitespace-nowrap font-normal no-underline hover:text-blue-600 dark:hover:text-blue-400 transition-colors min-w-0 ${attachmentTextClass}`}>
                <DownloadIcon className="w-[1em] h-[1em] flex-shrink-0 opacity-70" />
                <span className="uppercase font-semibold text-neutral-500 tracking-wider">{attachment.format}</span>
                <span className="underline decoration-1 underline-offset-2 min-w-0">{attachment.name}</span>
                {attachment.size && <span className="text-neutral-500 font-normal ml-0.5">({humanizeSize(attachment.size)})</span>}
              </a>
            </li>
          ))}
          {currentLangList.map((attachment, idx) => (
            <li key={`cur-${attachment.path}-${idx}`} className="p-0 m-0">
              <a
                href={resolveAttachmentUrl(attachment.path)}
                download={attachment.name}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1 whitespace-nowrap font-normal no-underline hover:text-blue-600 dark:hover:text-blue-400 transition-colors min-w-0 ${attachmentTextClass}`}>
                <DownloadIcon className="w-[1em] h-[1em] flex-shrink-0 opacity-70" />
                <span className="uppercase font-semibold text-neutral-500 tracking-wider">{attachment.format}</span>
                <span className="underline decoration-1 underline-offset-2 min-w-0">{attachment.name}</span>
                {attachment.size && <span className="text-neutral-500 font-normal ml-0.5">({humanizeSize(attachment.size)})</span>}
              </a>
            </li>
          ))}
        </ul>
      )}

      {/* Other languages: collapsed by default */}
      {otherLangKeys.length > 0 && (
        <div className="mt-1">
          <button
            onClick={() => setShowOtherLangs((s) => !s)}
            className={`${attachmentTextClass} text-neutral-500 hover:text-blue-600 transition-colors px-0 py-0 cursor-pointer`}
            aria-expanded={showOtherLangs}
            aria-controls="attachment-other-langs"
          >
            {t('attachments_other_languages', { defaultValue: 'Other languages' })} ({otherLangKeys.length}) {showOtherLangs ? '▾' : '▸'}
          </button>

          {showOtherLangs && (
            <div id="attachment-other-langs" className="mt-2">
              {otherLangKeys.map((lk) => (
                <div key={lk} className="mb-1">
                  <div className={`${smallerTextClass} text-neutral-500 mb-1 uppercase font-semibold`}>{lk}</div>
                  <ul className="list-none pl-0 m-0 flex flex-wrap items-center gap-x-5 gap-y-1">
                    {othersByLang[lk].map((attachment, idx) => (
                      <li key={`oth-${lk}-${attachment.path}-${idx}`} className="p-0 m-0">
                        <a
                          href={resolveAttachmentUrl(attachment.path)}
                          download={attachment.name}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center gap-1 whitespace-nowrap font-normal no-underline hover:text-blue-600 dark:hover:text-blue-400 transition-colors min-w-0 ${attachmentTextClass}`}>
                          <DownloadIcon className="w-[1em] h-[1em] flex-shrink-0 opacity-70" />
                          <span className="uppercase font-semibold text-neutral-500 tracking-wider">{attachment.format}</span>
                          <span className="underline decoration-1 underline-offset-2 min-w-0">{attachment.name}</span>
                          {attachment.size && <span className="text-neutral-500 font-normal ml-0.5">({humanizeSize(attachment.size)})</span>}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
