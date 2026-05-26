import { useRef, RefObject, useState, useCallback } from 'react'
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useHover,
  useFocus,
  useDismiss,
  useRole,
  useInteractions,
  safePolygon
} from '@floating-ui/react';
import { useI18n } from '../i18n'
import { useTheme } from '../hooks/useTheme'
import { useTree } from '../context/TreeContext'
import { supportedLanguages } from '../utils/localization'
import { PrintAndExportButtons } from './PrintButton'
import type { ViewMode, TreeNode } from '../types'
import { computeAutoLayout } from '../utils/autoLayout'
import ThemeIcon from './icons/ThemeIcon'
import LangMenu from './LangMenu'
import SettingsModal from './SettingsModal'
import ExpandIcon from '../assets/icons/expand.svg?react'
import CollapseIcon from '../assets/icons/collapse.svg?react'
import ArrowRightIcon from '../assets/icons/arrow-right.svg?react'
import FitView from '../assets/icons/fit-view.svg?react'
import SettingsIcon from '../assets/icons/settings.svg?react'
import OrganicIcon from '../assets/icons/organic.svg?react'
import CompactIcon from '../assets/icons/compact.svg?react'
import FileTreeIcon from '../assets/icons/filetree.svg?react'
import MillerIcon from '../assets/icons/miller.svg?react'
import MagicWandIcon from '../assets/icons/magic-wand.svg?react'
import RotateIcon from '../assets/icons/rotate.svg?react'

interface ToolbarIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
}

function LayoutSlider({ label, value, min, max, step, onChange }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (n: number) => void
}) {
  return (
    <div className="flex items-center gap-2 w-full py-[2px]">
      <span className="toolbar-title shrink-0 w-[72px] text-[11px]">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="flex-1 h-[3px] accent-blue-600 cursor-pointer"
        onMouseDown={e => e.stopPropagation()}
      />
      <span className="text-[11px] w-7 text-right tabular-nums text-[var(--text-muted)]">{value}</span>
    </div>
  )
}

function ViewModeButton({
  mode, current, label, icon: Icon, onClick
}: {
  mode: ViewMode; current: ViewMode; label: string;
  icon: React.ComponentType<{ className?: string }>; onClick: () => void;
}) {
  const active = mode === current;
  return (
    <ToolbarIconButton
      label={label}
      onClick={onClick}
      className={`p-[6px] rounded transition-colors ${
        active
          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
          : 'bg-transparent hover:bg-black/5 dark:hover:bg-white/10'
      }`}
    >
      <Icon className="w-[18px] h-[18px] block" />
    </ToolbarIconButton>
  );
}

function ToolbarIconButton({ label, children, onClick, disabled, className, ...rest }: ToolbarIconButtonProps) {
  const baseClass = className || "p-[6px] bg-transparent hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors"
  const finalClass = `${baseClass} ${disabled ? 'cursor-default opacity-50' : 'cursor-pointer'}`
  return (
    <button
      className={`flex items-center justify-center w-[30px] h-[30px] text-inherit border-none ${finalClass}`}
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      onMouseDown={(e) => e.stopPropagation()}
      {...rest}
    >
      {children}
    </button>
  )
}

