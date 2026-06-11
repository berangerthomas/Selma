# Changelog

## [v0.8.0] - 2026-06-11

### Added
- Accessibility: `TaxonomyNode` now exposes `role="button"`, `tabIndex`, and `aria-label`/`aria-expanded` where appropriate.
- `TaxonomyNodeData` now includes `isExpanded` field to accurately reflect the node's expansion state for `aria-expanded`.
- JSDoc documentation for `useSearchEngine` clarifying the role of the `data` parameter (spanning tree for deep search).
- `useTaxonomyData.ts` (`src/hooks/useTaxonomyData.ts`): added a DEV-only validation pass in `buildDagDataFromFiles` that warns when a child ID referenced in `children[]` has no corresponding entry in `dagData.nodes`.
- `highlightSVG.tsx` (`src/utils/highlightSVG.tsx`): added `// TODO: used when SVG export search highlight is implemented` comment to clarify the component's purpose.

### Modified
- `TaxonomyNode.tsx` (`src/components/tree/TaxonomyNode.tsx`): made node labels scale slightly with `nodeSize` so the text grows more at the largest node sizes while keeping the minimum size unchanged.
- `flowLayout.ts` (`src/utils/flowLayout.ts`): `LabelPosition 'smart'` now resolves contextually based on node category (root, has-children, leaf) and orientation (vertical/horizontal) instead of using a single static rule.
- `TaxonomyNode.tsx` (`src/components/tree/TaxonomyNode.tsx`): removed redundant smart-position logic; added auto-truncation with tooltip for long labels.
- `Toolbar.tsx` (`src/components/Toolbar.tsx`): extracted duplicated `useFloating`/`useInteractions` logic into a shared `useDropdownMenu` internal hook and replaced both floating menus with calls to this hook.
- `Toolbar.tsx` (`src/components/Toolbar.tsx`): replaced inline organic/compact view buttons with extended `ViewModeButton` using a new `isActive` prop, allowing both to share the same component.
- `Toolbar.tsx` (`src/components/Toolbar.tsx`): optimized `includeCount`/`excludeCount` calculation from two separate `.filter()` calls (O(2n)) to a single loop (O(n)).
- `useFlowGraph.ts` (`src/hooks/useFlowGraph.ts`): in `buildFlowElements`, computed `nodeOpacity` once per node and `clusterOpacity`/`edgeOpacity` once per element instead of calling `computeOpacity` repeatedly.
- `useVisualizationSettings.ts` (`src/hooks/useVisualizationSettings.ts`): moved `serializeNumber`, `deserializeNumber`, and `serializeString` to module-level constants; inlined `deserializeNodeShape`, `deserializeOrientation`, and `deserializeLabelPosition` as arrow functions in `usePersistedState` calls (removed all `useCallback` wrappers); also removed trivial setter wrappers and stabilized the remaining serializers/deserializers to avoid unnecessary re-creations.
- `useExpansionState.ts` (`src/hooks/useExpansionState.ts`): added a memoized `parentMap` via `buildParentMap` and passed it to `getParents`/`hasMultipleParents` in `collapseAll` for O(1) lookups instead of O(n) scans.
- `TreeContext.tsx` (`src/context/TreeContext.tsx`): removed legacy `'compact'`/`'organic'` migration branches from the `viewMode` deserializer (replaced by `nodeShape` in v0.8.0); added version comment.
- `Sidebar.tsx` (`src/components/Sidebar.tsx`): fixed listener ref assignment order in `handlePointerDown` — refs are now set before `addEventListener` to prevent a race condition on unmount.
- `searchRegex.ts` (`src/utils/searchRegex.ts`): translated remaining French comments to English for consistency.
- `usePersistedState` (`src/hooks/usePersistedState.ts`): stabilized `serialize`/`deserialize` via refs so inline functions no longer force callback recreation.
- `useFlowGraph` (`src/hooks/useFlowGraph.ts`): consolidated opacity rules into `computeOpacity` (applied uniformly to nodes/edges/clusters), added a per-effect color cache via a `getColor` helper to avoid repeated `getInheritedColorDag` traversals, and applied user spacing scaling to ELK before layout so ELK computes positions with correct spacing.
 - `useTaxonomyLoader` (`src/hooks/useTaxonomyLoader.ts`): extracted taxonomy registry loading and `activeTaxonomyId` persistence from `TreeContext` into a dedicated hook. Registry fetch now runs once on mount (instead of refetching on taxonomy switches) and includes explicit HTTP error handling.
 - `useExpansionState` (`src/hooks/useExpansionState.ts`): extracted expansion/collapse logic (toggle, collapseAll, expandAll) from `TreeContext` into a dedicated hook to improve testability and readability.
 - `useFlowGraph` (`src/hooks/useFlowGraph.ts`): further decomposed layout conversion into named helpers (`buildActivePathAndSubtree`, `buildFlowElements`) so the effect is mostly orchestration.
