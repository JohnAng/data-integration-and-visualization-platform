# Planned refactors

Everything in this list ships on a new branch named
**`last-minute-refactoring`**, NOT on `main`. Each item carries a
short rationale so the choice is auditable. Order roughly reflects
priority (highest first).

> Branch handoff:
> ```bash
> git switch -c last-minute-refactoring
> # ...changes...
> git push -u origin last-minute-refactoring
> ```

---

## Code structure

### 1. Split `src/frontend/src/routes/charts.tsx`

The file is 1 764 lines and bundles routing, search-param schema,
seven chart variants, their picker components and their data
adapters. The size makes diffs noisy and the file slow to navigate.

Target layout:

```
src/routes/charts.tsx                ← route shell + search params + sidebar
src/components/charts/playground/
    line-subject-area.tsx
    line-field-of-research.tsx
    line-venue-comparison.tsx
    bar-publisher-quartile.tsx
    bar-venue-metrics.tsx
    scatter-authors-vs-articles.tsx
    scatter-journal-metrics.tsx
    heatmap-subject-area-year.tsx
    stacked-area-publications.tsx
    horizontal-bar-top-n.tsx
    cumulative-growth.tsx
```

Each chart variant becomes a `{ChartConfig, Component}` pair. The
shell page reads `chart_type` from search params and looks the
variant up in a registry.

### 2. Address the 20 strict TypeScript warnings in `charts.tsx`

`pnpm build` (`tsc -b && vite build`) fails on a small number of
issues that the Docker frontend bypasses via `pnpm exec vite build`.
Concrete classes:

- 12 × `implicit any` on `token` parameters inside `.split().map()`
  chains. Fix: explicit `: string` annotations.
- 4 × `ScatterRow / ScatterPoint` type mismatches between the
  generic `ScatterPlot` API and the `journal-metrics` adapter. Fix:
  align the props' generic parameter with the row shape.
- 2 × unused-var warnings (`showsSubjectArea`, `showsForCode`). Fix:
  delete or wire into the rendering.

Once cleaned, restore `RUN pnpm build` in `src/frontend/Dockerfile`
and drop the explanatory comment.

### 2b. Move frontend tests out of `src/`

39 `*.test.{ts,tsx}` files currently sit next to their production
modules across 11 different folders. Vitest's default convention
allows colocation, but readability for a first-time visitor
suffers: the file tree shows a roughly 1:1 mix of code and tests
in every directory.

Target layout (Option A — `tests/` mirror):

```
src/frontend/
├── src/                   ← code only
│   ├── api/ components/ hooks/ lib/ routes/ …
├── tests/                 ← mirror of src/, holds every *.test.{ts,tsx}
│   ├── api/ components/ hooks/ lib/ routes/
│   ├── fixtures/          ← was src/test/ (MSW handlers, render utils, setup.ts)
│   └── setup.ts
└── e2e/                   ← Playwright (unchanged)
```

Vitest config update:

```ts
test: {
    setupFiles: ["./tests/fixtures/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/dist/**", "e2e/**"],
}
```

Mark `src/` as Sources Root and `tests/` as Test Sources Root in
the IDE. `pnpm test` must still report 160 / 160 passing.

### 3. Replace the numeric-id filter inputs on `/years/$year`

The brief is satisfied (filter by conference / journal / author),
but the UI accepts raw numeric IDs. Replace each input with a
shadcn-style autocomplete picker backed by `/api/conferences`,
`/api/journals`, `/api/authors`. The picker pattern already exists
in `components/filters/VenuePicker.tsx` and can be generalised.

### 4. Extract one shared `MetadataGrid` formatter

`components/layout/MetadataGrid.tsx` is duplicated in spirit across
journal, conference, author and year profile pages, each formatting
nulls and number locales slightly differently. Centralise the
`formatMetadataValue(value, type)` helper.

### 5. Per-feature directory layout (`features/`)

The frontend currently splits by *role* (`components/`, `routes/`,
`api/`). After the chart split (item 1) the better layout is:

```
src/features/
    journals/      routes, components, queries, types
    conferences/
    authors/
    years/
    charts/
src/shared/        layout, ui primitives, formatters, hooks
src/api/           kept as is — client + key factory
```

Each feature owns its slice of search-param schema, hook, and view.
The route tree resolves to feature entry components. Reduces
cross-feature imports.

