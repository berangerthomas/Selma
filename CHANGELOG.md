# Changelog

## [Unreleased]

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