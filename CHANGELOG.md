# Changelog

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