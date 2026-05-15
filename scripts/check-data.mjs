import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '..')

// Utility to recursively find files
function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f)
    const isDirectory = fs.statSync(dirPath).isDirectory()
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f))
  })
}

async function runDiagnostics() {
  console.log('--- Selma Data Diagnostics ---\n')

  // 1. Gather all nodes from taxonomies
  const taxonomiesDir = path.join(ROOT_DIR, 'public', 'data', 'taxonomies')
  const discoveredIds = new Set()

  if (fs.existsSync(taxonomiesDir)) {
    const files = fs.readdirSync(taxonomiesDir).filter(f => f.endsWith('.json'))
    for (const file of files) {
      const content = JSON.parse(fs.readFileSync(path.join(taxonomiesDir, file), 'utf-8'))
      if (content.root) discoveredIds.add(content.root)
      if (content.nodes) {
        for (const [id, node] of Object.entries(content.nodes)) {
          discoveredIds.add(id)
          if (node.children) {
            node.children.forEach(c => discoveredIds.add(c))
          }
        }
      }
    }
  }
  const allIds = Array.from(discoveredIds)
  console.log(`Discovered ${allIds.length} unique node IDs in taxonomies.\n`)

  // 2. Load nodes.json
  const nodesJsonPath = path.join(ROOT_DIR, 'public', 'data', 'nodes.json')
  let nodesDict = {}
  if (fs.existsSync(nodesJsonPath)) {
    nodesDict = JSON.parse(fs.readFileSync(nodesJsonPath, 'utf-8'))
    console.log(`Found ${Object.keys(nodesDict).length} nodes defined in nodes.json.\n`)
  } else {
    console.warn('\x1b[33m%s\x1b[0m', 'Warning: nodes.json not found.\n')
  }

  // 3. Attachments Diagnostics
  console.log('--- Attachments Check ---')
  const attachmentsDir = path.join(ROOT_DIR, 'public', 'attachments')
  let attachmentIssues = 0

  allIds.forEach(nodeId => {
    const declaredAtts = nodesDict[nodeId]?.attachments || []
    const nodeAttDir = path.join(attachmentsDir, nodeId)
    const filesOnDisk = []
    
    if (fs.existsSync(nodeAttDir)) {
      walkDir(nodeAttDir, filepath => {
        if (!filepath.endsWith('.gitkeep')) {
          // Normalize to posix format for comparison
          const relPath = path.relative(path.join(ROOT_DIR, 'public'), filepath).split(path.sep).join('/')
          filesOnDisk.push('/' + relPath)
        }
      })
    }

    const undeclared = filesOnDisk.filter(fp => !declaredAtts.some(att => att.path === fp))
    const missing = declaredAtts.filter(att => !filesOnDisk.includes(att.path))

    if (undeclared.length > 0 || missing.length > 0) {
      attachmentIssues++
      console.log(`\x1b[33mNode [${nodeId}]:\x1b[0m`)
      if (undeclared.length > 0) console.log(`  Undeclared on disk: ${undeclared.join(', ')}`)
      if (missing.length > 0) console.log(`  Missing from disk: ${missing.map(m => m.path).join(', ')}`)
    }
  })

  if (attachmentIssues === 0) {
    console.log('\x1b[32m%s\x1b[0m', 'All attachments are perfectly synchronized.')
  }
  console.log('')

  // 4. Locales Diagnostics
  console.log('--- Translations Check ---')
  const localesDir = path.join(ROOT_DIR, 'public', 'locales')
  if (fs.existsSync(localesDir)) {
    const langs = fs.readdirSync(localesDir).filter(f => fs.statSync(path.join(localesDir, f)).isDirectory())
    langs.forEach(lang => {
      const taxonomyPath = path.join(localesDir, lang, 'taxonomy.json')
      if (fs.existsSync(taxonomyPath)) {
        const langData = JSON.parse(fs.readFileSync(taxonomyPath, 'utf-8'))
        const translatedIds = langData.nodes ? Object.keys(langData.nodes) : []
        const validTranslated = translatedIds.filter(id => allIds.includes(id)).length
        const missingIds = allIds.filter(id => !translatedIds.includes(id))

        if (missingIds.length === 0) {
          console.log(`\x1b[32m[${lang.toUpperCase()}]\x1b[0m 100% translated (${validTranslated}/${allIds.length})`)
        } else {
          console.log(`\x1b[33m[${lang.toUpperCase()}]\x1b[0m Missing ${missingIds.length} translations.`)
        }
      } else {
        console.log(`\x1b[31m[${lang.toUpperCase()}]\x1b[0m Missing taxonomy.json file.`)
      }
    })
  } else {
    console.log('No locales directory found.')
  }
}

runDiagnostics().catch(console.error)