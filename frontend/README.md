# Biodiversity Report: skeleton frontend

Low-fidelity, working wireframe of the eDNA biodiversity report. It covers structure, hierarchy and UX flow only. Visual design comes later.

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build
```

Runs on **synthetic demo data** (`src/data/mockReport.ts`): 4,812 ASVs, COI marker, deep-sea Arabian Sea context.
Accessions are `MOCK…` placeholders, and the page shows a "Demo data" banner while `isDemoData` is true.

## Page structure

| Section | Component | Purpose |
|---|---|---|
| Header + sample context | `ReportHeader` | Sample, location, depth, date, **marker + reference DB** |
| Summary | `Summary` | Key counts (each clickable), resolution profile, QC strip |
| Composition | `Composition` | Composition at any rank, read share vs ASV count, richness, rarefaction |
| Unresolved & possibly unrepresented | `UnresolvedCallout` | Explains the 3 situations; entry points into Results |
| Results | `ResultsWorkspace` → `FilterBar`, `ResultsTable`, `TaxonomyTree` | One dataset, shared filters, table or tree view |
| Reliability & methods | `Reliability` | Confidence vs divergence 2×2, band definitions, QC, controls, provenance |
| Sequence detail | `SequenceDrawer` | Per-rank confidence, "why not species", reference hits, flags |

All workspace state (filters, view, sort, page, open ASV) is in the URL, so any view can be shared.
In the detail panel, `↑/↓` (or `j/k`) steps through the current filtered list.

## Sample types (water, soil, sediment)

One report, several environments. `SampleContext.sampleType` selects which metadata the header shows
(`details` and `parameters` are lists of labelled rows the pipeline/LIMS supplies per type). Every analysis section
(summary, composition, unresolved, results, reliability, sequence detail) is identical for all types and driven only by
`Report`. Composition groups come from the data, so soil can show Fungi, Bacteria, Plantae, Metazoa, Protists, etc. without code changes.
The selector sets `?type=soil|sediment` (water is the default). In the real product the type comes from the sample record.
Demo definitions per type are in `src/data/demoSamples.ts`.

## Data contract (`src/types.ts`)

The UI only **derives** from what the pipeline returns (`src/lib/derive.ts`). It never infers a classification.
For each ASV the pipeline must provide:

- `calls`: predicted name **and confidence at every rank**, aligned with `methods.ranks`
- `topHits`: accession, taxon, lineage, % identity, % coverage
- `reasons`: structured codes for stopping above species (`LOW_IDENTITY`, `SPLIT_HITS`, `BELOW_CONFIDENCE`, `NO_DOMAIN_SUPPORT`)
- `flags`: `LIKELY_CONTAMINANT`, `IN_NEGATIVE_CONTROL`, `LOW_READS`

The report-level `methods` holds the thresholds the UI displays: support cut-off, confidence bands, divergence bands and per-rank identity thresholds.
Rank names come from the reference DB's taxonomy, not from the UI.

Three attributes per ASV are kept separate:

- **Resolution**: the deepest rank with confidence ≥ cut-off
- **Confidence**: at that rank
- **Reference divergence**: from the best-hit % identity

"Possibly unrepresented" = resolved above species **and** High divergence. The UI never says "novel" or "new species".

## To replace the mock

Swap `buildMockReport()` in `src/App.tsx` for a fetch of the pipeline's report JSON in the `Report` shape.
For very large reports (≫10k ASVs), move filtering, sorting and paging server-side. The component boundaries already allow this.

## Not built yet (phase 2)

Notes / mark-for-review, multi-sample comparison and sample switcher, multi-marker view, a real basemap, BIOM / Darwin Core export.
