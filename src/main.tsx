import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import MarkdownViewerPage from './pages/MarkdownViewerPage'
import './i18n' // Init i18n
import './styles.css'
// Tailwind utilities are included via src/styles.css @tailwind directives
import { TreeProvider } from './context/TreeContext'

const rootEl = document.getElementById('root')!
const root = createRoot(rootEl)

function showErrorOverlay(err: unknown) {
  const msg = err instanceof Error ? err.stack || err.message : String(err)
  // also log to console for completeness
  // eslint-disable-next-line no-console
  console.error(err)
  let el = document.getElementById('app-error-overlay')
  if (!el) {
    el = document.createElement('div')
    el.id = 'app-error-overlay'
    el.style.cssText =
      'position:fixed;left:12px;right:12px;top:12px;padding:12px;background:#fff1f2;border:1px solid #fecaca;color:#7f1d1d;z-index:99999;white-space:pre-wrap;font-family:monospace;font-size:12px;border-radius:6px;max-height:60vh;overflow:auto;'
    document.body.appendChild(el)
  }
  el.textContent = msg
}

window.addEventListener('error', (ev: ErrorEvent) => {
  showErrorOverlay(ev.error ?? ev.message ?? String(ev))
})
window.addEventListener('unhandledrejection', (ev: PromiseRejectionEvent) => {
  showErrorOverlay(ev.reason ?? ev)
})

try {
  const urlParams = new URLSearchParams(window.location.search)
  // route to standalone markdown viewer
  if (
    (window.location.pathname && window.location.pathname.startsWith('/markdown-viewer')) ||
    urlParams.get('route') === 'markdown-viewer'
  ) {
    root.render(
      <React.StrictMode>
        <React.Suspense fallback={<div>Loading...</div>}>
          <MarkdownViewerPage />
        </React.Suspense>
      </React.StrictMode>
    )
  } else {
    root.render(
      <React.StrictMode>
        <React.Suspense fallback={<div>Loading...</div>}>
          <TreeProvider>
            <App />
          </TreeProvider>
        </React.Suspense>
      </React.StrictMode>
    )
  }
} catch (err) {
  showErrorOverlay(err)
}
