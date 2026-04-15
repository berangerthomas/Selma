import React, { Suspense, useRef } from 'react'
import { useI18n } from './i18n'
const TreeViz = React.lazy(() => import('./components/TreeViz'))
import Breadcrumb from './components/Breadcrumb'
import Toolbar from './components/Toolbar'
import Footer from './components/Footer'
import { useTree } from './context/TreeContext'

export default function App() {
  const svgRef = useRef<SVGSVGElement>(null)
  const { t } = useI18n()
  
  const {
    data,
    expanded,
    activeId,
    forceCenterOnActive,
    toggleNode,
    requestForceCenter,
    setExpandedToPath,
    collapseAll,
    expandAll,
    handleSearch,
    goToNextResult,
    goToPrevResult,
    searchResults,
    currentResultIndex,
    setActiveId,
    resetViewTrigger,
    resetView,
    canGoBack,
    canGoForward,
    goBack,
    goForward
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
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        onGoBack={goBack}
        onGoForward={goForward}
      />
      <Suspense fallback={<div className="viz-loading">{t('loading', { defaultValue: 'Loading...' })}</div>}>
        <TreeViz forwardedSvgRef={svgRef} />
      </Suspense>
      <Breadcrumb root={data} activeId={activeId} onCrumbClick={setExpandedToPath} />
      <Footer />
    </div>
  )
}