### 6. Backend: separate `Settings` per concern

`src/backend/api/settings.py` and `src/backend/database/settings.py`
diverged. Both read `.env`; the backend pool settings (pool size,
host, port) and the backup CLI settings live in different files.
After refactor: a single `settings.py` with two `BaseSettings`
subclasses (`ApiSettings`, `BackupSettings`) sharing the same
`.env` loader.

### 7. Consolidate `api/dependencies.py` and `api/database.py`

`Database` is constructed inside the FastAPI lifespan and exposed
via a `get_database` dependency. The lifespan-construction and the
DI wiring are split across two files. Merge into one `api/db.py`.

### 8. ETL: turn `transformer.py` into a package

`src/backend/etl/transformer.py` is 982 lines: I/O, normalisation,
acronym generation, fuzzy matching, validation, surrogate-key
assignment and rejection-logging all live in one module. Split:

```
src/backend/etl/
    transformer/
        __init__.py        ← orchestrator (public `run()` entry-point)
        sources.py         ← raw CSV loaders
        normalise.py       ← title / acronym canonicalisation
        resolve.py         ← acronym + fuzzy entity resolution
        validate.py        ← schema + range checks
        keys.py            ← surrogate key assignment
        rejection.py       ← quarantine writer
    exporter.py            ← unchanged
```

Each submodule keeps its own pure functions; the orchestrator
threads them.

---

## Database

### 9. Promote `view_corpus_totals` to a single-row materialised table

The view does 8 sub-`COUNT(*)`s every time the landing page loads.
A one-row materialised snapshot would shave another 50–80 ms off
landing-page first paint.

### 10. Add a covering index for the author article list

`/api/authors/{id}/articles` LEFT JOINs both fact tables and orders
by year. A composite `(author_id, year)` on each bridge table would
let the optimiser drop the filesort. Verify with `EXPLAIN`.

### 11. Drop the `lookup_field_of_research_categories` self-reference

The table currently allows a parent FoR for hierarchical grouping
but nothing in the API exercises it. Either wire it in (more
useful chart facet) or delete the column.

---

## Tests

### 12. Convert hand-written DTO mirror in `src/api/types.ts` into a
   generated artefact

The frontend mirrors every Pydantic DTO manually. With
`docs/openapi.json` already produced (see `Dockerfile`-time export),
swap in `openapi-typescript` to regenerate `src/api/types.ts` from
the live schema. Hand-edited file becomes a build artefact.

### 13. Drop or fold the 3 obsolete unit tests in `tests/unit/`

The integration suite covers the same behaviour with stronger
guarantees. Keep only unit tests that exercise pure functions
(`normalise_title`, `expand_abbreviations`, `canonical_acronym`).

### 14. Add a Playwright assertion that the seven brief-mandatory
    chart variants render with non-empty SVG paths

Today's e2e suite asserts the chart toggles render *something*,
but does not check that the chart actually has data points. A
small visual regression / DOM assertion would catch the case where
a chart silently rolls back to an empty state.

---

## Docs

### 15. Auto-generate the README's "Feature matrix" from
    `BRIEF_AUDIT.md`

Currently both files maintain similar tables and they drift. Pick
one as source of truth and `markdownlint`-include the other.

### 16. Drop the line-by-line BRIEF_AUDIT once the brief is closed

Useful during development, redundant in the final repo. Roll the
"summary of gaps" into the README and delete the rest.

### 17. Consolidate ETL trade-off notes

The same set of decisions (fuzzy threshold, rejection log,
wide-dim) is explained in three places: `transformer.py` docstring,
`ARCHITECTURE.md`, and chapter 3 of the report. After the
refactor, point chapter 3 and `transformer.py` at `ARCHITECTURE.md`
and stop duplicating.

---

## Out of scope (parked for after the deadline)

- Server-side rendering (`/dashboard` first paint would benefit).
- Storybook for the chart components.
- A Cmd+K command palette mounted at `__root.tsx`.
- Dark mode.
- Internationalisation (Greek vs English).
- CI workflow (`.github/workflows/test.yml`) running pytest + vitest
  + playwright on every push.
- Replace `mysqldump` backup with a logical export that includes
  generated `INSERT … ON DUPLICATE KEY UPDATE` so the restore is
  idempotent over an existing volume.
