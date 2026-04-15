# Selma

[![Demo](https://img.shields.io/badge/demo-Hugging%20Face-orange?logo=huggingface&style=flat)](https://huggingface.co/spaces/berangerthomas/selma) [![Documentation](https://img.shields.io/badge/docs-GitHub%20Pages-blue?logo=github&style=flat)](https://berangerthomas.github.io/selma/) [![License](https://img.shields.io/badge/license-MIT-brightgreen?style=flat)](LICENSE) [![Release](https://img.shields.io/github/v/release/berangerthomas/selma?label=release&style=flat)](https://github.com/berangerthomas/selma/releases) [![React](https://img.shields.io/badge/-React-61DAFB?logo=react&logoColor=white&style=flat)](https://reactjs.org/) [![Vite](https://img.shields.io/badge/-Vite-646cff?logo=vite&logoColor=white&style=flat)](https://vitejs.dev/) [![D3](https://img.shields.io/badge/-D3-f9a03c?logo=d3&logoColor=white&style=flat)](https://d3js.org/) [![Tailwind CSS](https://img.shields.io/badge/-Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white&style=flat)](https://tailwindcss.com/)

Selma is a React + Vite application for visualizing and navigating hierarchical taxonomies. It renders a JSON-based tree as an interactive node-link diagram (D3.js), supports multilingual content, and provides export/print helpers for diagrams and node content.

## Table of contents

- [Quick start](#quick-start)
- [Overview & key features](#overview--key-features)
- [Project layout & architecture](#project-layout--architecture)
- [Data schema (`structured_taxonomy.json`)](#data-schema-structured_taxonomyjson)
- [Content authoring & localization](#content-authoring--localization)
- [Screens & controls (UI)](#screens--controls-ui)
- [Deployment & CI](#deployment--ci)
- [Technical reference](#technical-reference)
- [Updating Selma (forks / upgrades)](#updating-selma-forks--upgrades)
- [FAQ / Troubleshooting](#faq--troubleshooting)
- [Contributing & development](#contributing--development)
- [License](#license)

## Quick start

Requirements: Node.js (LTS, Node 18+ recommended; project works with current stable Node versions). Using Node 24+ is fine if CI targets it.

Clone, install and run locally:

```bash
git clone https://github.com/berangerthomas/selma.git
cd selma
npm ci
npm run dev
```

Build for production and preview locally:

```bash
npm run build
npm run preview
```

## Overview & key features

- Programmatic graph rendering: transforms a structured JSON payload into an interactive node-link diagram (D3).
- Modular architecture: decoupled rendering, translation loading and markdown-driven node content.
- Native localization: asynchronous loading of `taxonomy.json` and `ui.json` per language with safe fallbacks.
- Export & print: inline fonts/images into exported SVG; produce PNG/JPG via canvas rasterization.

## Project layout & architecture

Top-level layout (important folders and files):

- `public/` — static assets and runtime content
	- `public/structured_taxonomy.json` — canonical taxonomy tree (source of truth)
	- `public/details/[lang]/[nodeId].md` — localized Markdown per node
	- `public/locales/[lang]/taxonomy.json` — node translations (names, descriptions, icon overrides)
	- `public/locales/[lang]/ui.json` — interface strings
- `src/` — React + D3 application
	- [src/context/TreeContext.tsx](src/context/TreeContext.tsx) — application state, search and URL sync
	- [src/components/TreeViz.tsx](src/components/TreeViz.tsx) — D3 layout and rendering
	- [src/components/Sidebar.tsx](src/components/Sidebar.tsx) — node detail panel and Markdown loader
	- [src/components/MarkdownRenderer.tsx](src/components/MarkdownRenderer.tsx) & [src/components/TabbedMarkdown.tsx](src/components/TabbedMarkdown.tsx) — markdown rendering and tab extraction
	- [src/hooks/useTaxonomyData.ts](src/hooks/useTaxonomyData.ts) — taxonomy fetch and caching

Data flow (high level):

1. App fetches `/structured_taxonomy.json` on startup (`useTaxonomyData`).
2. `TreeViz` prunes/arranges the tree and renders the SVG with D3.
3. Selecting a node triggers `Sidebar` to fetch `/details/<lang>/<nodeId>.md` (fallback to unlocalized file) and render tabs from `##` headers.
4. Translations are loaded via `i18next` HTTP backend configured in [src/i18n.tsx](src/i18n.tsx).

Notes:
- Keep user-provided content under `public/locales/` and `public/details/` to simplify upgrades.
- Supported languages are discovered at build/start using `import.meta.glob`; after adding a new `public/locales/<lang>/` folder restart the dev server.

## Data schema (`structured_taxonomy.json`)

Minimal node example:

```json
{
	"id": "mammals",
	"name": "Mammals",
	"description": "Warm-blooded, hair-bearing vertebrates",
	"color": "#f97316",
	"image": "/assets/nodes/mammal.svg",
	"iconChar": "🐾",
	"iconFont": "\\"NotoEmoji\\"",
	"children": []
}
```

Field reference:

- `id` (string, required): stable identifier for lookups, translations and URLs. Recommended pattern: `^[a-z0-9_\\\\-]+$`. Avoid renaming ids.
- `name` (string): default label shown when no translation exists.
- `description` (string, optional): short description; can be overridden by localized `taxonomy.json`.
- `color` (string, optional): CSS color for node background.
- `image` (string, optional): path under `/assets/` used as a node image.
- `iconChar` (string, optional) and `iconFont` (string, optional): glyph-based icons.
- `children` (array): nested node objects.

Precedence for visuals: localized overrides (in `public/locales/<lang>/taxonomy.json`) → `image` → `iconChar`/`iconFont` → text label.

Recommended practices:

- Keep `id` stable and compact.
- Prefer `/assets/` absolute paths for images.
- Use `image` for rich SVG icons and `iconChar` for lightweight glyphs.

## Content authoring & localization

File locations & resolution:

- Localized node content: `public/details/<lang>/<nodeId>.md`.
- Fallback: `/details/<nodeId>.md` if localized file is missing.
- Translations: `public/locales/<lang>/taxonomy.json` (node data) and `public/locales/<lang>/ui.json` (interface strings).

Authoring notes for Markdown:

- Use a single H1 title. Content before the first `##` becomes the intro.
- Use `##` to create tabs (handled automatically by `TabbedMarkdown`).
- Prefer absolute `/assets/...` paths for images stored in `public/`.

Images and icons:

- Absolute paths starting with `/` resolve from `public/`.
- Relative paths in Markdown are resolved relative to the Markdown file by `MarkdownRenderer`.
- For webfonts, add files under `public/assets/fonts/` and reference them from `public/assets/fonts/custom-fonts.css`.

Localization model:

- `public/locales/<lang>/taxonomy.json` maps node ids → localized `name`, `description`, and optional `iconChar`/`iconFont`.
- `public/locales/<lang>/ui.json` contains interface strings used by `i18next`.

## Screens & controls (UI)

Main UI areas:

- Central interactive SVG tree (`TreeViz`) — pan/zoom, cluster/collapse behaviour.
- Floating Toolbar — search, language/theme toggles, fit/expand/collapse, export.
- Sidebar — node Markdown viewer with tab extraction from `##` headings.

Key interactions:

- Click a node to show details in the Sidebar; the URL is synchronized with `?node=<id>` for deep links.
- Search by id/name/description and cycle results with next/previous controls.
- Use the toolbar for language switching, theme toggle and exporting the current view as SVG/PNG.
- Adjust the reading text size dynamically from the Sidebar or the standalone Markdown viewer.

Implementation pointers:

- [src/components/TreeViz.tsx](src/components/TreeViz.tsx) — D3 layout, pruning and rendering logic.
- [src/components/Toolbar.tsx](src/components/Toolbar.tsx) — buttons and toolbar actions.
- [src/components/Sidebar.tsx](src/components/Sidebar.tsx) — Markdown fetching and rendering.

## Deployment & CI

Build and preview locally:

```bash
npm ci
npm run build
npm run preview
```

## Technical reference

Quick pointers to useful files and APIs:

- Data fetch: [src/hooks/useTaxonomyData.ts](src/hooks/useTaxonomyData.ts)
- Global context / state: [src/context/TreeContext.tsx](src/context/TreeContext.tsx)
- Visualization: [src/components/TreeViz.tsx](src/components/TreeViz.tsx)
- Markdown rendering: [src/components/MarkdownRenderer.tsx](src/components/MarkdownRenderer.tsx)
- Utilities: [src/utils/treeUtils.ts](src/utils/treeUtils.ts), [src/utils/localization.ts](src/utils/localization.ts)
- Export/print: [src/hooks/usePrintSVG.ts](src/hooks/usePrintSVG.ts), [src/hooks/usePrintMarkdown.ts](src/hooks/usePrintMarkdown.ts)

`useTree()` (exposed by `TreeContext`) basic API:

- `data: TreeNode` — loaded taxonomy
- `expanded: Set<string>` — expanded node ids
- `activeId: string` — selected node id
- `toggleNode(id: string)`, `setActiveId(id: string)`, `collapseAll()`, `expandAll()`

Type definition (see [src/types.ts](src/types.ts)):

```ts
export type TreeNode = {
	id: string
	name: string
	description?: string
	color?: string
	image?: string
	iconChar?: string
	iconFont?: string
	children?: TreeNode[]
}
```

## Updating Selma (forks & upgrades)

Keep user data separate from the application code to simplify updates. Files and folders you should NOT overwrite when updating:

- `public/structured_taxonomy.json`
- `public/details/` (node markdown files)
- `public/locales/<lang>/taxonomy.json`
- `public/assets/`

Updating options:

- Manual ZIP update: replace `src/`, `package.json`, `vite.config.ts`, `index.html` but preserve `public/` data folders.
- Fork + rebase (recommended):

```bash
git remote add upstream https://github.com/berangerthomas/selma.git
git fetch upstream
git checkout main
git rebase upstream/main
# resolve conflicts (preserve your public/locales and public/details changes)
git push --force-with-lease origin main
```

Alternative: merge instead of rebase if you prefer not to rewrite history.

See [docs/updating-fork.md](docs/updating-fork.md) for full instructions.

## FAQ / Troubleshooting

- Images or Markdown do not load: ensure content is under `public/details/` and referenced with correct paths; check network requests in devtools.
- Translations missing: verify `public/locales/<lang>/taxonomy.json` and `ui.json` and restart dev server after adding a new locale.
- Export issues (fonts/icons missing): ensure fonts are reachable (CORS) and included in `public/assets/fonts/` if serving locally.

## Contributing & development

Typical developer workflow:

```bash
npm ci
npm run dev
npm run build
```

- Build the docs site (if you want to preview the VitePress documentation):

```bash
npx vitepress build docs
npx vitepress dev docs
```

If you contribute, please open a PR, keep changes focused and test locally.

## License

This project is licensed under the MIT License — see [LICENSE](LICENSE).
