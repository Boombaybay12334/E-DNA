import { useMemo, useState } from 'react';
import { fmtInt, fmtPct, type AsvView, type Filters } from '../lib/derive';
import type { SortKey, WorkspaceState } from '../lib/urlState';
import { exportCsv, exportFasta } from '../lib/export';
import { ConfidenceBadge, DivergenceBadge, Flags, Lineage, Toggle } from './bits';

const PAGE_SIZE = 50;

interface Props {
  rows: AsvView[]; // already filtered + sorted
  ranks: string[];
  sampleId: string;
  state: WorkspaceState;
  update: (patch: Partial<WorkspaceState>) => void;
  setFilters: (patch: Partial<Filters>) => void;
  onOpen: (id: string) => void;
}

export function ResultsTable({ rows, ranks, sampleId, state, update, setFilters, onOpen }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const page = Math.min(state.page, pages - 1);
  const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const selectedRows = rows.filter((r) => selected.has(r.asv.id));
  const exportRows = selectedRows.length ? selectedRows : rows;

  const sortBy = (key: SortKey) => update({
    sort: { key, dir: state.sort.key === key && state.sort.dir === 'desc' ? 'asc' : 'desc' }, page: 0,
  });
  const toggleRow = (id: string) => setSelected((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });
  const allOnPage = pageRows.length > 0 && pageRows.every((r) => selected.has(r.asv.id));
  const togglePage = () => setSelected((s) => {
    const n = new Set(s);
    pageRows.forEach((r) => (allOnPage ? n.delete(r.asv.id) : n.add(r.asv.id)));
    return n;
  });

  const Th = ({ k, children, num, col }: { k: SortKey; children: string; num?: boolean; col: string }) => (
    <th scope="col" className={`${col}${num ? ' num' : ''}`}
      aria-sort={state.sort.key === k ? (state.sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="th-sort" onClick={() => sortBy(k)}>
        {children}{state.sort.key === k ? (state.sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
      </button>
    </th>
  );

  return (
    <div className="results-table">
      <div className="table-toolbar">
        <Toggle label="Group rows by" value={state.groupBy} onChange={(groupBy) => update({ groupBy, page: 0 })}
          options={[{ value: 'asv', label: 'One row per ASV' }, { value: 'taxon', label: 'Group by taxon' }]} />
        <span className="spacer" />
        <span className="muted small">
          Export {selectedRows.length ? `${fmtInt(selectedRows.length)} selected` : `all ${fmtInt(rows.length)} filtered`}:
        </span>
        <button type="button" onClick={() => exportCsv(exportRows, ranks, sampleId)}>CSV</button>
        <button type="button" onClick={() => exportFasta(exportRows, sampleId)}>FASTA</button>
        {selectedRows.length > 0 && <button type="button" className="link" onClick={() => setSelected(new Set())}>Clear selection</button>}
      </div>

      {state.groupBy === 'taxon' ? (
        <TaxonGroups rows={rows} onPick={(lineage) => {
          setFilters(lineage.length ? { taxon: lineage, taxonExact: true } : { preset: 'unresolved' });
          update({ groupBy: 'asv' });
        }} />
      ) : rows.length === 0 ? (
        <p className="empty">No ASVs match these filters. Try removing a filter, or lowering the read threshold.</p>
      ) : (
        <>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col" className="col-check">
                    <input type="checkbox" checked={allOnPage} onChange={togglePage} aria-label="Select all on this page" />
                  </th>
                  <Th k="id" col="col-id">ASV ID</Th>
                  <Th k="name" col="col-class">Best supported classification</Th>
                  <Th k="rank" col="col-rank">Deepest rank</Th>
                  <Th k="confidence" col="col-conf">Confidence</Th>
                  <Th k="divergence" col="col-div">Ref. divergence</Th>
                  <Th k="reads" num col="col-reads">Reads</Th>
                  <Th k="identity" num col="col-match">Top match</Th>
                  <th scope="col" className="col-flags">Flags</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((v) => (
                  <tr key={v.asv.id} className={state.asv === v.asv.id ? 'active' : ''} onClick={() => onOpen(v.asv.id)}>
                    <td className="col-check" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(v.asv.id)} onChange={() => toggleRow(v.asv.id)}
                        aria-label={`Select ${v.asv.id}`} />
                    </td>
                    <td className="mono sticky-col">
                      <button type="button" className="link mono" onClick={(e) => { e.stopPropagation(); onOpen(v.asv.id); }}>
                        {v.asv.id}
                      </button>
                    </td>
                    <td><Lineage lineage={v.lineage} /></td>
                    <td>{v.deepestRank}</td>
                    <td><ConfidenceBadge band={v.band} value={v.confidence} /></td>
                    <td>
                      <DivergenceBadge band={v.divergence} />
                      {v.possiblyUnrepresented && <span className="tag" title="Possibly unrepresented in reference DB">unrep.?</span>}
                    </td>
                    <td className="num mono">{fmtInt(v.asv.reads)} <span className="muted">{fmtPct(v.readsPct, 2)}</span></td>
                    <td className="num mono" title={v.asv.topHits[0] ? `${v.asv.topHits[0].taxon} · ${v.asv.topHits[0].accession}` : ''}>
                      {v.bestIdentity.toFixed(1)}% <span className="muted">· {v.bestCoverage}% cov</span>
                    </td>
                    <td><Flags flags={v.asv.flags} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pager">
            <button type="button" disabled={page === 0} onClick={() => update({ page: page - 1 })}>‹ Prev</button>
            <span className="mono small">
              {fmtInt(page * PAGE_SIZE + 1)}–{fmtInt(Math.min(rows.length, (page + 1) * PAGE_SIZE))} of {fmtInt(rows.length)}
            </span>
            <button type="button" disabled={page >= pages - 1} onClick={() => update({ page: page + 1 })}>Next ›</button>
          </div>
        </>
      )}
    </div>
  );
}

function TaxonGroups({ rows, onPick }: { rows: AsvView[]; onPick: (lineage: string[]) => void }) {
  const groups = useMemo(() => {
    const m = new Map<string, { lineage: string[]; rank: string; asvs: number; reads: number; conf: Record<string, number>; highDiv: number }>();
    for (const v of rows) {
      const key = v.lineage.join('|');
      const g = m.get(key) ?? { lineage: v.lineage, rank: v.deepestRank, asvs: 0, reads: 0, conf: {}, highDiv: 0 };
      g.asvs++;
      g.reads += v.asv.reads;
      g.conf[v.band] = (g.conf[v.band] ?? 0) + 1;
      if (v.divergence === 'high') g.highDiv++;
      m.set(key, g);
    }
    return [...m.values()].sort((a, b) => b.reads - a.reads);
  }, [rows]);

  if (!groups.length) return <p className="empty">No ASVs match these filters.</p>;
  return (
    <div className="table-scroll">
      <p className="muted small">
        {fmtInt(rows.length)} ASVs collapsed into {fmtInt(groups.length)} taxa (at each ASV's deepest supported rank).
        Click a row to list its ASVs.
      </p>
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col" className="col-class">Taxon (deepest supported)</th>
            <th scope="col" className="col-rank">Rank</th>
            <th scope="col" className="col-count num">ASVs</th>
            <th scope="col" className="col-reads num">Reads</th>
            <th scope="col" className="col-mix">Confidence mix</th>
            <th scope="col" className="col-count-wide num" title="ASVs with High reference divergence">High-div. ASVs</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <tr key={g.lineage.join('|') || 'none'} onClick={() => onPick(g.lineage)}>
              <td><Lineage lineage={g.lineage} /></td>
              <td>{g.rank}</td>
              <td className="num mono">{fmtInt(g.asvs)}</td>
              <td className="num mono">{fmtInt(g.reads)}</td>
              <td className="mono small">
                {g.conf.high ? `● ${g.conf.high} ` : ''}{g.conf.moderate ? `◐ ${g.conf.moderate} ` : ''}
                {g.conf.low ? `○ ${g.conf.low} ` : ''}{g.conf.unsupported ? `✕ ${g.conf.unsupported}` : ''}
              </td>
              <td className="num mono">{g.highDiv || '–'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
