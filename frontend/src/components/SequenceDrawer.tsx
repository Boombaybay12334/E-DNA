import { useEffect, useRef, useState } from 'react';
import type { ReportMethods } from '../types';
import { DIVERGENCE_LABEL, fmtInt, fmtPct, type AsvView } from '../lib/derive';
import { toFasta } from '../lib/export';
import { ConfidenceBadge, DivergenceBadge, FLAG_LABEL } from './bits';

interface Props {
  view: AsvView;
  methods: ReportMethods;
  isDemoData: boolean;
  /** Position within the current filtered + sorted list, for prev/next review. */
  position: { index: number; total: number } | null;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}

const DIVERGENCE_TEXT = {
  low: 'Close to at least one reference record.',
  medium: 'Moderately distant from the closest reference record.',
  high: 'Far from every reference record. Possibly not represented in the reference database.',
};

export function SequenceDrawer({ view: v, methods: m, isDemoData, position, onPrev, onNext, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [showGuesses, setShowGuesses] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    ref.current?.focus();
    setCopied(false);
  }, [v.asv.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'ArrowDown' || e.key === 'j') onNext();
      if (e.key === 'ArrowUp' || e.key === 'k') onPrev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onNext, onPrev]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(toFasta(v));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  const blastUrl = `https://blast.ncbi.nlm.nih.gov/Blast.cgi?PROGRAM=blastn&PAGE_TYPE=BlastSearch&QUERY=${encodeURIComponent(v.asv.sequence)}`;
  const speciesIdx = m.ranks.length - 1;

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title" tabIndex={-1} ref={ref}>
        <header className="drawer-head">
          <div>
            <h2 id="drawer-title" className="mono">{v.asv.id}</h2>
            <p className="muted small">
              {m.marker.split(',')[0]} · {v.asv.sequence.length} bp · {fmtInt(v.asv.reads)} reads ({fmtPct(v.readsPct, 2)})
            </p>
          </div>
          <div className="drawer-nav">
            {position && (
              <>
                <button type="button" onClick={onPrev} disabled={position.index === 0} title="Previous (↑ / k)">‹</button>
                <span className="mono small">{fmtInt(position.index + 1)} / {fmtInt(position.total)}</span>
                <button type="button" onClick={onNext} disabled={position.index >= position.total - 1} title="Next (↓ / j)">›</button>
              </>
            )}
            <button type="button" onClick={onClose} aria-label="Close (Esc)">✕</button>
          </div>
        </header>

        <div className="drawer-actions">
          <button type="button" onClick={copy}>{copied ? 'Copied ✓' : 'Copy FASTA'}</button>
          <a className="button" href={blastUrl} target="_blank" rel="noreferrer">BLAST at NCBI ↗</a>
          {isDemoData && <span className="muted small">(demo sequence is synthetic)</span>}
        </div>

        <section className="drawer-section">
          <h3>Best supported classification</h3>
          <p className="drawer-answer">
            {v.resolution === 'unresolved'
              ? <strong>Unresolved: no rank supported</strong>
              : <><strong>{v.name}</strong> <span className="muted">({v.deepestRank})</span></>}
          </p>
          <p className="drawer-badges">
            <ConfidenceBadge band={v.band} value={v.confidence} /> <DivergenceBadge band={v.divergence} />
          </p>
        </section>

        <section className="drawer-section">
          <div className="subsection-head">
            <h3>Confidence at each rank</h3>
            <label className="inline-control small">
              <input type="checkbox" checked={showGuesses} onChange={(e) => setShowGuesses(e.target.checked)} />
              Show unsupported guesses
            </label>
          </div>
          <table className="rank-ladder">
            <tbody>
              {v.asv.calls.map((c, k) => {
                const supported = k <= v.deepest;
                return (
                  <tr key={c.rank} className={supported ? '' : 'unsupported'}>
                    <th scope="row">{c.rank}</th>
                    <td>
                      {supported ? (k === v.deepest ? <strong>{c.name}</strong> : c.name)
                        : showGuesses ? <span className="guess" title="Below cut-off: do not report">{c.name}?</span>
                        : <span className="muted">not supported</span>}
                    </td>
                    <td className="ladder-bar">
                      <span className="bar-track">
                        <span className={`bar-fill ${supported ? '' : 'unassigned'}`} style={{ width: `${c.confidence * 100}%` }} />
                        <span className="cutoff" style={{ left: `${m.supportCutoff * 100}%` }} aria-hidden />
                      </span>
                    </td>
                    <td className="mono num">{c.confidence.toFixed(2)}</td>
                    <td className="small">{k === v.deepest ? '← deepest' : ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="muted small">
            Vertical line = support cut-off ({m.supportCutoff.toFixed(2)}). Ranks below it are not reported.
            {showGuesses && ' Guesses below the cut-off are shown for inspection only and must not be reported.'}
          </p>
        </section>

        {v.deepest < speciesIdx && (
          <section className="drawer-section why">
            <h3>Why not {v.deepest < 0 ? 'any rank' : `${m.ranks[v.deepest + 1].toLowerCase()} or species`}?</h3>
            <ul>
              {v.asv.reasons.map((r) => <li key={r.code}>{r.detail}</li>)}
            </ul>
          </section>
        )}

        <section className="drawer-section">
          <h3>Reference divergence: {DIVERGENCE_LABEL[v.divergence]}</h3>
          <p>{DIVERGENCE_TEXT[v.divergence]} Best match {v.bestIdentity.toFixed(1)}% identity over {v.bestCoverage}% of the query.</p>
          {v.divergence === 'high' && (
            <p className="caveat">
              ⓘ Being far from {m.referenceDb} references is <strong>not evidence of a new species</strong>. It may reflect a gap
              in the database, or a sequencing/PCR artefact.
            </p>
          )}
        </section>

        <section className="drawer-section">
          <h3>Top reference matches</h3>
          <div className="table-scroll">
            <table className="mini-table">
              <thead>
                <tr><th scope="col">Accession</th><th scope="col">Taxon</th><th scope="col" className="num">% id</th><th scope="col" className="num">Cov</th></tr>
              </thead>
              <tbody>
                {v.asv.topHits.map((h, i) => (
                  <tr key={i}>
                    <td className="mono">{h.accession}</td>
                    <td title={h.lineage.join(' › ')}><em>{h.taxon}</em></td>
                    <td className="num mono">{h.identity.toFixed(1)}</td>
                    <td className="num mono">{h.coverage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {isDemoData && <p className="muted small">Accessions are placeholders (MOCK…), not real records.</p>}
        </section>

        <section className="drawer-section">
          <h3>Flags</h3>
          {v.asv.flags.length ? (
            <ul>{v.asv.flags.map((f) => <li key={f}>{FLAG_LABEL[f]}</li>)}</ul>
          ) : <p className="muted">None</p>}
        </section>

        <section className="drawer-section">
          <h3>Sequence</h3>
          <pre className="sequence">{v.asv.sequence.match(/.{1,60}/g)?.join('\n')}</pre>
        </section>

        <footer className="drawer-foot">
          <button type="button" disabled title="Planned for phase 2">Add note</button>
          <button type="button" disabled title="Planned for phase 2">Mark for review</button>
          <span className="muted small">Review actions: phase 2</span>
        </footer>
      </aside>
    </>
  );
}
