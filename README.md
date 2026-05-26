# Selma

[![Demo](https://img.shields.io/badge/demo-Hugging%20Face-orange?logo=huggingface&style=flat)](https://huggingface.co/spaces/berangerthomas/selma) [![Documentation](https://img.shields.io/badge/docs-GitHub%20Pages-blue?logo=github&style=flat)](https://berangerthomas.github.io/selma/) [![License](https://img.shields.io/badge/license-MIT-brightgreen?style=flat)](LICENSE) [![Release](https://img.shields.io/github/v/release/berangerthomas/selma?label=release&style=flat)](https://github.com/berangerthomas/selma/releases) [![React](https://img.shields.io/badge/-React-61DAFB?logo=react&logoColor=white&style=flat)](https://reactjs.org/) [![Vite](https://img.shields.io/badge/-Vite-646cff?logo=vite&logoColor=white&style=flat)](https://vitejs.dev/) [![D3](https://img.shields.io/badge/-D3-f9a03c?logo=d3&logoColor=white&style=flat)](https://d3js.org/) [![Tailwind CSS](https://img.shields.io/badge/-Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white&style=flat)](https://tailwindcss.com/)

Selma is a React + Vite application for visualizing and navigating hierarchical taxonomies. It renders JSON-based tree structures as interactive diagrams. Features include multiple taxonomies over the same set of nodes, support for Directed Acyclic Graphs (DAG), multilingual content, and export helpers (SVG, PNG, JPG, text).

<p align="center">
  <img src="src/assets/pictures/selma.png" alt="Selma main screen" style="width:100%;height:auto;border:1px solid #ddd" />
</p>

## Features

- **4 visualization modes**: Graph (Organic/Compact: same layout, different node and link shapes), List (collapsible tree), Columns (Miller columns).
- **Multiple taxonomies**: switch between different classification views on the same dataset.
- **DAG support**: nodes with multiple parents, with dedicated visual indicators.
- **Localization**: UI translations and localized Markdown content.
- **Tag filtering**: tags can be cycled through neutral, include, and exclude states.
- **Export & print**: export diagrams as SVG, PNG, JPG; export list views as ASCII text trees.

## Documentation

Detailed documentation is in the `docs/` folder or [online](https://berangerthomas.github.io/selma/):

- [Introduction](docs/introduction.md) — project overview
- [Installation](docs/getting-started.md) — requirements and setup
- [Créer votre première taxonomy](docs/first-taxonomy.md) — step-by-step tutorial
- [Taxonomy Data](docs/taxonomy-data.md) — data format reference
- [Content & Markdown](docs/content-markdown.md) — writing Markdown for nodes
- [Export & Print](docs/export-print.md) — exporting diagrams
- [Configuration](docs/configuration.md) — customization
- [Deployment](docs/deployment.md) — hosting
- [Architecture](docs/architecture.md) — internal structure
- [Updating Selma](docs/updating-fork.md) — keeping your fork up to date
- [FAQ](docs/faq.md) & [Reference](docs/reference.md) — troubleshooting and API

## Quick start

Requirements: Node.js 18 or higher (Node 20+ recommended).

```bash
git clone https://github.com/berangerthomas/selma.git
cd selma
npm ci
npm run dev
```

Build for production:

```bash
npm run build
npm run preview
```

## Data architecture

Selma separates application logic from user content. Your data lives in `public/`:

- `public/data/nodes.json` — node properties (colors, icons, tags, attachments)
- `public/data/taxonomies/*.json` — parent-child relationships for each taxonomy
- `public/details/<lang>/<nodeId>.md` — localized Markdown content per node
- `public/locales/<lang>/` — UI strings (`ui.json`) and taxonomy labels (`taxonomy.json`)
- `public/assets/` — images, fonts, attachments

## DAG support

Nodes can have multiple parents. Secondary parent-child relationships are automatically detected and displayed as amber dashed lines in graph views.

## Customization

The repository ships with sample data. To use Selma for your own project, replace the contents of `public/` with your own taxonomies and Markdown files.

## License

MIT — see [LICENSE](LICENSE).