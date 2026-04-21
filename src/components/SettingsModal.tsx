import React, { useEffect, useState } from 'react'
import { supportedLanguages } from '../utils/localization'
import { useI18n } from '../i18n'
import type { Attachment } from '../types'
import CopyIcon from '../assets/icons/copy.svg?react'
import DownloadIcon from '../assets/icons/download.svg?react'

type Props = {
  onClose: () => void
}

type TaxonomyNode = {
  id?: string
  name?: string
  attachments?: Attachment[]
  children?: TaxonomyNode[]
  [k: string]: any
}

type AttachmentDiscrepancy = {
  nodeId: string
  undeclaredFiles: Partial<Attachment>[]
  ghostFiles: Attachment[]
  filesOnDisk: number
  declaredFiles: number
}

export default function SettingsModal({ onClose }: Props) {
  const { t } = useI18n()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [allIds, setAllIds] = useState<string[]>([])
  const [englishNames, setEnglishNames] = useState<Record<string, string>>({})
  const [localeData, setLocaleData] = useState<Record<string, any>>({})
  const [activeTab, setActiveTab] = useState<string>('translations')
  const [attachmentDiscrepancies, setAttachmentDiscrepancies] = useState<AttachmentDiscrepancy[]>([])
  const [taxonomyData, setTaxonomyData] = useState<TaxonomyNode | null>(null)
  const [copyStatus, setCopyStatus] = useState<Record<string, 'idle' | 'copying' | 'copied' | 'error'>>({})

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        const taxResp = await fetch('/structured_taxonomy.json')
        if (!taxResp.ok) throw new Error('Failed to fetch structured_taxonomy.json')
        const tax: TaxonomyNode = await taxResp.json()

        const ids: string[] = []
        const names: Record<string, string> = {}
        const discrepancies: AttachmentDiscrepancy[] = []
        
        // For discovery we only need the list of filenames (the glob keys).
        // Avoid using `?url` here because Vite warns when resolving URLs
        // for files under `public/` (they're served from the site root).
        let discoveredKeys: string[] = []
        if (import.meta.env.DEV) {
          discoveredKeys = Object.keys(import.meta.glob('../../public/attachments/**/*'))
        }

        function walk(node?: TaxonomyNode) {
          if (!node) return
          if (node.id) {
            ids.push(node.id)
            names[node.id] = node.name || ''

            // Attachments Discovery
            const declaredAttachments = node.attachments || []
            const nodeFilesOnDiskPath = `../../public/attachments/${node.id}/`
            
              const filesOnDisk = discoveredKeys.filter(path => path.startsWith(nodeFilesOnDiskPath))
            
            const undeclaredFiles: Partial<Attachment>[] = []
            const ghostFiles: Attachment[] = []
            
            filesOnDisk.forEach(filePath => {
              const filename = filePath.split('/').pop() || ''
              const urlPath = `/attachments/${node.id}/${filename}`
              
              if (!declaredAttachments.some(att => att.path === urlPath)) {
                // Inferred logic
                const parts = filename.split('.')
                const ext = parts.pop() || ''
                let name = parts.join('.')
                let lang = undefined
                
                if (parts.length > 1 && supportedLanguages.includes(parts[parts.length - 1])) {
                   lang = parts.pop()
                   name = parts.join('.')
                }
                
                const cleanName = name.replace(/[-_]/g, ' ')
                
                undeclaredFiles.push({
                   path: urlPath,
                   format: ext,
                   lang,
                   name: `[TODO] ${cleanName.charAt(0).toUpperCase() + cleanName.slice(1)}`
                })
              }
            })
            
            declaredAttachments.forEach(att => {
               if (!filesOnDisk.some(filePath => filePath.endsWith(att.path))) {
                  ghostFiles.push(att)
               }
            })
            
            if (declaredAttachments.length > 0 || filesOnDisk.length > 0) {
               discrepancies.push({
                  nodeId: node.id,
                  declaredFiles: declaredAttachments.length,
                  filesOnDisk: filesOnDisk.length,
                  undeclaredFiles,
                  ghostFiles
               })
            }
          }
          if (Array.isArray(node.children)) node.children.forEach(walk)
        }

        walk(tax)

        if (!mounted) return
        setAllIds(ids)
        setEnglishNames(names)
        setAttachmentDiscrepancies(discrepancies)
        setTaxonomyData(tax)

        const langs = supportedLanguages
        const results: Record<string, any> = {}

        await Promise.all(langs.map(async (lang) => {
          try {
            const r = await fetch(`/locales/${lang}/taxonomy.json`)
            if (!r.ok) {
              results[lang] = null
              return
            }
            results[lang] = await r.json()
          } catch (err) {
            results[lang] = null
          }
        }))

        if (!mounted) return
        setLocaleData(results)
        setLoading(false)
      } catch (err: any) {
        if (!mounted) return
        setError(err?.message || String(err))
        setLoading(false)
      }
    }

    load()
    return () => { mounted = false }
  }, [])

  function getCoverage(lang: string) {
    const data = localeData[lang]
    const translated = data && data.nodes ? Object.keys(data.nodes) : []
    const translatedCount = translated.filter((id: string) => allIds.includes(id)).length
    const missing = allIds.filter((id) => !translated.includes(id))
    return { translatedCount, missing }
  }

  async function writeToClipboard(text: string) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text)
    }
    // fallback for older browsers
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.select()
    try {
      document.execCommand('copy')
    } finally {
      ta.remove()
    }
  }

  async function copyScaffold(lang: string) {
    try {
      const existing = (localeData[lang] && localeData[lang].nodes) ? { ...localeData[lang].nodes } : {}
      const merged: Record<string, any> = { ...existing }

      allIds.forEach((id) => {
        if (!merged[id]) {
          merged[id] = { name: `[TODO] ${englishNames[id] || id}` }
        }
      })

      const out = { nodes: merged }
      const str = JSON.stringify(out, null, 2)
      setCopyStatus(s => ({ ...s, [lang]: 'copying' }))
      await writeToClipboard(str)
      setCopyStatus(s => ({ ...s, [lang]: 'copied' }))
      setTimeout(() => setCopyStatus(s => ({ ...s, [lang]: 'idle' })), 2500)
    } catch (err) {
      setCopyStatus(s => ({ ...s, [lang]: 'error' }))
    }
  }

  async function copyAttachmentsScaffold() {
    if (!taxonomyData) return
    try {
      const clonedTax = JSON.parse(JSON.stringify(taxonomyData))

      function walkAndInject(node: any) {
        if (node.id) {
          const discrepancy = attachmentDiscrepancies.find(d => d.nodeId === node.id)
          if (discrepancy && discrepancy.undeclaredFiles.length > 0) {
            node.attachments = node.attachments || []
            discrepancy.undeclaredFiles.forEach(uf => {
              if (!node.attachments.some((att: any) => att.path === uf.path)) {
                node.attachments.push(uf)
              }
            })
          }
        }
        if (Array.isArray(node.children)) {
          node.children.forEach(walkAndInject)
        }
      }
      walkAndInject(clonedTax)

      const str = JSON.stringify(clonedTax, null, 2)
      setCopyStatus(s => ({ ...s, attachments: 'copying' }))
      await writeToClipboard(str)
      setCopyStatus(s => ({ ...s, attachments: 'copied' }))
      setTimeout(() => setCopyStatus(s => ({ ...s, attachments: 'idle' })), 2500)
    } catch (err) {
      setCopyStatus(s => ({ ...s, attachments: 'error' }))
    }
  }

  function downloadScaffold(lang: string) {
    const existing = (localeData[lang] && localeData[lang].nodes) ? { ...localeData[lang].nodes } : {}
    const merged: Record<string, any> = { ...existing }

    allIds.forEach((id) => {
      if (!merged[id]) {
        merged[id] = { name: `[TODO] ${englishNames[id] || id}` }
      }
    })

    const out = { nodes: merged }
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' })
    // TODO: replace with backend API call
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `taxonomy.${lang}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  function downloadAttachmentsScaffold() {
    if (!taxonomyData) return
    
    const clonedTax = JSON.parse(JSON.stringify(taxonomyData))
    
    function walkAndInject(node: any) {
       if (node.id) {
          const discrepancy = attachmentDiscrepancies.find(d => d.nodeId === node.id)
          if (discrepancy && discrepancy.undeclaredFiles.length > 0) {
             node.attachments = node.attachments || []
             discrepancy.undeclaredFiles.forEach(uf => {
                if (!node.attachments.some((att: any) => att.path === uf.path)) {
                   node.attachments.push(uf)
                }
             })
          }
       }
       if (Array.isArray(node.children)) {
          node.children.forEach(walkAndInject)
       }
    }
    walkAndInject(clonedTax)
    
    const blob = new Blob([JSON.stringify(clonedTax, null, 2)], { type: 'application/json' })
    // TODO: replace with backend API call
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'structured_taxonomy.attachments.json'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-[min(960px,95%)] max-h-[90vh] overflow-auto bg-white dark:bg-neutral-900 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center justify-between p-4 border-b border-neutral-100 dark:border-neutral-800">
          <h3 className="text-lg font-semibold">{t('settings', { defaultValue: 'Settings' })}</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="px-3 py-1 rounded bg-neutral-100 dark:bg-neutral-800 cursor-pointer" onClick={onClose}>{t('close', { defaultValue: 'Close' })}</button>
          </div>
        </div>

        <div className="p-4">
          {/* Tabs header */}
          <div className="mb-4">
            <nav role="tablist" aria-label={t('settings_tabs', { defaultValue: 'Settings sections' }) || 'Paramètres'} className="-mb-px flex gap-2">
              <button
                role="tab"
                aria-selected={activeTab === 'translations'}
                className={`px-3 py-2 -mb-px border-b-2 rounded-t-md text-sm cursor-pointer ${activeTab === 'translations' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'}`}
                onClick={() => setActiveTab('translations')}
              >
                {t('settings_tab_translations', { defaultValue: 'Translations' })}
              </button>
              <button
                role="tab"
                aria-selected={activeTab === 'attachments'}
                className={`px-3 py-2 -mb-px border-b-2 rounded-t-md text-sm cursor-pointer ${activeTab === 'attachments' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'}`}
                onClick={() => setActiveTab('attachments')}
              >
                {t('settings_tab_attachments', { defaultValue: 'Attachments' })}
              </button>
            </nav>
            <div className="mt-3">
              {activeTab === 'translations' ? (
                <>
                  <h4 className="font-medium">{t('settings_modal_translations_title', { defaultValue: 'Translations' })}</h4>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">{t('settings_modal_translations_description', { defaultValue: 'View translation coverage and download a scaffolded taxonomy file per language.' })}</p>
                </>
              ) : (
                <>
                  <h4 className="font-medium">{t('settings_modal_attachments_title', { defaultValue: 'Attachment Status & Auto-completion' })}</h4>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">{t('settings_modal_attachments_description', { defaultValue: 'Check synchronization between attachments declared in structured_taxonomy.json and the files actually present in the public/attachments directory.' })}</p>
                </>
              )}
            </div>
          </div>

          {loading && <div>{t('loading', { defaultValue: 'Loading...' })}</div>}
          {error && <div className="text-red-600">{t('error', { defaultValue: 'Error:' })} {error}</div>}

          {!loading && !error && (
            <div className="space-y-4">
              {activeTab === 'translations' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm table-auto border-collapse">
                    <thead>
                      <tr className="text-left text-neutral-600 dark:text-neutral-400">
                        <th className="pb-2 font-medium">{t('change_language', { defaultValue: 'Language' })}</th>
                        <th className="pb-2 font-medium">{t('settings_modal_coverage', { defaultValue: 'Coverage' })}</th>
                        <th className="pb-2 font-medium">{t('settings_modal_status', { defaultValue: 'Status' })}</th>
                        <th className="pb-2 font-medium">{t('settings_modal_file', { defaultValue: 'File Actions' })}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {supportedLanguages.map((lang) => {
                        const { translatedCount, missing } = getCoverage(lang)
                        const complete = missing.length === 0
                        return (
                          <React.Fragment key={lang}>
                            <tr className="border-t border-neutral-100 dark:border-neutral-800">
                              <td className="py-2 align-top">{lang.toUpperCase()}</td>
                              <td className="py-2 align-top">{translatedCount} / {allIds.length} nodes</td>
                              <td className="py-2 align-top">{complete ? t('settings_modal_complete', { defaultValue: '✅ Complete' }) : t('settings_modal_missing', { count: missing.length, defaultValue: '⚠️ {{count}} missing' })}</td>
                              <td className="py-2 align-top">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-sm px-2 py-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-neutral-600 dark:text-neutral-300">
                                    taxonomy.{lang}.json
                                  </span>
                                  <button
                                    className={`p-1.5 rounded transition-colors ${complete ? 'opacity-50 cursor-not-allowed' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 cursor-pointer'}`}
                                    onClick={() => downloadScaffold(lang)}
                                    disabled={complete}
                                    aria-disabled={complete}
                                    title={complete ? t('settings_modal_all_translated_title', { defaultValue: 'All nodes translated — nothing to download' }) : t('settings_modal_download_title', { lang, defaultValue: 'Download scaffolded taxonomy.{{lang}}.json' })}
                                  >
                                    <DownloadIcon className="w-4 h-4" />
                                  </button>

                                  <button
                                    className={`p-1.5 rounded transition-colors ${complete ? 'opacity-50 cursor-not-allowed' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 cursor-pointer'}`}
                                    onClick={() => copyScaffold(lang)}
                                    disabled={complete}
                                    aria-disabled={complete}
                                    title={complete ? t('settings_modal_all_translated_title', { defaultValue: 'All nodes translated — nothing to copy' }) : t('settings_modal_copy_title', { lang, defaultValue: 'Copy scaffolded taxonomy to clipboard' })}
                                  >
                                    {copyStatus[lang] === 'copied' ? <span className="text-green-600 dark:text-green-500 font-bold px-1 select-none">✓</span> : <CopyIcon className="w-4 h-4" />}
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {!complete && (
                              <tr className="border-b border-neutral-100 dark:border-neutral-800">
                                <td colSpan={4} className="px-4 py-2">
                                  <details>
                                    <summary className="cursor-pointer">{t('settings_modal_missing_summary', { count: missing.length, defaultValue: 'Missing keys ({{count}}) — expand to view' })}</summary>
                                    <ul className="mt-2 ml-4 list-disc text-sm">
                                      {missing.map((id) => (
                                        <li key={id}><strong>{id}</strong>: {englishNames[id]}</li>
                                      ))}
                                    </ul>
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
              )}
              {activeTab === 'attachments' && (
                <div className="overflow-x-auto space-y-4">
                  {attachmentDiscrepancies.length === 0 ? (
                    <div className="text-sm text-green-600 dark:text-green-400 p-4 bg-green-50 dark:bg-green-900/20 rounded">
                      {t('settings_modal_attachments_all_sync', { defaultValue: '✅ All declared attachments match the files on disk.' })}
                    </div>
                  ) : (
                    <>
                      <table className="w-full text-sm table-auto border-collapse">
                        <thead>
                          <tr className="text-left text-neutral-600 dark:text-neutral-400">
                            <th className="pb-2">{t('settings_modal_node_id', { defaultValue: 'Node ID' })}</th>
                            <th className="pb-2">{t('settings_modal_files_on_disk', { defaultValue: 'Files on disk' })}</th>
                            <th className="pb-2">{t('settings_modal_declared', { defaultValue: 'Declared' })}</th>
                            <th className="pb-2">{t('settings_modal_status', { defaultValue: 'Status' })}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attachmentDiscrepancies.map((d) => {
                            const isSync = d.undeclaredFiles.length === 0 && d.ghostFiles.length === 0
                            return (
                              <React.Fragment key={d.nodeId}>
                                <tr className="border-t border-neutral-100 dark:border-neutral-800">
                                  <td className="py-2 font-medium">{d.nodeId}</td>
                                  <td className="py-2">{d.filesOnDisk}</td>
                                  <td className="py-2">{d.declaredFiles}</td>
                                  <td className="py-2">
                                    {isSync ? t('settings_modal_status_sync', { defaultValue: '✅ In sync' }) : d.ghostFiles.length > 0 ? t('settings_modal_status_missing', { defaultValue: '🔴 Missing on disk' }) : t('settings_modal_status_undeclared', { defaultValue: '⚠️ Undeclared' })}
                                  </td>
                                </tr>
                                {!isSync && (
                                  <tr className="border-b border-neutral-100 dark:border-neutral-800">
                                    <td colSpan={4} className="px-4 py-2">
                                      <details>
                                        <summary className="cursor-pointer text-sm font-medium">{t('settings_modal_details', { defaultValue: 'Details' })}</summary>
                                        <div className="mt-2 ml-4 text-sm space-y-2">
                                          {d.undeclaredFiles.length > 0 && (
                                            <div>
                                              <span className="font-semibold text-yellow-600 dark:text-yellow-400">{t('settings_modal_undeclared_files', { defaultValue: 'Undeclared files:' })}</span>
                                              <ul className="list-disc ml-5">
                                                {d.undeclaredFiles.map((uf, i) => (
                                                  <li key={i}>{uf.path} ({uf.name})</li>
                                                ))}
                                              </ul>
                                            </div>
                                          )}
                                          {d.ghostFiles.length > 0 && (
                                            <div>
                                              <span className="font-semibold text-red-600 dark:text-red-400">{t('settings_modal_ghost_declarations', { defaultValue: 'Ghost declarations:' })}</span>
                                              <ul className="list-disc ml-5">
                                                {d.ghostFiles.map((gf, i) => (
                                                  <li key={i}>{gf.path} ({gf.name})</li>
                                                ))}
                                              </ul>
                                            </div>
                                          )}
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
                      
                      <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700 flex items-center justify-end gap-2">
                        <span className="font-mono text-sm px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-neutral-600 dark:text-neutral-300">
                          structured_taxonomy.attachments.json
                        </span>
                        
                        <button
                          className="p-1.5 rounded transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 cursor-pointer"
                          onClick={() => downloadAttachmentsScaffold()}
                          title={t('settings_modal_download_attachments_json', { defaultValue: 'Download completed structured_taxonomy.attachments.json' })}
                        >
                          <DownloadIcon className="w-5 h-5" />
                        </button>

                        <button
                          className="p-1.5 rounded transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 cursor-pointer"
                          onClick={() => copyAttachmentsScaffold()}
                          title={t('settings_modal_copy_attachments_title', { defaultValue: 'Copy synchronized structured_taxonomy.attachments.json to clipboard' })}
                        >
                          {copyStatus['attachments'] === 'copied' ? <span className="text-green-600 dark:text-green-500 font-bold px-[3px] select-none text-base leading-none">✓</span> : <CopyIcon className="w-5 h-5" />}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
