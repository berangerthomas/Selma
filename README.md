# Selma

[![Demo](https://img.shields.io/badge/demo-Hugging%20Face-orange?logo=huggingface&style=flat)](https://huggingface.co/spaces/berangerthomas/selma) [![Documentation](https://img.shields.io/badge/docs-GitHub%20Pages-blue?logo=github&style=flat)](https://berangerthomas.github.io/selma/) [![License](https://img.shields.io/badge/license-MIT-brightgreen?style=flat)](LICENSE) [![Release](https://img.shields.io/github/v/release/berangerthomas/selma?label=release&style=flat)](https://github.com/berangerthomas/selma/releases) [![React](https://img.shields.io/badge/-React-61DAFB?logo=react&logoColor=white&style=flat)](https://reactjs.org/) [![Vite](https://img.shields.io/badge/-Vite-646cff?logo=vite&logoColor=white&style=flat)](https://vitejs.dev/) [![D3](https://img.shields.io/badge/-D3-f9a03c?logo=d3&logoColor=white&style=flat)](https://d3js.org/) [![Tailwind CSS](https://img.shields.io/badge/-Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white&style=flat)](https://tailwindcss.com/)

Selma is a React + Vite application for visualizing and navigating hierarchical taxonomies. It renders JSON-based tree structures as interactive diagrams, supports multiple taxonomies over the same set of nodes, Directed Acyclic Graphs (DAG), multilingual content, and provides advanced export/print helpers.

<p align="center">
  <img src="src/assets/pictures/selma.png" alt="Selma main screen" style="width:100%;height:auto;border:1px solid #ddd" />
</p>

## Key Features

- **4 Visualization Modes**: Graph (Organic/Compact: same layout, different node and link shapes), List (collapsible tree), and Columns (Miller columns).
- **Multiple Taxonomies**: Switch between different classification lenses on the same dataset (e.g., chronological vs. genealogical).
- **DAG Support**: Full support for nodes with multiple parents, with dedicated visual indicators.
- **Native Localization**: Asynchronous loading of UI translations and localized Markdown content.
- **Export & Print**: Export diagrams as SVG, PNG, or JPG, and export list views as plain text ASCII trees.

## Documentation

Detailed documentation is available in the `docs/` folder or [online](https://berangerthomas.github.io/selma/):

- [Introduction](docs/introduction.md): Project overview.
- [Getting Started](docs/getting-started.md): Requirements and installation.
- [Taxonomy Data](docs/taxonomy-data.md): How to structure your JSON data.
- [Content & Markdown](docs/content-markdown.md): Writing Markdown for nodes.
- [Export & Print](docs/export-print.md): How to export your diagrams.
- [Configuration](docs/configuration.md): Customizing themes and behaviors.
- [Deployment](docs/deployment.md): Hosting on GitHub Pages, Vercel, etc.
- [Architecture](docs/architecture.md): How the app works internally.
- [Updating Selma](docs/updating-fork.md): Keeping your fork up to date.
- [FAQ](docs/faq.md) & [Reference](docs/reference.md): Technical details and troubleshooting.

## Quick Start

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

## Data Architecture

Selma separates application logic from user content to simplify updates. All your data lives in the `public/` folder:

- `public/data/nodes.json` - Global registry of node properties (colors, icons, tags, attachments).
- `public/data/taxonomies/*.json` - JSON structures defining relationships for each taxonomy.
- `public/details/<lang>/<nodeId>.md` - Localized Markdown content for each node.
- `public/locales/<lang>/` - Interface strings (`ui.json`) and taxonomy labels (`taxonomy.json`).
- `public/assets/` - Your images, fonts, and downloadable attachments.

## DAG Support

Nodes can belong to multiple parents simultaneously. Secondary parent-child relationships are automatically detected and displayed as amber dashed lines in graph views. For example, in the included **writing systems** taxonomy, the Ugaritic script appears under both Proto-Sinaitic and Sumerian Cuneiform.

## Customization

The repository ships with sample data. To use Selma for your own project, simply replace the contents of the `public/` folder with your own taxonomies and Markdown files.

## License

MIT — see [LICENSE](LICENSE).