- `flowLayout` (`src/utils/flowLayout.ts`): extracted visible-node resolution, ELK graph creation, spacing mapping, and React Flow conversion into pure tested helpers; `useFlowGraph` now only orchestrates async ELK layout.
- `flowLayout` (`src/utils/flowLayout.ts`): stabilized graph layout by computing positions over the complete DAG (not just visible nodes); nodes at the same depth are now aligned on their depth axis with a secondary orthogonal separation pass to prevent overlaps.
- `TaxonomyNodeData` moved to shared project types so layout utilities no longer depend on the node component.
- `dagUtils` (`src/utils/dagUtils.ts`): added JSDoc and a development-time warning when cycles are detected; implemented minor formatting/clarity fixes.
- `TaxonomyNode` (`src/components/tree/TaxonomyNode.tsx`): extracted `NodeLabel` helper to avoid duplicated inline styles and simplified `className` logic.
- `TreeContext` (`src/context/TreeContext.tsx`): import cleanup (types now imported from `../types`) and fixed `navigateToResult` to include `dagData` in its dependency list.
- `useSearchEngine` (`src/hooks/useSearchEngine.ts`): clarified the `data` usage (deep search only), guarded deep-search execution when tree data is unavailable, and kept debug logs gated to development.
- `storage` (`src/utils/storage.ts`): exported strict `StorageKey` typing and aligned persisted-state callers to typed storage helpers.
- `App` (`src/App.tsx`): removed unused `svgRef` creation and stop passing it to `Toolbar` (TreeViz owns the SVG rendering).

