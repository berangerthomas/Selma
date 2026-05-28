import { useCallback, useRef, useEffect, MouseEvent } from 'react'
import {
  ReactFlow,
  Controls,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  useReactFlow,
  type Node as FlowNode
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { useTree } from '../context/TreeContext'
import Sidebar from './Sidebar'
import { useSidebar } from '../hooks/useSidebar'
import TaxonomyNode, { type TaxonomyNodeData } from './tree/TaxonomyNode'
import { useFlowGraph } from '../hooks/useFlowGraph'

const nodeTypes = {
  taxonomyNode: TaxonomyNode
}

function TreeVizInner() {
  const {
    dagData,
    expanded,
    activeId,
    searchQuery,
    nodeSize,
    hSpacing,
    vSpacing,
    nodeShape,
    orientation,
    labelPosition,
    toggleNode,
    setActiveId,
    requestForceCenter,
    isFullyExpanded,
    resetViewTrigger,
    clearForceCenter,
    forceCenterOnActive
  } = useTree()

  const { open: sidebarOpen, setOpen: setSidebarOpen, width: sidebarWidth, setWidth: setSidebarWidth } = useSidebar(activeId)
  const { fitView, setCenter, getViewport } = useReactFlow()
  
  // Custom hook wrapping ELK mrtree layout
  const { nodes: initialNodes, edges: initialEdges } = useFlowGraph(
    dagData,
    expanded,
    activeId,
    searchQuery,
    nodeSize,
    nodeShape,
    orientation,
    labelPosition,
    hSpacing,
    vSpacing
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  useEffect(() => {
    setNodes(initialNodes)
    setEdges(initialEdges)
  }, [initialNodes, initialEdges, setNodes, setEdges])

  const onNodeClick = useCallback(
    (_event: MouseEvent, node: FlowNode<TaxonomyNodeData>) => {
      const id = node.data.id
      if (node.data.isCluster) {
        const parentId = id.replace('__cluster', '')
        toggleNode(parentId)
        setActiveId(parentId)
      } else {
        const willOpen = !expanded.has(id)
        toggleNode(id)
        setActiveId(id)
        if (willOpen || isFullyExpanded) requestForceCenter()
      }
    },
    [expanded, toggleNode, setActiveId, isFullyExpanded, requestForceCenter]
  )

  const onPaneClick = useCallback(() => {
    setSidebarOpen(false)
    setActiveId('')
  }, [setSidebarOpen, setActiveId])

  // Center on activeId
  useEffect(() => {
    if (!activeId) return
    const activeNode = nodes.find(n => n.id === activeId)
    if (activeNode) {
      if (forceCenterOnActive) {
        const currentZoom = getViewport().zoom
        setCenter(activeNode.position.x + nodeSize, activeNode.position.y + nodeSize / 2, { zoom: currentZoom, duration: 500 })
        clearForceCenter()
      }
    }
  }, [activeId, nodes, forceCenterOnActive, setCenter, getViewport, clearForceCenter, nodeSize])

  // Reset View Listener
  const lastResetRef = useRef<number>(0)
  useEffect(() => {
    if (resetViewTrigger > lastResetRef.current) {
      lastResetRef.current = resetViewTrigger
      fitView({ duration: 500, padding: 0.2 })
    }
  }, [resetViewTrigger, fitView])

  // Fit View on initial mount / spacing change
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (nodes.length > 0) {
      if (isFirstRender.current) {
        window.setTimeout(() => fitView({ duration: 500, padding: 0.2 }), 50)
        isFirstRender.current = false
      }
    }
  }, [nodes.length, fitView])

  return (
    <div className="viz-container relative w-full h-full flex overflow-hidden">
      <div className="flex-1 h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodesDraggable={false}
          elementsSelectable={true}
          panOnScroll={false}
          fitViewOptions={{ padding: 0.1 }}
          minZoom={0.2}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          colorMode="system"
        >
          <Controls position="bottom-right" style={{ bottom: 100, right: 18 }} className="react-flow__controls override-controls bg-white dark:bg-neutral-800 shadow-md border border-neutral-200 dark:border-neutral-700" fitViewOptions={{ duration: 350, padding: 0.1 }} />
        </ReactFlow>
      </div>

      <Sidebar 
        open={sidebarOpen} 
        onClose={onPaneClick}
        node={dagData?.nodes[activeId]} 
        initialWidth={sidebarWidth} 
        onWidthChange={(w) => setSidebarWidth(w)} 
      />
    </div>
  )
}

export default function TreeViz() {
  return (
    <ReactFlowProvider>
      <TreeVizInner />
    </ReactFlowProvider>
  )
}