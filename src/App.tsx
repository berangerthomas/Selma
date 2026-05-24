import React, { Suspense, useEffect, useRef } from 'react'
import { useI18n } from './i18n'
const TreeViz = React.lazy(() => import('./components/TreeViz'))
const FileTreeView = React.lazy(() => import('./components/FileTreeView'))
const MillerColumnsView = React.lazy(() => import('./components/MillerColumnsView'))
import Breadcrumb from './components/Breadcrumb'
import Toolbar from './components/Toolbar'
import Footer from './components/Footer'
import { useTree } from './context/TreeContext'

export default function App() {
  const svgRef = useRef<SVGSVGElement>(null)
  const htmlRef = useRef<HTMLDivElement>(null)
  const { t } = useI18n()

  useEffect(() => {
    document.title = t('project_title', { defaultValue: 'Selma' })
  }, [t])
  
  const {
    data,
    activeId,
    setExpandedToPath,
    collapseAll,
    expandAll,
    handleSearch,
    goToNextResult,
    goToPrevResult,
    searchResults,
    currentResultIndex,
    viewMode,
    resetView
  } = useTree()

  return (
    <div className="app">
      <Toolbar
        onCollapseAll={collapseAll}
        onExpandAll={expandAll}
        onSearch={handleSearch}
        onNextResult={goToNextResult}
        onPrevResult={goToPrevResult}
        onResetView={resetView}
        currentResultIndex={currentResultIndex}
        totalResults={searchResults.length}
        svgRef={svgRef}
        htmlRef={htmlRef}
      />
      <Suspense fallback={<div className="viz-loading">{t('loading', { defaultValue: 'Loading...' })}</div>}>
        {viewMode === 'tree' && <TreeViz forwardedSvgRef={svgRef} />}
        {viewMode === 'list' && <FileTreeView ref={htmlRef} />}
        {viewMode === 'columns' && <MillerColumnsView ref={htmlRef} />}
      </Suspense>
      <Breadcrumb root={data} activeId={activeId} onCrumbClick={setExpandedToPath} />
      <Footer />
    </div>
  )
}
