# Selma

Selma is a React + Vite application template for visualizing a hierarchical taxonomy. This guide explains how to create an exploitable classification visualisation after cloning or forking the repository.

https://github.com/user-attachments/assets/fe375afb-eea7-4aac-8d58-62ef88c4424c

**Prerequisites**
- **Node.js**: recent version (18+ recommended).
- **Install dependencies**:

```bash
npm install
```

**Useful commands**
- **Start development server**: `npm run dev` (Vite)
- **Build for production**: `npm run build`
- **Preview the build**: `npm run preview`

```bash
# development
npm run dev

# build + preview
npm run build
npm run preview
```

**Recommended order to customize the template**
1. Update the taxonomy: see [public/structured_taxonomy.json](public/structured_taxonomy.json). Each node must have a unique `id` (used to name detail files), a `name`, and optionally `children`.
2. Add Markdown files for each node: place them under [public/details/en/](public/details/en/) and [public/details/fr/](public/details/fr/) using the node `id` as the filename (for example `orange.md`). The Sidebar first tries `/details/{{lang}}/{{id}}.md` and falls back to `/details/{{id}}.md` if the translated version is missing.
3. Complete translations: edit [public/locales/en/common.json](public/locales/en/common.json) and [public/locales/fr/common.json](public/locales/fr/common.json) — add entries under `nodes` for each `id`:

```json
"nodes": {
  "orange": { "name": "Orange", "description": "(optional) short description" }
}
```

4. Test locally: run `npm run dev` and open `http://localhost:5173` (Vite will print the exact URL).

**Key files to modify**
- **Taxonomy**: [public/structured_taxonomy.json](public/structured_taxonomy.json)
- **Content / detail pages**: [public/details/en/](public/details/en/) and [public/details/fr/](public/details/fr/)
- **UI strings / translations**: [public/locales/en/common.json](public/locales/en/common.json) and [public/locales/fr/common.json](public/locales/fr/common.json)
- **Public assets (images, etc.)**: place them in `public/` and reference them from Markdown using absolute paths (`/images/...`).

**Best practices**
- Use stable, short `id` values without spaces (for example `orange`, `apple`) — they act as keys and filenames.
- Provide at least the English Markdown file and a French translation when possible.
- Update `nodes.<id>.name` in the localization files to ensure the interface displays the correct label.
- Verify Markdown rendering using the URL pattern: `/markdown-viewer?path=/details/en/<id>.md&sanitize=1`.

**Update a local fork with the latest Selma changes**

If you forked Selma or have a local clone, synchronize your copy with the official source (the "upstream" repository):

1. Add the `upstream` remote (one-time operation):

```bash
# from the repository root
git remote add upstream https://github.com/<ORIGINAL_OWNER>/<REPO>.git
git remote -v
```

2. Fetch updates and merge (or rebase) the main branch:

```bash
git fetch upstream
git checkout main           # or 'master' if the repository uses master
# Option A — merge (preserve history)
git merge upstream/main

# Option B — rebase (linear history)
git rebase upstream/main
```

3. Push changes to your fork (origin):

```bash
git push origin main
```

4. Update a feature branch after synchronization:

```bash
git checkout my-feature
git rebase main    # or `git merge main`
# After rebase, push safely
git push --force-with-lease origin my-feature
```

Notes:
- Replace `main` with `master` if the repository uses `master`.
- Use `rebase` for a cleaner history, but resolve conflicts carefully and prefer `--force-with-lease` when rewriting history.
- If `upstream` already exists, update its URL with `git remote set-url upstream <url>`.

Reference: https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests/syncing-a-fork

**Expected formats**

1) `public/structured_taxonomy.json` — minimal structure

```json
{
  "id": "taxonomy_root",
  "name": "Root name",
  "children": [
	{
	  "id": "category_id",
	  "name": "Category Name",
	  "color": "#HEXCOLOR",
	  "children": [
		{ "id": "leaf_id", "name": "Leaf name" }
	  ]
	}
  ]
}
```

- Important fields: `id` (unique, no spaces), `name` (displayed in the UI), `children` (array). `color` is optional and used for node coloring.

2) `public/locales/{{lng}}/common.json` — add node entries

The translation file contains a `nodes` object where each taxonomy `id` can have a `name` and optionally a `description`:

```json
{
  "nodes": {
	"orange": { "name": "Orange", "description": "Citrus fruit" },
	"apple": { "name": "Apple", "description": "Pome fruit" }
  }
}
```

- The field `nodes.<id>.name` is used by the interface to display the node label.
- `description` can be used for fallback text or auxiliary interfaces.

If you provide a translated detail file (for example `public/details/fr/<id>.md`), update the corresponding `public/locales/fr/common.json` entries as well.