function ToolbarSection({
  title,
  open,
  onToggle,
  onHeaderMouseDown,
  rightContent,
  children,
  first = false,
}: {
  title: string
  open: boolean
  onToggle: () => void
  onHeaderMouseDown?: (e: React.MouseEvent) => void
  rightContent?: React.ReactNode
  children: React.ReactNode
  first?: boolean
}) {
  return (
    <div className={`${first ? '' : 'border-t border-[var(--border-color)]'} pt-1.5 mt-[2px]`}>
      <div
        className="toolbar-row flex justify-between cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        onMouseDown={onHeaderMouseDown}
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <button
            className={`help-toggle-btn bg-none border-none cursor-pointer p-1 flex items-center justify-center transition-transform duration-200 text-[var(--text-muted)] ${open ? 'rotate-90' : 'rotate-0'}`}
            title={title}
          >
            <span className="text-[10px]">▶</span>
          </button>
          <div className="toolbar-title">{title}</div>
        </div>
        {rightContent && (
          <div
            className="flex items-center gap-[2px]"
            onClick={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
          >
            {rightContent}
          </div>
        )}
      </div>
      {open && children}
    </div>
  )
}

type Props = {
  onCollapseAll: () => void
  onExpandAll?: () => void
  onSearch: (query: string, mode?: 'simple' | 'deep') => void
  onNextResult?: () => void
  onPrevResult?: () => void
  currentResultIndex?: number
  totalResults?: number
  onResetView?: () => void
  svgRef?: RefObject<SVGSVGElement | null>
  htmlRef?: RefObject<HTMLDivElement | null>
}

export default function Toolbar({ 
  onCollapseAll, 
  onExpandAll, 
  onSearch, 
  onNextResult, 
  onPrevResult, 
  onResetView, 
  currentResultIndex = -1, 
  totalResults = 0, 
  svgRef,
  htmlRef
}: Props) {
  const { lang, setLang, t } = useI18n()
  const [pos, setPos] = useState({ left: 12, top: 12 })
  const dragging = useRef(false)
  const startRef = useRef({ x: 0, y: 0, left: 12, top: 12 })
  const [query, setQuery] = useState('')
  const [searchMenuOpen, setSearchMenuOpen] = useState(false)
  const [taxonomyMenuOpen, setTaxonomyMenuOpen] = useState(false)
  const { isDark, toggleTheme } = useTheme()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [openSections, setOpenSections] = useState<Record<'help'|'geometry'|'tools'|'tags', boolean>>({ help: false, geometry: false, tools: false, tags: false })
  const { 
    viewMode, setViewMode, activeTaxonomyId, setActiveTaxonomyId, availableTaxonomies, 
    availableTags, tagStates, setTagStates,
    nodeSize, setNodeSize, hSpacing, setHSpacing, vSpacing, setVSpacing, nodeShape, setNodeShape,
    orientation, setOrientation, labelPosition, setLabelPosition,
    dagData, data, totalNodeCount, filteredNodeCount
  } = useTree()
  const resolvedLabelPosition = (labelPosition as string) === 'auto' ? 'smart' : labelPosition

  const handleTagToggle = useCallback((tag: string) => {
    const currentState = tagStates[tag] || 'neutral';
    let nextState: 'neutral' | 'include' | 'exclude' = 'neutral';
    
    if (currentState === 'neutral') nextState = 'include';
    else if (currentState === 'include') nextState = 'exclude';
    else nextState = 'neutral';

    const newStates = { ...tagStates, [tag]: nextState };
    if (nextState === 'neutral') {
      delete newStates[tag];
    }
    setTagStates(newStates);
  }, [tagStates, setTagStates]);

  const handleAutoLayout = useCallback(() => {
    try {
      const labels: string[] = []
      if (dagData && dagData.nodes) {
        for (const id in dagData.nodes) labels.push(dagData.nodes[id].name || '')
      } else if (data) {
        const walk = (n: TreeNode) => { labels.push(n.name || ''); n.children?.forEach(walk) }
        walk(data)
      }
      if (labels.length === 0) return

      const { nodeSize: idealNodeSize, hSpacing: finalH, vSpacing: finalV } = computeAutoLayout(labels, orientation)
      setNodeSize(idealNodeSize)
      setHSpacing(finalH)
      setVSpacing(finalV)
      setViewMode('tree')
      setTimeout(() => { onResetView?.() }, 50)
    } catch {
      // noop
    }
  }, [dagData, data, orientation, setNodeSize, setHSpacing, setVSpacing, setViewMode, onResetView])

  const { refs: searchMenuRefs, floatingStyles: searchMenuFloatingStyles, context: searchMenuContext } = useFloating({
    open: searchMenuOpen,
    onOpenChange: setSearchMenuOpen,
    placement: 'bottom-start',
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(4),
      flip({ fallbackAxisSideDirection: 'end' }),
      shift({ padding: 8 })
    ]
  });

  const searchMenuHover = useHover(searchMenuContext, { handleClose: safePolygon() });
  const searchMenuFocus = useFocus(searchMenuContext);
  const searchMenuDismiss = useDismiss(searchMenuContext);
  const searchMenuRole = useRole(searchMenuContext, { role: 'menu' });

  const { getReferenceProps: getSearchMenuReferenceProps, getFloatingProps: getSearchMenuFloatingProps } = useInteractions([
    searchMenuHover,
    searchMenuFocus,
    searchMenuDismiss,
    searchMenuRole
  ]);

  const { refs: taxonomyMenuRefs, floatingStyles: taxonomyMenuFloatingStyles, context: taxonomyMenuContext } = useFloating({
    open: taxonomyMenuOpen,
    onOpenChange: setTaxonomyMenuOpen,
    placement: 'bottom-start',
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(4),
      flip({ fallbackAxisSideDirection: 'end' }),
      shift({ padding: 8 })
    ]
  });

  const taxonomyMenuDismiss = useDismiss(taxonomyMenuContext)
  const taxonomyMenuRole = useRole(taxonomyMenuContext, { role: 'menu' })

  const { getFloatingProps: getTaxonomyMenuFloatingProps } = useInteractions([
    taxonomyMenuDismiss,
    taxonomyMenuRole
  ])

  const activeTaxonomy = availableTaxonomies.find((taxo) => taxo.id === activeTaxonomyId)
  const activeTaxonomyLabel = activeTaxonomy
    ? t(`taxonomy_${activeTaxonomy.id}`, { defaultValue: activeTaxonomy.label })
    : t('taxonomy', { defaultValue: 'Taxonomy' })

  function onHeaderPointerDown(e: React.MouseEvent) {
    e.preventDefault()
    dragging.current = true
    startRef.current = { x: e.clientX, y: e.clientY, left: pos.left, top: pos.top }
    document.body.style.userSelect = 'none'

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return
      const nx = startRef.current.left + (ev.clientX - startRef.current.x)
      const ny = startRef.current.top + (ev.clientY - startRef.current.y)
      setPos({ left: Math.max(6, nx), top: Math.max(6, ny) })
    }
    const onUp = () => {
      dragging.current = false
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  function handleSearch(mode?: 'simple' | 'deep') {
    const q = query.trim()
    if (!q) return
    const m = mode || 'simple'
    onSearch(q, m)
    setSearchMenuOpen(false)
  }

  const includeCount = Object.values(tagStates).filter(v => v === 'include').length
  const excludeCount = Object.values(tagStates).filter(v => v === 'exclude').length
  const hasActiveTagState = includeCount > 0 || excludeCount > 0

  const hasResults = totalResults > 0 && currentResultIndex >= 0

  return (
    <>
      <div
        className="floating-toolbar"
        style={{ left: pos.left, top: pos.top }}
        onMouseDown={(e) => e.stopPropagation()}
        role="region"
        aria-label={t('project_title', { defaultValue: 'Taxonomy' })}
      >
        <div className="toolbar-row border-b border-[var(--border-color)] px-2 py-1.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button
              onClick={() => setOpenSections(prev => ({ ...prev, help: !prev.help }))}
              className={`help-toggle-btn bg-none border-none cursor-pointer p-1 flex items-center justify-center transition-transform duration-200 text-[var(--text-muted)] ${openSections.help ? 'rotate-90' : 'rotate-0'}`}
              title={t('help', { defaultValue: 'Help' })}
            >
              <span className="text-[10px]">▶</span>
            </button>
            <div className="project-main-title font-bold text-[14px] min-w-0 truncate">
              {t('project_title', { defaultValue: 'Taxonomy' })}
            </div>
          </div>
          <div className="flex items-center justify-end gap-[2px] shrink-0">
            {supportedLanguages.length > 1 && <div className="shrink-0"><LangMenu lang={lang} supportedLanguages={supportedLanguages} onSelect={setLang} /></div>}
            <ToolbarIconButton label={t('toggle_theme', { defaultValue: 'Toggle Theme' })} onClick={toggleTheme} className="shrink-0"><ThemeIcon isDark={isDark} /></ToolbarIconButton>
          </div>
        </div>
        {openSections.help && (
          <div className="toolbar-help-content px-3 py-2 text-[12px] border-b border-[var(--border-color)] bg-black/5 text-[var(--text-muted)] leading-[1.4]">
            {t('project_help', { defaultValue: '' })}
          </div>
        )}
        <div className="toolbar-row flex gap-1 items-stretch border-b border-[var(--border-color)] px-2 py-1.5">
          <div className="flex flex-col justify-center min-w-0">
            <div className="toolbar-title">{t('taxonomy', { defaultValue: 'Taxonomy' })}</div>
            <div className="text-[10px] tabular-nums text-[var(--text-muted)] leading-tight" title={t('node_count_title', { defaultValue: 'Filtered nodes / total' })}>
              {filteredNodeCount} / {totalNodeCount}
            </div>
          </div>
          <div className="relative flex-1 min-w-0 flex items-center">
            <button
              ref={taxonomyMenuRefs.setReference}
              type="button"
              onClick={() => setTaxonomyMenuOpen((open) => !open)}
              className="w-full h-[32px] px-3 py-1.5 rounded-lg border border-[var(--input-border)] bg-[var(--panel-bg)] text-left text-[12px] text-[var(--text-main)] shadow-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center justify-between gap-3"
              aria-haspopup="menu"
              aria-expanded={taxonomyMenuOpen}
              aria-label={t('taxonomy', { defaultValue: 'Taxonomy' })}
            >
              <span className="truncate">{activeTaxonomyLabel}</span>
              <span className={`text-[10px] text-[var(--text-muted)] transition-transform ${taxonomyMenuOpen ? 'rotate-180' : 'rotate-0'}`}>▾</span>
            </button>
            {taxonomyMenuOpen && (
              <div
                ref={taxonomyMenuRefs.setFloating}
                style={{ ...taxonomyMenuFloatingStyles, zIndex: 1000 }}
                {...getTaxonomyMenuFloatingProps()}
                className="search-mode-menu min-w-[220px] max-w-[280px]"
                role="menu"
                aria-label={t('taxonomy', { defaultValue: 'Taxonomy' })}
              >
                {availableTaxonomies.map((taxo) => {
                  const isActive = taxo.id === activeTaxonomyId
                  return (
                    <button
                      key={taxo.id}
                      role="menuitemradio"
                      aria-checked={isActive}
                      onClick={() => {
                        setActiveTaxonomyId(taxo.id)
                        setTaxonomyMenuOpen(false)
                      }}
                      className={`w-full text-left px-3 py-2 rounded-md text-[12px] transition-colors ${isActive ? 'bg-blue-600 text-white' : 'hover:bg-neutral-100 dark:hover:bg-neutral-700 text-[var(--text-main)]'}`}
                    >
                      <span className="block font-medium truncate">
                        {t(`taxonomy_${taxo.id}`, { defaultValue: taxo.label })}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="toolbar-body">
          <ToolbarSection
              first
              title={t('geometry', { defaultValue: 'Geometry' })}
              open={openSections.geometry}
              onToggle={() => setOpenSections(prev => ({ ...prev, geometry: !prev.geometry }))}
              onHeaderMouseDown={onHeaderPointerDown}
            >
            <div className="flex flex-col gap-1">
              <div className="toolbar-row flex gap-1 items-center mt-1">
                <div className="toolbar-title mr-2">{t('view', { defaultValue: 'View' })}</div>
                <ToolbarIconButton label={t('view_organic', { defaultValue: 'Organic graph' })} onClick={() => { setViewMode('tree'); setNodeShape('circle'); }} className={`p-[6px] rounded transition-colors ${viewMode === 'tree' && nodeShape === 'circle' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-transparent hover:bg-black/5 dark:hover:bg-white/10'}`}><OrganicIcon className="w-[18px] h-[18px] block" /></ToolbarIconButton>
                <ToolbarIconButton label={t('view_compact', { defaultValue: 'Rectangular graph' })} onClick={() => { setViewMode('tree'); setNodeShape('rect'); }} className={`p-[6px] rounded transition-colors ${viewMode === 'tree' && nodeShape === 'rect' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-transparent hover:bg-black/5 dark:hover:bg-white/10'}`}><CompactIcon className="w-[18px] h-[18px] block" /></ToolbarIconButton>
                <ViewModeButton mode="list" current={viewMode} label={t('view_list', { defaultValue: 'List Tree' })} icon={FileTreeIcon} onClick={() => setViewMode('list')} />
                <ViewModeButton mode="columns" current={viewMode} label={t('view_columns', { defaultValue: 'Miller Columns' })} icon={MillerIcon} onClick={() => setViewMode('columns')} />
                {viewMode === 'tree' && <ToolbarIconButton label={t('toggle_orientation', { defaultValue: 'Toggle orientation' })} onClick={() => setOrientation(orientation === 'horizontal' ? 'vertical' : 'horizontal')} className={`p-[6px] rounded transition-colors ${orientation === 'vertical' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-transparent hover:bg-black/5 dark:hover:bg-white/10'}`}><RotateIcon className="w-[18px] h-[18px] block" /></ToolbarIconButton>}
                <div className="flex-1" />
              </div>

              <LayoutSlider label={t('node_size', {defaultValue: 'Node'})} value={nodeSize} min={10} max={50} step={1} onChange={setNodeSize} />
              <LayoutSlider label={t('h_spacing', {defaultValue: 'H. space'})} value={hSpacing} min={80} max={400} step={10} onChange={setHSpacing} />
              <LayoutSlider label={t('v_spacing', {defaultValue: 'V. space'})} value={vSpacing} min={10} max={200} step={2} onChange={setVSpacing} />
              <div className="toolbar-row flex flex-wrap gap-1 justify-start pt-1">
                <ToolbarIconButton
                  label={t('auto_layout', { defaultValue: 'Auto layout' })}
                  onClick={handleAutoLayout}
                >
                  <MagicWandIcon className="w-[18px] h-[18px] block" />
                </ToolbarIconButton>
                <ToolbarIconButton
                  label={t('fit_view', { defaultValue: 'Fit view' })}
                  onClick={onResetView}
                >
                  <FitView className="w-[18px] h-[18px] block" />
                </ToolbarIconButton>
                {onExpandAll && (
                  <ToolbarIconButton
                    label={t('expand_all', { defaultValue: 'Expand all' })}
                    onClick={() => onExpandAll()}
                  >
                    <ExpandIcon className="w-[18px] h-[18px] block" />
                  </ToolbarIconButton>
                )}
                <ToolbarIconButton
                  label={t('collapse_toggle', { defaultValue: 'Collapse / Collapse all' })}
                  onClick={() => onCollapseAll()}
                >
                  <CollapseIcon className="w-[18px] h-[18px] block" />
                </ToolbarIconButton>
                {viewMode === 'tree' && (
                  <ToolbarIconButton
                    label={t(`label_position_${resolvedLabelPosition}`)}
                    onClick={() => {
                      const next = {
                        smart: 'top',
                        top: 'right',
                        right: 'bottom',
                        bottom: 'left',
                        left: 'smart'
                      } as const;
                      setLabelPosition(next[resolvedLabelPosition]);
                    }}
                  >
                    <div className="w-[48px] h-[18px] flex items-center justify-center text-base font-semibold leading-none select-none">
                      {resolvedLabelPosition === 'smart' && 'A*'}
                      {resolvedLabelPosition === 'top' && 'A↑'}
                      {resolvedLabelPosition === 'right' && 'A→'}
                      {resolvedLabelPosition === 'bottom' && 'A↓'}
                      {resolvedLabelPosition === 'left' && 'A←'}
                    </div>
                  </ToolbarIconButton>
                )}
              </div>
            </div>
          </ToolbarSection>

          <ToolbarSection
            title={t('toolbar_title', { defaultValue: 'Tools' })}
            open={openSections.tools}
            onToggle={() => setOpenSections(prev => ({ ...prev, tools: !prev.tools }))}
          >
            <div className="toolbar-row flex gap-1">
              {(svgRef || htmlRef) && (
                <PrintAndExportButtons
                  svgRef={svgRef}
                  htmlRef={htmlRef}
                  title={t('project_title', { defaultValue: 'Taxonomy' })}
                />
              )}
              {import.meta.env.DEV && <ToolbarIconButton label={t('settings', { defaultValue: 'Settings' })} onClick={() => setSettingsOpen(true)}><SettingsIcon className="w-[18px] h-[18px] block" aria-hidden="true" /></ToolbarIconButton>}
            </div>
          </ToolbarSection>

            {availableTags && availableTags.length > 0 && (
            <ToolbarSection
              title={t('tags_label', { defaultValue: 'Tags' })}
              open={openSections.tags}
              onToggle={() => setOpenSections(prev => ({ ...prev, tags: !prev.tags }))}
              rightContent={hasActiveTagState ? (
                <span className="text-[10px] tabular-nums leading-none flex items-center gap-1 mr-1">
                  {includeCount > 0 && <span className="text-blue-600 dark:text-blue-400">+{includeCount}</span>}
                  {excludeCount > 0 && <span className="text-red-600 dark:text-red-400">-{excludeCount}</span>}
                </span>
              ) : undefined}
            >
              <div className="toolbar-row flex flex-wrap gap-1 px-2 py-1.5">
                <div className="w-full mb-[2px] text-[12px] font-semibold flex flex-wrap items-center justify-between gap-2">
                  <span />
                  <div className="flex flex-wrap items-center justify-end gap-2 text-[11px] font-normal">
                    {Object.keys(tagStates).length > 0 && <button onClick={() => setTagStates({})} className="text-blue-600 dark:text-blue-400 hover:underline text-[10px] bg-none border-none cursor-pointer p-0">{t('clear_tags', { defaultValue: 'Clear all' })}</button>}
                  </div>
                </div>
                {availableTags.map(tag => {
                  const state = tagStates[tag] || 'neutral';
                  const baseClasses = 'tag-pill px-2 py-0.5 text-[11px] rounded-md border cursor-pointer transition-all duration-200 select-none flex flex-row items-center gap-1';
                  let stateClasses = 'bg-transparent text-gray-700 dark:text-gray-300 border-gray-300 dark:border-neutral-600 hover:bg-black/5 dark:hover:bg-white/10';
                  let icon = null;
                  
                  if (state === 'include') {
                    stateClasses = 'bg-blue-600 text-white border-blue-600 dark:bg-blue-500';
                    icon = <span className="font-bold opacity-80">+</span>;
                  } else if (state === 'exclude') {
                    stateClasses = 'bg-red-600 text-white border-red-600 dark:bg-red-500';
                    icon = <span className="font-bold opacity-80">-</span>;
                  }

                  const displayLabel = tag === '__untagged__' ? t('tags_untagged', { defaultValue: '[Untagged]' }) : t(`tags.${tag}`, { defaultValue: tag });

                  return (
                    <button key={tag} onClick={() => handleTagToggle(tag)} className={`${baseClasses} ${stateClasses}`}>
                      {icon} {displayLabel}
                    </button>
                  );
                })}
              </div>
            </ToolbarSection>
          )}

          <div className="border-t border-[var(--border-color)] pt-1.5 mt-[2px]">
            <div className="toolbar-row">
              <input
                className="toolbar-search"
                placeholder={t('search_placeholder', { defaultValue: 'Go to a node (id or name)...' })}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }}
                aria-label={t('search_placeholder', { defaultValue: 'Go to a node (id or name)...' })}
              />
              <div className="relative inline-block">
                <div ref={searchMenuRefs.setReference} {...getSearchMenuReferenceProps()} className="inline-block"><ToolbarIconButton label={t('go', { defaultValue: 'Go' })} onClick={() => handleSearch()}><ArrowRightIcon className="w-[18px] h-[18px] block" /></ToolbarIconButton></div>
                {searchMenuOpen && (
                  <div ref={searchMenuRefs.setFloating} style={{ ...searchMenuFloatingStyles, zIndex: 1000 }} {...getSearchMenuFloatingProps()} className="search-mode-menu min-w-max bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 text-sm overflow-hidden py-1" role="menu" aria-label={t('search_mode_menu', { defaultValue: 'Search mode' })}>
                    <button className="search-mode-item w-full text-left px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 whitespace-nowrap transition-colors" onClick={() => { handleSearch('deep'); }}>{t('search_deep', { defaultValue: 'Recherche approfondie' })}</button>
                  </div>
                )}
              </div>
            </div>
            {hasResults && <div className="toolbar-row search-nav"><span className="search-counter">{currentResultIndex + 1}/{totalResults}</span><button className="btn btn-nav" onClick={onPrevResult} title={t('prev_result', { defaultValue: 'Previous' })}>◀</button><button className="btn btn-nav" onClick={onNextResult} title={t('next_result', { defaultValue: 'Next' })}>▶</button></div>}
          </div>
        </div>
      </div>
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </>
  )
}