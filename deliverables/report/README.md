# MYE030 Final report — build instructions

LaTeX source for `AM2403_projectReport.pdf`. Compiled with XeLaTeX so the
Greek body text renders correctly via `polyglossia`.

## Requirements

| Tool | How to install |
|---|---|
| TeX Live 2023+ (any distribution with xelatex) | Windows: `winget install MiKTeX.MiKTeX` or download TeX Live ISO. Mac: `brew install --cask mactex`. Linux: `sudo apt install texlive-xetex texlive-lang-greek texlive-fonts-extra`. |
| Times New Roman + Arial + Consolas | Ship with every Windows install. On macOS / Linux substitute with any serif / sans / mono triple that carries the full Greek alphabet (e.g. DejaVu Serif / DejaVu Sans / DejaVu Sans Mono) by editing `\setmainfont`/`\setsansfont`/`\setmonofont` in `preamble.tex`. |

## Build

From this directory:

```powershell
# Windows (MiKTeX): run the helper or manually invoke xelatex twice
xelatex -interaction=nonstopmode main.tex
xelatex -interaction=nonstopmode main.tex
copy main.pdf ..\AM2403_projectReport.pdf
```

On Mac / Linux:

```bash
make            # invokes xelatex twice and copies main.pdf to ../AM2403_projectReport.pdf
make clean      # remove aux files
make distclean  # also remove main.pdf and the deliverable copy
```

## File layout

```
deliverables/report/
├── main.tex              # entry point + \include directives
├── preamble.tex          # fonts, languages, layout, listings, hyperref
├── Makefile              # xelatex shell-out
├── chapters/
│   ├── 00_cover.tex      # title page
│   ├── 01_history.tex    # version table + summary
│   ├── 02_database.tex   # logical + physical schema
│   ├── 03_architecture.tex   # ETL flow + package + deployment diagrams
│   ├── 04_qa_samples.tex # screenshots tour
│   └── 05_misc.tex       # stack rationale, performance notes, references
└── figures/              # required images — see below
```

## Required figures (drop these into `figures/`)

- `erd.png` — MySQL Workbench reverse-engineered schema diagram
  (File → Manage Connections → Open → Database → Reverse Engineer →
  screenshot the resulting layout at high zoom).
- `etl_activity.png` — UML/BPMN component diagram of the ETL flow. Can
  be drawn quickly in [Excalidraw](https://excalidraw.com),
  [draw.io](https://app.diagrams.net), or PlantUML.
- `packages_backend.png` — package diagram showing
  routers → data\_access → database → MySQL.
- `deployment.png` — deployment diagram (browser, vite, uvicorn, MySQL
  container).
- `screenshots/*.png` for every list, profile and chart variant —
  captured automatically by the Playwright spec at
  `src/frontend/e2e/report_screenshots.spec.ts`.

## Regenerate the screenshots

Boot the full stack (any of the run paths in `docs/ONBOARDING.md`) and
then run the dedicated Playwright spec:

```powershell
cd src\frontend
pnpm exec playwright test report_screenshots --update-snapshots
```

The spec walks every route at viewport 1440×900 and writes the PNGs
directly into `deliverables/report/figures/screenshots/`.
