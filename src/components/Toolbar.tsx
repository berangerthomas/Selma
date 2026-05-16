import { useRef, RefObject, useState } from 'react'
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
import type { ViewMode } from '../types'
import ThemeIcon from './icons/ThemeIcon'
import LangMenu from './LangMenu'
import SettingsModal from './SettingsModal'
import ExpandIcon from '../assets/icons/expand.svg?react'
import CollapseIcon from '../assets/icons/collapse.svg?react'
import ArrowRightIcon from '../assets/icons/arrow-right.svg?react'
import ArrowLeftIcon from '../assets/icons/arrow-left.svg?react'
import FitView from '../assets/icons/fit-view.svg?react'
import SettingsIcon from '../assets/icons/settings.svg?react'
import OrganicIcon from '../assets/icons/organic.svg?react'
import CompactIcon from '../assets/icons/compact.svg?react'
import FileTreeIcon from '../assets/icons/filetree.svg?react'
import MillerIcon from '../assets/icons/miller.svg?react'

interface ToolbarIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
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
  canGoBack?: boolean
  canGoForward?: boolean
  onGoBack?: () => void
  onGoForward?: () => void
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
  htmlRef,
  canGoBack = false,
  canGoForward = false,
  onGoBack,
  onGoForward
}: Props) {
  const { lang, setLang, t } = useI18n()
  const [pos, setPos] = useState({ left: 12, top: 12 })
  const dragging = useRef(false)
  const startRef = useRef({ x: 0, y: 0, left: 12, top: 12 })
  const [query, setQuery] = useState('')
  const [searchMenuOpen, setSearchMenuOpen] = useState(false)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { isDark, toggleTheme } = useTheme()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const { viewMode, setViewMode, activeTaxonomyId, setActiveTaxonomyId, availableTaxonomies, availableTags, selectedTags, setSelectedTags, tagMatchMode, setTagMatchMode } = useTree()

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
    // clear any pending close timer and close menu
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    onSearch(q, m)
    setSearchMenuOpen(false)
  }

  const hasResults = totalResults > 0 && currentResultIndex >= 0

  return (
    <>
      <div
        className="floating-toolbar"
        style={{ left: pos.left, top: pos.top }}
        onMouseDown={(e) => e.stopPropagation()}
        role="region"
        aria-label={t('project_title', { defaultValue: 'Selma' })}
      >
        <div className="toolbar-row border-b border-[var(--border-color)] px-2 py-1.5 flex items-center gap-2">
          <button 
            onClick={() => setHelpOpen(!helpOpen)}
            className={`help-toggle-btn bg-none border-none cursor-pointer p-1 flex items-center justify-center transition-transform duration-200 text-[var(--text-muted)] ${helpOpen ? 'rotate-90' : 'rotate-0'}`}
            title={t('help', { defaultValue: 'Help' })}
          >
            <span className="text-[10px]">▶</span>
          </button>
          <div className="project-main-title font-bold text-[14px] flex-1">
            {t('project_title', { defaultValue: 'Selma' })}
          </div>
        </div>
        {helpOpen && (
          <div className="toolbar-help-content px-3 py-2 text-[12px] border-b border-[var(--border-color)] bg-black/5 text-[var(--text-muted)] leading-[1.4]">
            {t('project_help', { defaultValue: '' })}
          </div>
        )}
        <div className="toolbar-header flex justify-between" onMouseDown={onHeaderPointerDown}>
          <div className="toolbar-title">{t('toolbar_title', { defaultValue: 'Tools' })}</div>
          <div className="flex items-center gap-[2px]">
            <div className="flex items-center gap-[2px] mr-1.5 border-r border-[var(--border-color)] pr-1.5">
              <ToolbarIconButton
                label={t('go_back', { defaultValue: 'Previous' })}
                onClick={canGoBack ? onGoBack : undefined}
                disabled={!canGoBack}
              >
                <ArrowLeftIcon className="w-[18px] h-[18px] block" />
              </ToolbarIconButton>
              <ToolbarIconButton
                label={t('go_forward', { defaultValue: 'Next' })}
                onClick={canGoForward ? onGoForward : undefined}
                disabled={!canGoForward}
              >
                <ArrowRightIcon className="w-[18px] h-[18px] block" />
              </ToolbarIconButton>
            </div>

            {supportedLanguages.length > 1 && (
              <LangMenu 
                lang={lang} 
                supportedLanguages={supportedLanguages} 
                onSelect={setLang} 
              />
            )}
            <ToolbarIconButton 
              label={t('toggle_theme', { defaultValue: 'Toggle Theme' })} 
              onClick={toggleTheme}
            >
              <ThemeIcon isDark={isDark} />
            </ToolbarIconButton>
          </div>
        </div>
        <div className="toolbar-body">
          <div className="toolbar-row flex gap-1">
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
            {(svgRef || htmlRef) && <PrintAndExportButtons svgRef={svgRef} htmlRef={htmlRef} />}
            {import.meta.env.DEV && (
              <ToolbarIconButton
                label={t('settings', { defaultValue: 'Settings' })}
                onClick={() => setSettingsOpen(true)}
              >
                <SettingsIcon className="w-[18px] h-[18px] block" aria-hidden="true" />
              </ToolbarIconButton>
            )}
          </div>
          <div className="toolbar-row flex gap-1 border-t border-[var(--border-color)] pt-1.5 mt-[2px] items-center">
            <div className="toolbar-title mr-2">{t('view', { defaultValue: 'View' })}</div>
            <ViewModeButton mode="organic" current={viewMode} label={t('view_organic', { defaultValue: 'Organic Graph' })} icon={OrganicIcon} onClick={() => setViewMode('organic')} />
            <ViewModeButton mode="compact" current={viewMode} label={t('view_compact', { defaultValue: 'Compact Graph' })} icon={CompactIcon} onClick={() => setViewMode('compact')} />
            <ViewModeButton mode="list" current={viewMode} label={t('view_list', { defaultValue: 'List Tree' })} icon={FileTreeIcon} onClick={() => setViewMode('list')} />
            <ViewModeButton mode="columns" current={viewMode} label={t('view_columns', { defaultValue: 'Miller Columns' })} icon={MillerIcon} onClick={() => setViewMode('columns')} />
          </div>
          
          <div className="toolbar-row flex gap-1 border-t border-[var(--border-color)] pt-1.5 mt-[2px] items-center">
            <div className="toolbar-title mr-2">{t('taxonomy', { defaultValue: 'Taxonomy' })}</div>
            <select
              value={activeTaxonomyId}
              onChange={(e) => setActiveTaxonomyId(e.target.value)}
              className="toolbar-search p-1 text-[12px] h-[28px] flex-1"
              aria-label={t('taxonomy', { defaultValue: 'Taxonomy' })}
            >
              {availableTaxonomies.map((taxo) => (
                <option key={taxo.id} value={taxo.id}>
                  {t(`taxonomy_${taxo.id}`, { defaultValue: taxo.label })}
                </option>
              ))}
            </select>
          </div>

          <div className="toolbar-row">
              <input
                className="toolbar-search"
                placeholder={t('search_placeholder', { defaultValue: 'Go to a node (id or name)...' })}
                value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch()
              }}
              aria-label={t('search_placeholder', { defaultValue: 'Go to a node (id or name)...' })}
            />
            <div className="relative inline-block">
              <div ref={searchMenuRefs.setReference} {...getSearchMenuReferenceProps()} className="inline-block">
                <ToolbarIconButton
                  label={t('go', { defaultValue: 'Go' })}
                  onClick={() => handleSearch()}
                >
                  <ArrowRightIcon className="w-[18px] h-[18px] block" />
                </ToolbarIconButton>
              </div>
              {searchMenuOpen && (
                <div
                  ref={searchMenuRefs.setFloating}
                  style={{ ...searchMenuFloatingStyles, zIndex: 1000 }}
                  {...getSearchMenuFloatingProps()}
                  className="search-mode-menu min-w-max bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 text-sm overflow-hidden py-1"
                  role="menu"
                  aria-label={t('search_mode_menu', { defaultValue: 'Search mode' })}
                >
                  <button
                    className="search-mode-item w-full text-left px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 whitespace-nowrap transition-colors"
                    onClick={() => { handleSearch('deep'); }}
                  >
                    {t('search_deep', { defaultValue: 'Recherche approfondie' })}
                  </button>
                </div>
              )}
            </div>
          </div>
          {hasResults && (
            <div className="toolbar-row search-nav">
              <span className="search-counter">{currentResultIndex + 1}/{totalResults}</span>
              <button className="btn btn-nav" onClick={onPrevResult} title={t('prev_result', { defaultValue: 'Previous' })}>◀</button>
              <button className="btn btn-nav" onClick={onNextResult} title={t('next_result', { defaultValue: 'Next' })}>▶</button>
            </div>
          )}
          {availableTags && availableTags.length > 0 && (
            <div className="toolbar-row flex flex-wrap gap-1 px-2 py-1.5 border-t border-[var(--border-color)]">
              <div className="w-full mb-[2px] text-[12px] font-semibold flex flex-wrap items-center justify-between gap-2">
                <span>{t('tags_label', { defaultValue: 'Tags' })}</span>
                <div className="flex flex-wrap items-center justify-end gap-2 text-[11px] font-normal">
                  <label
                    className="flex items-center gap-1 whitespace-nowrap cursor-pointer select-none text-[var(--text-muted)]"
                    title={t('tags_accumulate_title', { defaultValue: 'Require all selected tags' })}
                  >
                    <input
                      type="checkbox"
                      checked={tagMatchMode === 'all'}
                      onChange={(e) => setTagMatchMode(e.target.checked ? 'all' : 'any')}
                      aria-label={t('tags_accumulate_title', { defaultValue: 'Require all selected tags' })}
                    />
                    <span>{t('tags_accumulate', { defaultValue: 'All' })}</span>
                  </label>
                  {selectedTags.length > 0 && (
                    <button 
                      onClick={() => setSelectedTags([])}
                      className="text-blue-600 dark:text-blue-400 hover:underline text-[10px] bg-none border-none cursor-pointer p-0"
                    >
                      {t('clear_tags', { defaultValue: 'Clear all' })}
                    </button>
                  )}
                </div>
              </div>
              {availableTags.map(tag => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedTags(selectedTags.filter(selectedTag => selectedTag !== tag));
                      } else {
                        setSelectedTags([...selectedTags, tag]);
                      }
                    }}
                    className={`tag-pill px-2 py-0.5 text-[11px] rounded-xl border cursor-pointer transition-all duration-200 ${isSelected ? 'bg-blue-600 text-white border-blue-600 dark:bg-blue-500' : 'bg-transparent text-gray-700 dark:text-gray-300 border-gray-300 dark:border-neutral-600 hover:bg-black/5 dark:hover:bg-white/10'}`}
                  >
                    {t(`tags.${tag}`, { defaultValue: tag })}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </>
  )
}
