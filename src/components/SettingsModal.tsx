import React, { useState, useRef, useEffect } from 'react'
import { supportedLanguages } from '../utils/localization'
import { useI18n } from '../i18n'
import type { TranslateFn } from '../utils/searchRegex'
import CopyButton from './CopyButton'
import DownloadIcon from '../assets/icons/download.svg?react'
import { useDiagnostics } from '../hooks/useDiagnostics'
import { triggerDownload } from '../utils/download'

// Wrapper for triggerDownload with strings
function downloadStringAsFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'application/json' })
  triggerDownload(blob, filename)
}

type Props = {
  onClose: () => void
}

export default function SettingsModal({ onClose }: Props) {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState<string>('project')
  const modalRef = useRef<HTMLDivElement>(null)
  const positionRef = useRef({ x: 0, y: 0 })
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const startPos = useRef({ x: 0, y: 0 })
  
  const diagnostics = useDiagnostics()
  const { loading, error } = diagnostics

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return // do not drag if clicking a button
    isDragging.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    dragStart.current = { x: e.clientX, y: e.clientY }
    startPos.current = { ...positionRef.current }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging.current && modalRef.current) {
      const newX = startPos.current.x + (e.clientX - dragStart.current.x)
      const newY = Math.max(startPos.current.y + (e.clientY - dragStart.current.y), -window.innerHeight / 2) // prevent dragging too far up
      positionRef.current = { x: newX, y: newY }
      modalRef.current.style.transform = `translate(${newX}px, ${newY}px)`
    }
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging.current) {
      isDragging.current = false
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="fixed inset-0 bg-black/50 pointer-events-auto" onClick={onClose} />
      <div 
        ref={modalRef}
        className="relative z-10 w-[min(960px,95%)] max-h-[90vh] flex flex-col bg-white dark:bg-neutral-900 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 pointer-events-auto"
        style={{ transform: `translate(${positionRef.current.x}px, ${positionRef.current.y}px)` }}
      >
        <div 
          className="flex-none flex items-center justify-between p-4 border-b border-neutral-100 dark:border-neutral-800 cursor-move touch-none select-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <h3 className="text-lg font-semibold">{t('settings', { defaultValue: 'Settings' })}</h3>
          <button className="px-3 py-1 rounded bg-neutral-100 dark:bg-neutral-800 cursor-pointer pointer-events-auto" onClick={(e) => { e.stopPropagation(); onClose(); }}>{t('close', { defaultValue: 'Close' })}</button>
        </div>

        <div className="flex-1 overflow-auto p-4 pt-0">
          <div className="sticky top-0 bg-white dark:bg-neutral-900 pb-2 z-10 pt-4">
            <nav role="tablist" aria-label={t('settings_tabs', { defaultValue: 'Settings sections' })} className="-mb-px flex gap-2 border-b border-neutral-100 dark:border-neutral-800">
              {['project', 'nodes', 'translations'].map(tab => (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={activeTab === tab}
                  className={`px-3 py-2 -mb-px border-b-2 text-sm cursor-pointer transition-colors ${activeTab === tab ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {t(`settings_tab_${tab}`, { defaultValue: tab.charAt(0).toUpperCase() + tab.slice(1) })}
                </button>
              ))}
            </nav>
          </div>

          <div className="mt-4">
            {loading && <div>{t('loading', { defaultValue: 'Loading...' })}</div>}
            {error && <div className="text-red-600">{t('error', { defaultValue: 'Error:' })} {error}</div>}

            {!loading && !error && (
              <div className="space-y-4">
                {activeTab === 'project' && <ProjectTab diagnostics={diagnostics} t={t} />}
                {activeTab === 'nodes' && <NodesTab diagnostics={diagnostics} t={t} />}
                {activeTab === 'translations' && <TranslationsTab diagnostics={diagnostics} t={t} />}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// -- Sub-components --

function ProjectTab({ diagnostics, t }: { diagnostics: ReturnType<typeof useDiagnostics>, t: TranslateFn }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-neutral-100 dark:border-neutral-700">
          <div className="text-2xl font-bold">{diagnostics.allDiscoveredIds.length}</div>
          <div className="text-sm text-neutral-500">{t('settings_total_nodes', { defaultValue: 'Total Nodes Discovered' })}</div>
        </div>
        <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-neutral-100 dark:border-neutral-700">
          <div className="text-2xl font-bold">{diagnostics.taxonomies.length}</div>
          <div className="text-sm text-neutral-500">{t('settings_total_taxonomies', { defaultValue: 'Active Taxonomies' })}</div>
        </div>
        <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-neutral-100 dark:border-neutral-700">
          <div className="text-2xl font-bold">{Object.keys(diagnostics.nodesDict).length}</div>
          <div className="text-sm text-neutral-500">{t('settings_configured_nodes', { defaultValue: 'Configured in nodes.json' })}</div>
        </div>
      </div>
    </div>
  )
}

function NodesTab({ diagnostics, t }: { diagnostics: ReturnType<typeof useDiagnostics>, t: TranslateFn }) {
  const { allDiscoveredIds, nodesDict, getNodesScaffold, attachmentDiscrepancies } = diagnostics
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium">{t('settings_nodes_title', { defaultValue: 'Nodes Configuration' })}</h4>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">{t('settings_nodes_description', { defaultValue: 'Manage node attributes (colors, icons, attachments) in nodes.json.' })}</p>
        </div>
        <div className="flex gap-2">
          <CopyButton textToCopy={getNodesScaffold} title={t('settings_copy_nodes', { defaultValue: 'Copy updated nodes.json' })} />
          <button onClick={() => downloadStringAsFile(getNodesScaffold(), 'nodes.json')} className="p-1.5 bg-neutral-100 dark:bg-neutral-800 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 cursor-pointer" title={t('settings_download_nodes', { defaultValue: 'Download updated nodes.json' })}>
            <DownloadIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {attachmentDiscrepancies.length > 0 && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 rounded text-sm border border-yellow-200 dark:border-yellow-800/50">
          <div className="font-semibold mb-2">{t('settings_attachments_discrepancies', { count: attachmentDiscrepancies.length, defaultValue: `Found ${attachmentDiscrepancies.length} nodes with attachment issues.` })}</div>
          <ul className="list-disc list-inside px-2 space-y-1">
            {attachmentDiscrepancies.map(d => (
              <li key={d.nodeId}>
                <strong>{d.nodeId}</strong>: 
                {d.undeclaredFiles.length > 0 && ` ${d.undeclaredFiles.length} ${t('settings_undeclared_files', { defaultValue: 'undeclared files' })}`}
                {d.undeclaredFiles.length > 0 && d.ghostFiles.length > 0 && ', '}
                {d.ghostFiles.length > 0 && ` ${d.ghostFiles.length} ${t('settings_ghost_files', { defaultValue: 'missing from disk/ghost files' })}`}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <div className="max-h-[400px] overflow-auto border border-neutral-100 dark:border-neutral-800 rounded">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-800 sticky top-[0px]">
            <tr>
              <th className="p-2 text-left">{t('settings_nodes_id', { defaultValue: 'ID' })}</th>
              <th className="p-2 text-left">{t('settings_nodes_status', { defaultValue: 'Status' })}</th>
              <th className="p-2 text-left">{t('settings_nodes_customizations', { defaultValue: 'Customizations' })}</th>
            </tr>
          </thead>
          <tbody>
            {allDiscoveredIds.map(id => {
              const exists = !!nodesDict[id]
              const node = nodesDict[id] || {}
              return (
                <tr key={id} className="border-t border-neutral-100 dark:border-neutral-800">
                  <td className="p-2 font-mono">{id}</td>
                  <td className="p-2">
                    {exists ? <span className="text-green-600">✅ {t('settings_nodes_ok', { defaultValue: 'OK' })}</span> : <span className="text-yellow-600">⚠️ {t('settings_nodes_new', { defaultValue: 'New' })}</span>}
                  </td>
                  <td className="p-2 text-xs text-neutral-500">
                    {exists ? [
                      node.color && t('settings_nodes_color', { defaultValue: 'Color' }),
                      node.iconChar && t('settings_nodes_icon', { defaultValue: 'Icon' }),
                      node.attachments?.length > 0 && `${node.attachments.length} ${t('settings_nodes_attachments', { defaultValue: 'Attachments' })}`
                    ].filter(Boolean).join(', ') : t('settings_nodes_default_values', { defaultValue: 'Default values will be used' })}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TranslationsTab({ diagnostics, t }: { diagnostics: ReturnType<typeof useDiagnostics>, t: TranslateFn }) {
  const { allDiscoveredIds, getCoverage, getTranslationScaffold } = diagnostics
  return (
    <div className="space-y-4">
      <table className="w-full text-sm">
        <thead className="text-left text-neutral-600 dark:text-neutral-400">
          <tr>
            <th className="pb-2 font-medium">{t('change_language', { defaultValue: 'Language' })}</th>
            <th className="pb-2 font-medium">{t('settings_modal_coverage', { defaultValue: 'Coverage' })}</th>
            <th className="pb-2 font-medium">{t('settings_modal_status', { defaultValue: 'Status' })}</th>
            <th className="pb-2 font-medium">{t('settings_modal_action', { defaultValue: 'Action' })}</th>
          </tr>
        </thead>
        <tbody>
          {supportedLanguages.map((lang) => {
            const { translatedCount, missing } = getCoverage(lang)
            const complete = missing.length === 0
            return (
              <React.Fragment key={lang}>
                <tr className="border-t border-neutral-100 dark:border-neutral-800">
                  <td className="py-2">{lang.toUpperCase()}</td>
                  <td className="py-2">{translatedCount} / {allDiscoveredIds.length}</td>
                  <td className="py-2">{complete ? t('settings_modal_complete', { defaultValue: '✅ Complete' }) : t('settings_modal_missing', { count: missing.length, defaultValue: `⚠️ ${missing.length} missing` })}</td>
                  <td className="py-2">
                    <div className="flex gap-2">
                      <CopyButton textToCopy={() => getTranslationScaffold(lang)} title={t('settings_modal_copy_title', { defaultValue: 'Copy JSON' })} />
                      <button 
                        onClick={() => downloadStringAsFile(getTranslationScaffold(lang), `taxonomy.${lang}.json`)} 
                        className="p-1 cursor-pointer"
                        title={t('settings_modal_download_title', { lang, defaultValue: 'Download JSON' })}
                      >
                        <DownloadIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                {!complete && (
                  <tr>
                    <td colSpan={4} className="pb-4">
                      <details className="text-xs text-neutral-500">
                        <summary className="cursor-pointer">{t('settings_modal_missing_summary', { count: missing.length, defaultValue: 'Show missing IDs' })}</summary>
                        <div className="p-2 bg-neutral-50 dark:bg-neutral-800 rounded mt-1 flex flex-wrap gap-1">
                          {missing.map(id => <span key={id} className="px-1 bg-white dark:bg-neutral-700 rounded border border-neutral-200 dark:border-neutral-600">{id}</span>)}
                        </div>
                      </details>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