### Fixed
- Stabilized a number of TypeScript typing/closure issues that could cause unnecessary re-renders or stale closures (notably in persisted-state hooks and navigation callbacks).
- Restored active-node updates on breadcrumb path navigation and root-reset behavior on repeated collapse actions after expansion logic extraction.
- Consolidated expansion-state hook naming by keeping a single canonical module: `src/hooks/useExpansionState.ts`.
- `aria-expanded` now reflects the actual expansion state instead of always being `'false'` (`TaxonomyNode` + `isExpanded` passed from `buildFlowElements`).
- `activeTaxonomyId` is now persisted to `localStorage` when the user manually switches taxonomy (`useTaxonomyLoader`).
- `clusterSpacing` in `buildFlowElements` now applies `horizontalScale`/`verticalScale` factors so cluster positioning stays consistent with user spacing preferences.
- `serializeIdentity` (unsafe `as unknown as string` cast) replaced with properly typed `serializeString` in `useVisualizationSettings`.
- Removed unnecessary `setViewMode` wrapper in `TreeContext` — `usePersistedState` already returns a stable setter.
- `MarkdownRenderer.tsx` (`src/components/MarkdownRenderer.tsx`): replaced `any`-typed component props with properly typed `Components` from `react-markdown`; added explicit `children` rendering for the `pre` component.
- Graph layout spacing now feeds ELK directly as layer/sibling spacing instead of scaling coordinates after layout.
- Active-node centering now uses the actual rendered node dimensions for both circular and rectangular nodes.
- **Multi-parent context in Miller Columns**: `findDagPath(root, target, preferredParent)` was removed during the v0.7.1 dead-code cleanup, but the MillerColumnsView context switcher described in Issue #20 §6d needs it. Re-introduced in `dagUtils.ts` with a per-path cycle guard (global `visited` would have pruned the secondary parent chain before the DFS could find the preferred path). 12 vitest cases now cover `findDagPath`, `buildSpanningTree` cross-edges, `buildParentMap`/`getParents`/`hasMultipleParents`/`findAllDagAncestors` and `hasCycle`.
- **FileTreeView multi-parent popover**: the `×N` badge now opens a Floating-UI popover (using the project's existing `@floating-ui/react` setup) listing the alternative parents. Each parent button calls `setActiveId(parentId)` and closes the popover. Closes on outside click / Escape via `useDismiss`.
- **MillerColumnsView context switcher**: when the active node is multi-parent, the last live column now shows an amber "View in:" banner with one button per parent. Clicking a parent calls `findDagPath(..., preferredParentId)` so the columns rebuild along that parent's chain. The context auto-resets when navigation leaves a multi-parent node. A memoized `parentMap` keeps the lookups O(1).
- **`NodeIcon` type relaxed**: now accepts a structural `IconableNode` (id, image, iconChar, iconFont) so it can be rendered from both `TreeNode` and `DagNode` contexts (e.g. MillerColumnsView passes raw `DagNode` rows from `findDagPath`).
- **FileTreeView popover anchoring fix**: the multi-parent popover was rendered as a sibling of the badge but its `useFloating` hook never received a `setReference` ref, so the body fell back to `0,0` of the viewport and was hidden behind the toolbar. Moved the `useFloating` instance up into `FileNode` and attached `setReference` to the badge button — the popover is now anchored to the badge and visible. The popover body was extracted into a presentational `ParentsPopoverBody` for clarity.
- **Text export ⬡ marker**: `PrintButton` called `exportTreeAsText(data, t)` without passing `dagData`, so multi-parent nodes were exported without the `⬡` marker even though the function supported it. Added `dagData` to the destructure from `useTree()` and forwarded it to the export call.

## [v0.7.3] - 2026-05-25

### Added
- **Graph orientation toggle**: A new button (↻ icon) in the "View" toolbar row lets you switch the tree graph between horizontal (root on the left) and vertical (root on top) layout. The orientation is persisted in localStorage.

### Modified
- **Performance Fix (Layout Thrashing)**: Corrected layout thrashing in `TreeViz.tsx` by replacing DOM mutation calculations with declarative SVG alignments for texts and icons (`text-anchor="middle"` and `dominant-baseline="central"`).
- **Refactoring (AttachmentList)**: Factored repeated attachment link definitions into a DRY `AttachmentLink` component, and corrected synchronous layout calculations in ResizeObserver to prevent unneeded reflows.
- **Scroll Sync (MillerColumns)**: Replaced arbitrary 50ms `setTimeout` with `requestAnimationFrame` for a more reliable horizontal scroll animation during column insertions in the Miller view.
- **Performance (Search)**: Introduced `useDeferredValue` for the user's search query, making the UI highly responsive by placing the heavy filtering calculation in the background. Cleaned up ref synchronization in `useSearchEngine`.
- **Optimization (Tree Traversals)**: Drastically optimized node path and node lookup traversals in `findNodeById` & `findNodePath` (O(N) to O(1)) by implementing `WeakMap` cached indexes inside `treeUtils.ts`.
- **Unify project title** webpage title, filename for exports now use `project_title` variable, located in the public\locales\en\taxonomy.json file.
- **Improved Toolbar Layout** and **Collapsible Toolbar Sections**: To make the interface more compact, the toolbox now features retractable sections for "Geometry", "Tools" and "Tags". Each section header is clickable to toggle visibility, and states are maintained within the session.
- **Refactor: usePersistedState**: Added the `usePersistedState` hook and replaced persisted local state in `TreeContext.tsx` to centralize `localStorage` logic.
- **Toolbar cleanup**: Removed unused `closeTimerRef`, consolidated section state into a single `openSections`, and extracted the auto-layout handler into `src/utils/autoLayout.ts`.
- **Taxonomy data improvements**: Made the `nodes.json` cache resettable via `clearNodesDictCache()` (useful for tests/HMR) and moved format validation to the start of `buildDagDataFromFiles`.
- **Debug logs gated**: Guarded `console.debug` calls for empty search results behind `import.meta.env.DEV` in `useSearchEngine`.
- **Typing fixes**: Replaced avoidable `any` usages in `Toolbar.tsx` and `useDiagnostics.ts`.
- **Storage keys**: Documented inconsistency in `STORAGE_KEYS` and added `migrateThemeKeyToSelma()` helper for manual theme-key migration.
- **Dead code removed**: Removed the commented `window.close()` from the SVG export flow.


## [v0.7.2] - 2026-05-21

### Added
- **Copy button on code blocks**
- **Layout sliders**: Three sliders (Node size, H. spacing, V. spacing) in the toolbar let you dynamically adjust the appearance of the graph tree without editing configuration files.
- **Auto-layout button**: A "magic wand" button automatically computes optimal node size and spacing based on label lengths and node count, then applies them in one click.
- **Tree view unification**: The former "Organic graph" and "Compact graph" view modes are now two visual variants of a single `tree` view mode — "Organic" uses circular nodes (`nodeShape: 'circle'`) with bezier links, while "Compact" uses rectangular nodes (`nodeShape: 'rect'`) with orthogonal elbow links. Both share the same layout engine and respond to the same sliders.

### Modified
- **Customize code rendering** to better fit tailwindcss/typography style
- **Storage keys**: Replaced the remaining raw localStorage key strings with `STORAGE_KEYS` across the tree context and theme/url sync hooks.
- **Print flow**: Centralized the repeated SVG blob-to-base64 conversion and translated the popup-blocked toast through `useI18n` in the print hooks.
- **Navigation reuse**: Routed history and URL navigation through the shared node-navigation callback instead of duplicating the path expansion block.
- **File tree rendering**: Cached multi-parent lookups once per node in `FileTreeView` instead of recomputing them for each badge attribute.
- **i18n cleanup**: Aligned `PrintMarkdownButton` with the project-wide `useI18n` hook.
 - **Toolbar**: Extracted tag toggle logic into a `handleTagToggle` callback for clarity and testability.
 - **Print utility**: Removed the UI-dependent `openPrintWindowOrToast` from `printWindow.ts`; print hooks now display the translated "popup blocked" toast themselves.
 - **Text size**: `useTextSize` now uses `STORAGE_KEYS.textSize` for persistence consistency.
 - **View mode switch**: Clicking the Organic or Compact button no longer switches `viewMode`; both set `viewMode` to `'tree'` and differ only by `nodeShape`. The List Tree and Miller Columns remain separate independent view modes.

### Fixed
- **Attachments**: Fixed a bug where downloaded files were renamed based on the `name` field, causing extension issues if the name contained a dot; files now use their original filename from the `path` for the download attribute.
- **URL sync**: Preserved full `?taxonomy=...&node=...` URLs during initial hydration and refresh, and added a non-regression test for the `node` query param.
- **Tests**: Added a small Vitest regression test covering the URL parsing behavior for full taxonomy + node links, and added unit tests for `src/utils/storage.ts` (covering `safeLocalStorageGet`, `safeLocalStorageSet` and `STORAGE_KEYS`).
- **Dropdown menu height**: modified again to show full text height.
- **Footer**: Lowered the `Built with Selma` z-index so it appears beneath the Markdown panel.

## [v0.7.1] - 2026-05-16

### Added
- **Validation Terminal Script**: Added the `npm run check-data` CLI workflow (`scripts/check-data.mjs`), which reports directly to the console any data discrepancy: unregistered files within `public/attachments/`, dead attachment paths declared in JSON but missing on disk, and translation coverage gaps per locale.
- **Tag filtering mode**: Added a compact toggle to switch tag filtering between the default matching mode and cumulative matching.
- **Cache resilience**: `useTaxonomyData` no longer caches failed `nodes.json` fetches, allowing retry on subsequent taxonomy switches.
- **Markdown request cancellation**: `Sidebar` now uses `AbortController` to cancel in-flight markdown fetches when the active node changes, preventing stale updates.
- **History deduplication**: `useNavigationHistory` and `useUrlSync` now coordinate via the shared `isNavigatingHistory` ref to prevent duplicate `pushState` entries when navigating back/forward.
- **Function memoization**: `findVisibleOrClusterNode`, `linkPath`, and `getDisplayY` in `TreeViz` wrapped in `useCallback`.
- **`findNodePathIds` helper**: Extracted the 9x-repeated `findNodePath(…).map(n => n.id)` pattern into a single utility in `treeUtils.ts`.
- **`splitByHighlight` utility**: Shared splitting logic across `HighlightMatch` and `HighlightSVGText` via `searchRegex.ts`.
- **`openPrintWindowOrToast`**: Unified the "pop-up blocked" pattern across the 3 print hooks into `printWindow.ts`.
- **Deduplicated `useI18n`**: Removed the redundant second `useI18n()` call in `PrintButton.tsx`.
- **`STORAGE_KEYS` constants**: Centralized all localStorage key literals into `src/utils/storage.ts`.
- **`React.memo` on node components**: Wrapped `OrganicNode`, `CompactNode`, `ClusterNode`, and `FileNode` with `React.memo`.
- **`setTimeout` removal**: Replaced fragile `setTimeout(…, 80)` in `FileTreeView` with direct batchable state updates.
- **Stricter types**: Replaced `Record<string, any>` with `Record<string, NodeEntry>` and proper locale data types in `useDiagnostics.ts`.
- **Dead code removal**: Deleted unused `findDagPath` from `dagUtils.ts`.
- **Toolbar style cleanup**: Replaced 15 inline `const style` objects in `Toolbar.tsx` with direct Tailwind classes.

### Modified
- **TreeViz orchestration split**: extracted the zoom, link, and node rendering responsibilities into `useTreeZoom`, `TreeLinks`, and `TreeNodesRenderer` so `TreeViz` now mainly coordinates layout and sidebar state.
- **Settings Modal Refactoring**: Extracted monolithic business logic from `SettingsModal.tsx` into a dedicated custom hook (`useDiagnostics.ts`).
- **Settings Modal Component Split**: Decomposed the unified `SettingsModal` into distinct tab sub-components (`ProjectTab`, `NodesTab`, `TranslationsTab`, `AttachmentsTab`) for clarity and maintainability.
- **Diagnostics**: Fixed a pathing bug causing diagnostic fetches to fail on sub-directories (like GitHub Pages) by strictly relying on `import.meta.env.BASE_URL`.
- **Diagnostics**: Improved Attachment parsing algorithms to safely prevent partial matches inside filenames from being erroneously processed as language codes.
- **Diagnostics**: Stopped hard-coding default fallback colors like `#6b7280` when scaffolding unknown nodes.
- Automatic resolution of leaf nodes from nodes.json. Taxonomy files (`public/data/taxonomies/*.json`) no longer need to define an end node for each font referenced in `children[]`. From now on, any ID that appears in a taxonomy’s `children` array but is not a key in the taxonomy file is automatically resolved from `public/data/nodes.json`.

### Fixed
- Move up search buttons
- Correct dropdown menu "Taxonomy" height

## [v0.7.0] - 2026-05-13

This version introduces the use of tags in Selma. You can filter nodes by clicking on individual tags in the toolbox on the main screen.

### Added
- Added support for node tags, allowing filtering the taxonomy tree and visualizing them in node details.
- Integrated translated tags directly into the search engine, matching taxonomy node queries based on their tags (translated or not) via standard search fields.
- Implemented visual indicators (pills) for node tags in the Markdown Viewer:
  - Sticky footer displaying tags dynamically in the Sidebar details panel.
  - Fixed-position tag indicators at the bottom of the standalone Markdown Viewer mode.
  - Tag queries hit by searches are highlighted in real-time within the panel using `<mark>` indicators.
- Added `FALLBACK_COLOR` constant in `types.ts` shared between `dagUtils.ts` and `treeUtils.ts`.
- Added `buildParentMap` utility in `dagUtils.ts` for O(1) inverse parent lookups.
- Added `PrunedNode` type in `types.ts` (centralized, was duplicated in `TreeViz.tsx` and `dagUtils.ts`).
- Implemented module-level shared Markdown cache in `fetchMarkdownContent` utility.

### Changed
- Wrapped `onToggleNode`, `clearSelection`, and `colorFor` in `TreeViz.tsx` with `useCallback`.
- Integrated `parentMap` in `TreeViz.tsx` and `FileTreeView.tsx` to enable O(1) parent lookups during render.
- Properly typed `linkGenerator` D3 utility in `TreeViz.tsx`.
- Cached `nodes.json` fetch at module level in `useTaxonomyData.ts` (avoids refetch on taxonomy switch).
- Added optional `parentMap` parameter to `getParents`/`hasMultipleParents`/`getInheritedColorDag` for O(1) lookups.
- Replaced duplicated fallback color literal `'#6b7280'` with shared `FALLBACK_COLOR`.
- Extracted `openPrintWindow` utility in `src/utils/printWindow.ts` (shared by `usePrintHTML`, `usePrintMarkdown`).
- Replaced hover `useState` with CSS-only hover in `ClusterNode` (removes React reconciliation on mouse hover).
- Removed `t` prop from `ClusterNode`, `CompactNode`, `OrganicNode` — each now calls `useI18n()` directly.
- Renamed `Toolbar` style constants for clarity (`FLEX_ROW_STYLE` → `TOOLBAR_ACTIONS_STYLE`, `TEN_PX_FONT` → `HELP_TOGGLE_ICON_STYLE`, etc.) and extracted tags section styles.

### Fixed
- Fixed redundant Markdown fetches by unifying the cache system across Sidebar and Deep Search.
- Fixed stale closure bug in `useSearchEngine` search effect using `useRef` for search results and index tracking.
- remove duplicate SVG transform on node sub-components (ClusterNode, OrganicNode, CompactNode) that caused nodes to render at twice their intended coordinates
- Fixed "useToast must be used within a ToastProvider" error when opening the standalone Markdown viewer window.
- Fixed TypeScript error in `useTaxonomyData.ts` (missing `name` property on `DagNode` assignment).
- Fixed "Rendered more hooks than during the previous render" error in `TreeContext.tsx` by moving `useMemo(value)` before early returns.
- Unified `usePrintSVG.ts` with other print hooks by using the shared `openPrintWindow` utility.
- Removed unnecessary type casts in `TreeViz.tsx` by improving hierarchy node typing.

## [v0.6.3] - 2026-05-09

### Fixed
- Fixed missing `fitView` dependency in `TreeViz.tsx`.
- Fixed `dim` calculation to be boolean in `TreeViz.tsx`.

### Changed
- Removed unused `lastActiveRef` in `TreeViz.tsx`.
- Removed unused `_activeId` parameter in `useNavigationHistory`.
- Cleaned up `document.fonts` usage in `TreeViz.tsx`.
- Improved typing for `proseSize` to remove `as any` in `Sidebar.tsx`.
- Improved typing for `structNode` in `useTaxonomyData.ts`.
- Simplified `links` useMemo dependency in `TreeViz.tsx`.

## [v0.6.2] - 2026-05-09

### Added
- `src/utils/storage.ts` to share `safeLocalStorageGet`/`safeLocalStorageSet` helpers.

### Modified
- Removed `as any` related to `t` function by introducing `TranslateFn` type in `src/utils/searchRegex.ts`.
- Optimized `TreeViz.tsx` by using `d3NodeMap` and `treeNodeMap` (O(1) lookups instead of O(n) searches).
- Simplified `buildSpanningTree` in `src/utils/dagUtils.ts` using spread/conditional properties.
- Removed `searchContentCacheRef` from `useSearchEngine` public return (internal ref leak).

### Fixed
- Fixed duplicated `safeLocalStorageSet` in `useUrlSync.ts`, `TreeContext.tsx`, `useTheme.ts`, and `useTextSize.ts`.
- Fixed indentation in `TreeContextType`.
- Removed remaining `as any` and cleaned up D3 layout logic in `TreeViz.tsx`.

## [v0.6.1] - 2026-05-09

### Added
- `ToastContext`/`ToastProvider` notification system in `src/context/ToastContext.tsx` (replaces `alert()` calls in print hooks)
- `useUrlSync` hook in `src/hooks/useUrlSync.ts` (extracted URL ↔ state synchronization from TreeContext)
- `useNavigationHistory` hook in `src/hooks/useNavigationHistory.ts` (extracted back/forward history stack from TreeContext)
- `useSearchEngine` hook in `src/hooks/useSearchEngine.ts` (extracted search logic from TreeContext)
- `useDeepSearch` hook in `src/hooks/useDeepSearch.ts` (extracted deep search fetch logic from `useSearchEngine`)
- `ClusterNode`, `CompactNode`, `OrganicNode` subcomponents in `src/components/tree/` (extracted from `TreeViz.tsx` node rendering)
- `AbortController` for taxonomy fetch in TreeContext.tsx (cancellable fetch on unmount)
- Shared `buildHighlightRegex` utility in `src/utils/searchRegex.ts` (extracted from duplicated regex in highlight.tsx, highlightSVG.tsx, MarkdownRenderer.tsx)
- Shared `nodeMatchesQuery` predicate in `src/utils/searchRegex.ts` (extracted from duplicated matching in treeUtils.ts, dagUtils.ts)
- Shared `fetchMarkdownContent` utility in `src/utils/fetchMarkdown.ts` (extracted from duplicated fetch+fallback pattern in Sidebar.tsx, TreeContext.tsx)
- Shared `downloadRasterImage` helper in `usePrintSVG.ts` (factorized `downloadPNG`/`downloadJPG`)
- Shared `navigateHistory` helper in `TreeContext.tsx` (factorized `goBack`/`goForward`)
- `ViewModeButton` sub-component in `Toolbar.tsx` (factorized 4 view mode buttons)
- `ViewMode` type export used by `ViewModeButton`

### Modified
- Extracted inline style objects to module-level constants in `Toolbar.tsx` (avoids recreation on each render)
- Wrapped `centerOn` and `fitView` in `useCallback` in TreeViz.tsx (stabilizes deps for useEffect)
- Replaced `React.useReducer` with destructured `useReducer` in TreeContext.tsx (consistent with other imports)
- Removed unnecessary `as React.LegacyRef` cast on SVG refs in TreeViz.tsx
- Translated French comments to English in TreeViz.tsx and localization.ts
- Refactored TreeContext.tsx to compose extracted hooks (`useUrlSync`, `useNavigationHistory`, `useSearchEngine`)
- Replaced `alert()` with `showToast()` in usePrintSVG.ts, usePrintHTML.ts, usePrintMarkdown.ts
- Removed unused `lastLangRef` from TreeViz.tsx
- Removed dead `handleTouchStart` handler from Sidebar.tsx
- Removed unused `activeSubtree` and `collectSubtreeIds` from TreeViz.tsx
- Replaced inline regex in highlight.tsx, highlightSVG.tsx, MarkdownRenderer.tsx with shared `buildHighlightRegex`
- Replaced inline node matching in treeUtils.ts, dagUtils.ts with shared `nodeMatchesQuery`
- Replaced inline downloadPNG/downloadJPG in usePrintSVG.ts with shared `downloadRasterImage`
- Replaced inline goBack/goForward in TreeContext.tsx with shared `navigateHistory`
- Replaced inline view buttons in Toolbar.tsx with `ViewModeButton` sub-component
- Refactored Sidebar.tsx fetch logic to use shared `fetchMarkdownContent` (removed `isHtmlResponse` helper)
- Refactored TreeContext.tsx deep search fetch loop to use shared `fetchMarkdownContent`
- Extracted node rendering into `ClusterNode`, `CompactNode`, `OrganicNode` subcomponents in `TreeViz.tsx`
- Renamed `tx`/`ty` parameters in `linkPath` to `targetX`/`targetY`/`sourceX`/`sourceY` in `TreeViz.tsx`
- Removed superfluous `collapseDepth` parameter from `buildPrunedHierarchy` (was always called with `1`)
- Refactored `useSearchEngine` to delegate deep search to `useDeepSearch.performDeepSearch` (replaced inline IIFE)

### Fixed
- Removed duplicate `if (!data) return null` guard in TreeContext.tsx
- Removed unused `TreeNode` import in useTaxonomyData.ts
- Fixed missing `taxonomyId` argument in `useTaxonomyData()` call in MarkdownViewerPage.tsx
- Cleared Markdown search cache (`searchContentCacheRef`) on taxonomy switch in TreeContext.tsx
- Replaced noisy `console.warn` with `console.debug` for empty search results in TreeContext.tsx
- Wrapped all `localStorage` accesses in try/catch via `safeLocalStorageGet`/`safeLocalStorageSet` helpers (TreeContext.tsx, useTheme.ts, useTextSize.ts)

## [v0.6.0] - 2026-05-09

### Added
- **Multiple Taxonomies**: Ability to define and instantly switch between multiple taxonomy structures (e.g. Genealogical vs Chronological) using the same unified nodes dataset.
- **DAG (Directed Acyclic Graph) Support**: Complete migration from strict tree model to DAG model supporting nodes with multiple parents.
  - **Cross-edges visualization**: Visual representation of secondary parent-child relationships in both Organic and Compact graph modes.
  - **Multi-parent indicators**: Visual cues (amber rings, badges, sidebar sections) to identify nodes belonging to multiple branches.
  - **Context-aware navigation**: Enhanced sidebar showing "Also appears in" section with navigation to other parent nodes.
  - **DAG utilities**: Comprehensive set of utility functions in `src/utils/dagUtils.ts` for DAG traversal, cycle detection, and path finding.
 - Note: transition durations have been centralized under the `ANIMATION_MS` variable for easy tuning.
 - **Feature**: Added automatic color inversion for Markdown SVG images in dark mode, introducing a `-color.svg` filename convention to opt-out and preserve original colors.
- **Project Title & Help**: Added an internationalizable project title and mini-help section integrated at the top of the Toolbar. Configurable via `project_title` and `project_help` keys in `public/locales/[lang]/taxonomy.json`.

### Modified
- **Data model**: Extended `TreeNode` and added `DagNode`, `DagData`, `CrossEdge` types to support DAG topology.
- **Core architecture**: Updated `TreeContext` to manage both spanning tree (for rendering) and DAG data (for multi-parent relationships).
- **Visualization components**: Enhanced `TreeViz`, `FileTreeView`, `MillerColumnsView`, `Breadcrumb`, and `Sidebar` with DAG awareness.
- **Search system**: Migrated from recursive tree traversal to DAG-aware search using `findMatchingIds`.
- **Export functionality**: Updated `exportTreeAsText` to annotate multi-parent nodes with visual indicators.
- **Settings modal**: Fixed node counting to work with both legacy and new DAG formats.

## [v0.5.1] - 2026-05-01

### Added
- Developer: `src/utils/download.ts` (shared download helper) and `src/components/NodeIcon.tsx` / `src/components/icons/ChevronRight.tsx` extracted for reuse.

### Modified
- Refactor: Extracted shared components and hooks (`useSidebar`, `NodeIcon`, `ChevronRight`) and centralized several utilities in `src/utils/` to remove duplication.
- Type system: Enabled `noUnusedLocals` and `noUnusedParameters` and fixed resulting TypeScript issues across the codebase.
- Data & search helpers: Added `getAllNodeIds` and removed dead parameters from `findAllPathsByQuery` to simplify API surface.
- i18n: Standardized `useI18n` usage (removed direct `react-i18next` imports from components) and cleaned initialization code.

### Fixed
- Code quality: removed phantom hook dependencies and dead parameters, hoisted internal types to module scope where appropriate.
- Build: resolved all TypeScript compiler errors under the new stricter `tsconfig` settings.


## [v0.5.0] - 2026-04-29

### Added
- **German Localization**: Added German (`de`) as a dynamically supported language in the taxonomy demo shipped with Selma.
- **Content copy**: Added a universal "Copy" button (`CopyButton` component) to copy markdown contents directly from the interactive Sidebar or the standalone Markdown Viewer.
- **Multi-view Support**: Selma now natively supports 4 dynamic visualization modes for exploring your taxonomy, accessible from the main toolbar:
  - **Organic Graph**: The default organic node-and-link clustered view.
  - **Compact Graph**: A tighter, box-based version of the graph using orthogonal links.
  - **List Tree**: A classic vertically cascading collapsible tree.
  - **Miller Columns**: A cascading column-based workflow ideal for navigating deep hierarchies without overlap.
- **Indented text export** when in "Miller's columns" or "File tree" mode.
- **Attachment indicator**: Nodes that have downloadable attachments now show a small document icon directly in all visualization modes.
- **Improved Toolbox UI**: Added a view-switcher section inside the active toolbox. Visual modes seamlessly adapt to browser size and sidebar presence.

### Modified
- **Copy component**: Refactored the `SettingsModal` internal copy functions into a globally reusable `CopyButton` component and `clipboard.ts` utility.
- Removed unnecessary copy and download restrictions from the translation Settings modal.

### Fixed
- **Sidebar resize**: Fixed a bug where dragging the sidebar resize handle past the maximum width (and releasing the mouse outside the sidebar) would cause the sidebar to close instead of staying open at its maximum width. A transient click-capture handler now prevents the stray click event from propagating to the container.

## [v0.4.0] - 2026-04-21

### Added
- **Deep search**: Added an advanced search module that inspects the full contents of Markdown files, in addition to titles.
- **Result highlighting**: Dynamically highlights matched text in the interactive tree, sidebar headings, and article body when deep search is enabled.
- **Node File Attachments**: Added support for associating downloadable attachments (PDFs, PPT, etc.) directly to any node in `structured_taxonomy.json`.
- **Translations maintenance (dev-only)**: Added a developer-only Settings modal with a "Translations" tab. It shows per-language translation coverage against `structured_taxonomy.json` and lets maintainers download a fully scaffolded `taxonomy.[lang].json` that merges existing translations and inserts `[TODO] <English name>` placeholders for missing nodes.
- **Attachments Settings Tab**: Extended the dev-only Settings modal with an "Attachments" tab to auto-discover files from `/public/attachments/` and scaffold missing `attachments` properties into `structured_taxonomy.json`.

### Modified
- **Refactor (Icons)**: Extracted and centralized all inline SVG icons to reusable React components using `vite-plugin-svgr` for cleaner code and improved styling via Tailwind.
- Refactored `TreeViz.tsx` to extract helper functions (`computeBounds`) and properly expose `PrunedNode`.
- Performance: `src/components/TreeViz.tsx` — replaced React `transform` state with direct DOM updates via an inner `<g>` ref to eliminate re-renders during zoom/pan; added D3 `.separation(...)` to reduce vertical spacing between cousin nodes.
- Refactored `Toolbar.tsx` and `MarkdownViewerPage.tsx` to reuse extracted `ThemeIcon` and `LangMenu` components.
- Updated search behavior: toolbar search arrow performs a simple search (matches only node `id` and localized `name` in the current language); the hover menu now exposes a `deep` search option that performs a runtime Markdown fetch across `/details/*` for more thorough matches.
- Extracted shared export format preparations into `prepareSVG` within `usePrintSVG.ts`.
- Replaced fragile CSS class string matching in `TabbedMarkdown.tsx` with a strongly typed `proseSize` prop.
- Extracted `isHtmlResponse` to a top-level helper in `Sidebar.tsx`.
- Improved TypeScript typings in `TreeViz.tsx` (`zoomRef`, `Props`).
 - Removed runtime usage of the `description` field from node data: `taxonomy.json` no longer requires `description` entries; node content is sourced from Markdown detail files and search no longer matches `description`. The UI fallback key `description_not_provided` is preserved.

### Fixed
- Fixed standalone Markdown viewer fallback behavior to correctly display "No description provided." instead of rendering `index.html` fallback source when a markdown file does not exist, and properly displays the localized node name when data becomes available.
- Fixed i18n fallback behavior when only one language is present by restoring reliable `React.Suspense` usage, removing manual pre-fetch hacks, and properly detecting all available language directories in `src/utils/localization.ts`.
- Fixed responsive `fitView` bug on smaller screens by removing the hardcoded `viewBox="0 0 1200 800"` on the TreeViz SVG. The D3 transformation now accurately handles native screen bounds.
- Fixed `activeIdRef` synchronization in `TreeViz.tsx` to prevent stale closure bugs in D3 callbacks.
- Fixed silent export failures for PNG/JPG on very large taxonomies by dynamically downscaling the output to fit maximum supported browser canvas dimensions.
- Removed duplicate `useLayoutEffect` hook in `TreeViz.tsx` to stop redundant initializations.
- Fixed touch event memory leak in `Sidebar.tsx` by clearing listeners correctly via refs.
- Fixed stale history closures in `TreeContext.tsx` by migrating the `historyStack` state to a `useReducer`.

## [v0.3.0] - 2026-04-15

### Added
- **Text Size**: Added 'A+' and 'A-' buttons to adjust the text size dynamically in the Sidebar and standalone Markdown viewer (`useTextSize` hook).
- **Export**: Added tools to export the D3 taxonomy tree (SVG, PNG, JPG).
- **Printing**: Added native print support for the interactive tree and standalone Markdown pages.
- **Navigation History**: Added intra-session previous/next buttons to the toolbar with a custom history stack, allowing users to navigate between visited nodes without relying on the browser's history.
- **UI & Controls**: Added an "Expand all" button to the toolbar.
- **Tree node**: Added ability to set an `image` or an `iconChar` and `iconFont` in `TreeNode` objects, to show an icon within the SVG node bubbles, or to display dingbat fonts (e.g. Material Symbols) inside node bubbles.
- **Multilingual Text Icons**: Added support for language-dependent node letters/abbreviations by allowing `iconChar` and `iconFont` to be overridden per language in `common.json` localization files.
- **Examples**: added examples for image and font tree node use.
- **Markdown Images**: Enhanced `MarkdownRenderer` to automatically resolve relative image paths natively based on the Markdown file's location. Added three different examples (resp. photos, dynamic localized SVGs, and local SVGs) into sample nodes (`lion.md`, `honeybee.md`, `mammals.md`).
- **Documentation**: Migrated the legacy `README.md` details to a dedicated VitePress documentation site.

### Modified
- **Export Menu**: Improved the Export menu positioning and interaction using Floating UI to prevent off-screen overflow on hover.
- **UI & Controls**: Replaced the language switch buttons (which cycled through languages on click) with a hover-activated dropdown showing all available languages.
- **Fonts Architecture**: Moved custom taxonomy fonts from `src/assets/` to `public/assets/` to fully decouple user-specific node typographies from the React application source code.
- **Localization Architecture**: Separated `common.json` into `taxonomy.json` (user data) and `ui.json` (interface strings) to prevent user data loss during application updates while preserving the fallback to English for UI strings.
- **UI**: Updated and unified toolbar icons with new stylized designs.
- **UI / Controls**: Updated the "Collapse all" toolbar control to a two-step behavior: first click collapses all branches except the branch leading to the currently selected node (keeps the active path expanded), second click collapses the entire tree to the root.
- **Renamed "Home" button**: now "FitView", which better describes the button usage.
- **Tree Visualization**: Improved the "FitView" view zoom and centering logic to properly fit the available screen space without overlapping the sidebar, breadcrumbs, or floating toolbar.
- **Legend**: Removed special-case "legend" breadcrumb handling and related UI; the breadcrumb shows node paths only and no longer treats a node with id `legend` as a UI legend.

### Fixed
- **Print / Export translations**: Fixed missing i18n translations for the Export menu buttons by correcting the translation namespace (from `common` to `ui`).
- **Search Focus**: Fixed a bug where switching languages would unexpectedly steal focus and force the view back to the active search result, hiding the currently selected node.
- **Tree zoom**: Added automatic fit-to-view after "Expand all" and "Collapse all", and fixed the related `resetView` initialization issue.
 - **Initial FitView**: Call `fitView` on initial page load to ensure large trees fit the viewport (prevents excessive initial zoom). Extracted the `fitView` routine and reused it for `resetViewTrigger`.
- **Hugging Face compatibility**: Modified the standalone markdown viewer routing to use URL parameters (`?route=markdown-viewer`) instead of a sub-path (`/markdown-viewer`) to prevent 404 "Entry not found" errors on static hosts.
- **TypeScript**: Fixed a type error related to the `node.id` and `lang` variables in the `Sidebar.tsx` component.
 - **i18n**: Localized UI strings for the theme toggle and print/export buttons; added translation keys `toggle_theme` and `print.export` to the `public/locales` sample files.

## [v0.2.0] - 2026-04-09

### Fixed
- **Markdown rendering**: Fixed Tailwind CSS Typography implementation (v4 syntax and `prose` classes application in tabbed/linear modes).
- **UI**: theme and icons fixes.

### Modified
- **New example set**: animal kingdom instead of fruit taxonomy. More complex; deeper levels.

### Added
- Tabbed view (Markdown sections '##' automatically create tabs).
- **Dynamic Localization**: Supported languages are now automatically detected based on the directory structure in `public/locales/` during the build process, replacing hardcoded language arrays.

## [v0.1.0] - 2026-04-04

Selma is intended as a starting point for educational or documentation sites driven by a taxonomy.

- Initial release — reference implementation and template.

- Key features:
  - Interactive visualization of a hierarchical taxonomy using D3 (panning/zooming, automatic centering, deep-branch clustering).
  - Sidebar displaying detail pages in Markdown; supports localized content (`public/details/en/`, `public/details/fr/`).
  - Internationalization via i18next with language detection.
  - Search and controls (collapse all, reset view, result navigation) and breadcrumb.
  - Enhanced Markdown rendering: KaTeX for math and syntax highlighting for code blocks.
  - Built with TypeScript, React + Vite, and Tailwind CSS.

- Included content:
  - Example taxonomy: `public/structured_taxonomy.json`.
  - Example detail pages: `public/details/*` (EN/FR) and translation files in `public/locales/*`.
- **P3 — Finalisation des types stricts dans useDiagnostics**: Correction des instances restantes de \Record<string, any>\ vers \Record<string, NodeEntry>\ et \Record<string, LocaleFile>\ afin de sécuriser le code asynchrone.
