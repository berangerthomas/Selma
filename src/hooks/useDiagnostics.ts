import { useEffect, useState } from 'react'
import { supportedLanguages } from '../utils/localization'
import type { Attachment, TaxonomyDescription } from '../types'

export type NodeEntry = {
  name: string
  color?: string
  attachments?: Attachment[]
  [key: string]: unknown
}

export type LocaleFile = {
  nodes?: Record<string, { name: string }>
} | null

export type AttachmentDiscrepancy = {
  nodeId: string
  undeclaredFiles: Partial<Attachment>[]
  ghostFiles: Attachment[]
  filesOnDisk: number
  declaredFiles: number
}

// Ensure BASE_URL is respected to fix path bugs when deployed in subdirectories (like GitHub Pages)
const BASE_URL = import.meta.env.BASE_URL || '/'

function safeUrl(path: string) {
  const cleanBase = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${cleanBase}${cleanPath}`
}

export function useDiagnostics() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [allDiscoveredIds, setAllDiscoveredIds] = useState<string[]>([])
  const [nodesDict, setNodesDict] = useState<Record<string, NodeEntry>>({})
  const [localeData, setLocaleData] = useState<Record<string, LocaleFile>>({})
  const [taxonomies, setTaxonomies] = useState<TaxonomyDescription[]>([])
  const [attachmentDiscrepancies, setAttachmentDiscrepancies] = useState<AttachmentDiscrepancy[]>([])

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        setLoading(true)
        
        // 1. Load taxonomies registry
        const taxoRegistryResp = await fetch(safeUrl('/data/taxonomies.json'))
        if (!taxoRegistryResp.ok) throw new Error('Failed to fetch taxonomies.json')
        const taxoRegistry = await taxoRegistryResp.json() as TaxonomyDescription[]
        if (mounted) setTaxonomies(taxoRegistry)

        // 2. Discover all IDs from all taxonomies
        const discoveredIds = new Set<string>()
        await Promise.all(taxoRegistry.map(async (taxo) => {
          try {
            const resp = await fetch(safeUrl(`/data/taxonomies/${taxo.id}.json`))
            if (resp.ok) {
              const data = await resp.json()
              if (data.root) discoveredIds.add(data.root)
              if (data.nodes) {
                Object.entries(data.nodes).forEach(([id, node]) => {
                  discoveredIds.add(id)
                  const structNode = node as { children?: string[] }
                  if (structNode.children) structNode.children.forEach((cId: string) => discoveredIds.add(cId))
                })
              }
            }
          } catch (e) {
            console.warn(`Failed to load taxonomy ${taxo.id}`, e)
          }
        }))
        const sortedIds = Array.from(discoveredIds).sort()
        if (mounted) setAllDiscoveredIds(sortedIds)

        // 3. Load nodes.json (the source of truth for metadata)
        let currentNodesDict: Record<string, NodeEntry> = {}
        try {
          const nodesResp = await fetch(safeUrl('/data/nodes.json'))
          if (nodesResp.ok) {
            currentNodesDict = await nodesResp.json()
          }
        } catch (e) {
          console.warn('nodes.json not found or invalid')
        }
        if (mounted) setNodesDict(currentNodesDict)

        // 4. Discover Attachments (Dev mode only)
        const discrepancies: AttachmentDiscrepancy[] = []
        if (import.meta.env.DEV) {
          // Vite statically analyzes this glob block.
          const discoveredKeys = Object.keys(import.meta.glob('../../public/attachments/**/*'))
          
          sortedIds.forEach(nodeId => {
            const nodeMetadata = currentNodesDict[nodeId] || {}
            const declaredAttachments = nodeMetadata.attachments || []
            const nodeFilesOnDiskPath = `../../public/attachments/${nodeId}/`
            const filesOnDisk = discoveredKeys.filter(path => path.startsWith(nodeFilesOnDiskPath))

            const undeclaredFiles: Partial<Attachment>[] = []
            const ghostFiles: Attachment[] = []

            filesOnDisk.forEach(filePath => {
              const filename = filePath.split('/').pop() || ''
              if (filename === '.gitkeep') return
              const urlPath = `/attachments/${nodeId}/${filename}`

              if (!declaredAttachments.some((att: Attachment) => att.path === urlPath)) {
                // Better filename parsing avoiding false-positive language matches
                const parts = filename.split('.')
                const ext = parts.length > 1 ? (parts.pop() || '') : ''
                
                let lang = undefined
                let nameParts = parts
                
                if (parts.length > 0 && supportedLanguages.includes(parts[parts.length - 1])) {
                  lang = parts.pop()
                  nameParts = parts
                }

                const name = nameParts.join('.')
                const cleanName = name.replace(/[-_]/g, ' ')
                
                undeclaredFiles.push({
                   path: urlPath,
                   format: ext,
                   lang,
                   name: cleanName ? `[TODO] ${cleanName.charAt(0).toUpperCase() + cleanName.slice(1)}` : `[TODO] ${filename}`
                })
              }
            })

            declaredAttachments.forEach((att: Attachment) => {
               if (!filesOnDisk.some(filePath => filePath.endsWith(att.path))) {
                  ghostFiles.push(att)
               }
            })

            if (undeclaredFiles.length > 0 || ghostFiles.length > 0) {
               discrepancies.push({
                  nodeId,
                  declaredFiles: declaredAttachments.length,
                  filesOnDisk: filesOnDisk.length,
                  undeclaredFiles,
                  ghostFiles
               })
            }
          })
        }
        if (mounted) setAttachmentDiscrepancies(discrepancies)

        // 5. Load Translations
        const langs = supportedLanguages
        const results: Record<string, LocaleFile> = {}
        await Promise.all(langs.map(async (lang) => {
          try {
            const r = await fetch(safeUrl(`/locales/${lang}/taxonomy.json`))
            if (r.ok) {
              results[lang] = await r.json()
            } else {
              results[lang] = null
            }
          } catch (err) {
            results[lang] = null
          }
        }))
        if (mounted) {
          setLocaleData(results)
          setLoading(false)
        }
      } catch (err: unknown) {
        if (mounted) {
          setError(err instanceof Error ? err.message : String(err))
          setLoading(false)
        }
      }
    }

    load()
    return () => { mounted = false }
  }, [])

  function getCoverage(lang: string) {
    const data = localeData[lang]
    const translated = data && data.nodes ? Object.keys(data.nodes) : []
    const translatedCount = translated.filter((id: string) => allDiscoveredIds.includes(id)).length
    const missing = allDiscoveredIds.filter((id) => !translated.includes(id))
    return { translatedCount, missing }
  }

  function getTranslationScaffold(lang: string) {
    const existing = (localeData[lang] && localeData[lang].nodes) ? { ...localeData[lang].nodes } : {}
    const merged: Record<string, { name: string }> = { ...existing }

    allDiscoveredIds.forEach((id) => {
      if (!merged[id]) {
        const name = nodesDict[id]?.name || id
        merged[id] = { name: `[TODO] ${name}` }
      }
    })

    const out = { ...localeData[lang], nodes: merged }
    return JSON.stringify(out, null, 2)
  }

  function getNodesScaffold() {
    const merged: Record<string, NodeEntry> = { ...nodesDict }
    
    // Add missing IDs, NO DEFAULT COLOR HARDCODED to avoid overriding themes
    allDiscoveredIds.forEach(id => {
      if (!merged[id]) {
        merged[id] = {
          name: id
        }
      }
    })

    // Merge undeclared attachments
    attachmentDiscrepancies.forEach(d => {
      if (d.undeclaredFiles.length > 0) {
        merged[d.nodeId] = merged[d.nodeId] || { name: d.nodeId }
        merged[d.nodeId].attachments = merged[d.nodeId].attachments || []
        const attachments = merged[d.nodeId].attachments!
        d.undeclaredFiles.forEach(uf => {
          if (!attachments.some((att: Attachment) => att.path === uf.path)) {
            attachments.push(uf as Attachment)
          }
        })
      }
    })

    return JSON.stringify(merged, null, 2)
  }

  return {
    loading,
    error,
    allDiscoveredIds,
    nodesDict,
    localeData,
    taxonomies,
    attachmentDiscrepancies,
    getCoverage,
    getTranslationScaffold,
    getNodesScaffold
  }
}
