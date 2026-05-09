# Changelog

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