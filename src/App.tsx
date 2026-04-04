import React, { Suspense } from 'react'
const TreeViz = React.lazy(() => import('./components/TreeViz'))
import Breadcrumb from './components/Breadcrumb'
import Toolbar from './components/Toolbar'
import { useTree } from './context/TreeContext'

export default function App() {
  const {
    data,
    expanded,
    activeId,
    forceCenterOnActive,
    toggleNode,
    requestForceCenter,
    setExpandedToPath,
    collapseAll,
    handleSearch,
    goToNextResult,
    goToPrevResult,
    searchResults,
    currentResultIndex,
    setActiveId,
    resetViewTrigger,
    resetView
  } = useTree()

  return (
    <div className="app">
      <Toolbar
        onCollapseAll={collapseAll}
        onSearch={handleSearch}
        onNextResult={goToNextResult}
        onPrevResult={goToPrevResult}
        onResetView={resetView}
        currentResultIndex={currentResultIndex}
        totalResults={searchResults.length}
      />
      <Suspense fallback={<div className="viz-loading">Chargement…</div>}>
        <TreeViz />
      </Suspense>
      <Breadcrumb root={data} activeId={activeId} onCrumbClick={setExpandedToPath} />
    </div>
  )
}
