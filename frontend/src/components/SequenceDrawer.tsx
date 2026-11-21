import { useEffect, useRef, useState } from 'react';
import type { ReportMethods } from '../types';
import { confidenceBand, DIVERGENCE_LABEL, fmtInt, fmtPct, type AsvView } from '../lib/derive';
import { toFasta } from '../lib/export';
import { ConfidenceBadge, DivergenceBadge, FLAG_LABEL, IucnBadge, EcoTagBadge } from './bits';
import { IconLeaf } from './icons';

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
  low: 'Close to at least one reference record (high homology).',
  medium: 'Moderately distant from the closest reference record.',
  high: 'Far from every reference record. Possibly not represented in the reference database.',
};

export function SequenceDrawer({ view: v, methods: m, isDemoData, position, onPrev, onNext, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [showGuesses, setShowGuesses] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
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
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const blastUrl = `https://blast.ncbi.nlm.nih.gov/Blast.cgi?PROGRAM=blastn&PAGE_TYPE=BlastSearch&QUERY=${encodeURIComponent(v.asv.sequence)}`;
  const gbifUrl = `https://www.gbif.org/species/search?q=${encodeURIComponent(v.name)}`;
  const inatUrl = `https://www.inaturalist.org/taxa?q=${encodeURIComponent(v.name)}`;

  const speciesIdx = m.ranks.length - 1;

  // Bioinformatic sequence metrics
  const seqLen = v.asv.sequence.length;
  const gcCount = (v.asv.sequence.match(/[GCgc]/g) || []).length;
  const gcPct = seqLen > 0 ? (gcCount / seqLen) * 100 : 0;

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title" tabIndex={-1} ref={ref}>
        <header className="drawer-head">
          <div>
            <div className="drawer-asv-tag">
              <span className="mono bold-asv">{v.asv.id}</span>
              {v.iucnStatus && <IucnBadge status={v.iucnStatus} />}
              {v.ecoTag && <EcoTagBadge tag={v.ecoTag} label={v.tagLabel} />}
            </div>
            <p className="muted small">
              {m.marker.split(',')[0]} · {seqLen} bp · GC {gcPct.toFixed(1)}% · {fmtInt(v.asv.reads)} reads ({fmtPct(v.readsPct, 2)})
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
          <button type="button" className="action-btn" onClick={copy}>{copied ? 'Copied FASTA ✓' : 'Copy FASTA'}</button>
          <a className="button action-btn" href={blastUrl} target="_blank" rel="noreferrer">BLAST @ NCBI ↗</a>
          {v.name !== 'Unresolved' && (
            <>
              <a className="button action-btn" href={gbifUrl} target="_blank" rel="noreferrer">GBIF ↗</a>
              <a className="button action-btn" href={inatUrl} target="_blank" rel="noreferrer">iNaturalist ↗</a>
            </>
          )}
        </div>

        {/* Species & Ecological Profile */}
        <section className="drawer-section drawer-profile-section">
          <h3>Taxonomic Classification &amp; Ecology</h3>
          <div className="drawer-answer">
            {v.resolution === 'unresolved' ? (
              <strong>Unresolved: no taxonomic rank supported</strong>
            ) : (
              <>
                <div className="drawer-species-title">
                  <span className="scientific-name"><em>{v.name}</em></span>
                  <span className="rank-tag">({v.deepestRank})</span>
                </div>
                {v.commonName && <div className="drawer-common-name">{v.commonName}</div>}
              </>
            )}
          </div>

          {v.ecoSummary && (
            <div className="drawer-eco-box">
              <span className="eco-box-icon"><IconLeaf size={16} /></span>
              <p className="eco-box-text">{v.ecoSummary}</p>
            </div>
          )}

          <div className="drawer-badges">
            <ConfidenceBadge band={v.band} value={v.confidence} />
            <DivergenceBadge band={v.divergence} />
            {v.possiblyUnrepresented && <span className="tag">Unrepresented Candidate</span>}
          </div>
        </section>

        {/* Confidence Ladder */}
        <section className="drawer-section">
          <div className="subsection-head">
            <h3>Classifier Confidence Ladder</h3>
            <label className="inline-control small">
              <input type="checkbox" checked={showGuesses} onChange={(e) => setShowGuesses(e.target.checked)} />
              Show unsupported predictions
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
                        <span className={`bar-fill ${supported ? `fill-${confidenceBand(c.confidence, m)}` : 'unassigned'}`} style={{ width: `${c.confidence * 100}%` }} />
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
            Vertical line marks classifier support cut-off ({m.supportCutoff.toFixed(2)}). Predictions below it are unverified.
          </p>
        </section>

        {/* Why not species? */}
        {v.deepest < speciesIdx && (
          <section className="drawer-section why">
            <h3>Diagnostic: Why not {v.deepest < 0 ? 'any rank' : `${m.ranks[v.deepest + 1].toLowerCase()} or species`}?</h3>
            <ul className="reasons-list">
              {v.asv.reasons.map((r) => <li key={r.code}>{r.detail}</li>)}
            </ul>
          </section>
        )}

        {/* Reference Divergence */}
        <section className="drawer-section">
          <h3>Reference Divergence: {DIVERGENCE_LABEL[v.divergence]}</h3>
          <p>{DIVERGENCE_TEXT[v.divergence]} Closest reference match is <strong>{v.bestIdentity.toFixed(1)}% identity</strong> across {v.bestCoverage}% coverage.</p>
          {v.divergence === 'high' && (
            <p className="caveat">
              ⓘ Divergence from {m.referenceDb} is <strong>not conclusive proof of a novel species</strong>. It may signal a gap
              in reference sequence databases or a pseudogene/paralog sequence.
            </p>
          )}
        </section>

        {/* Top Reference Hits */}
        <section className="drawer-section">
          <h3>Top Reference Database Hits</h3>
          <div className="table-scroll">
            <table className="mini-table">
              <thead>
                <tr>
                  <th scope="col">Accession</th>
                  <th scope="col">Matched Taxon</th>
                  <th scope="col" className="num">% Identity</th>
                  <th scope="col" className="num">Coverage</th>
                </tr>
              </thead>
              <tbody>
                {v.asv.topHits.map((h, i) => (
                  <tr key={i}>
                    <td className="mono accession-cell">{h.accession}</td>
                    <td title={h.lineage.join(' › ')}><em>{h.taxon}</em></td>
                    <td className="num mono">{h.identity.toFixed(1)}%</td>
                    <td className="num mono">{h.coverage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {isDemoData && <p className="muted small">Accession numbers are synthetic demo identifiers.</p>}
        </section>

        {/* Quality Flags */}
        <section className="drawer-section">
          <h3>Quality Control Flags</h3>
          {v.asv.flags.length ? (
            <ul className="flags-detail-list">
              {v.asv.flags.map((f) => (
                <li key={f}>
                  <span className={`flag flag-${f}`}>{f}</span>
                  <span>{FLAG_LABEL[f]}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="qs-ok">✓ No quality control flags raised</p>
          )}
        </section>

        {/* Raw Sequence */}
        <section className="drawer-section">
          <div className="subsection-head">
            <h3>Amplicon DNA Sequence ({seqLen} bp)</h3>
            <span className="mono small muted">GC: {gcPct.toFixed(1)}%</span>
          </div>
          <pre className="sequence">{v.asv.sequence.match(/.{1,60}/g)?.join('\n')}</pre>
        </section>

        <footer className="drawer-foot">
          <button type="button" onClick={copy}>{copied ? 'Copied ✓' : 'Copy Sequence'}</button>
          <button type="button" onClick={() => window.open(blastUrl, '_blank')}>NCBI BLAST ↗</button>
          <span className="muted small">LIMS Audit ID: {v.asv.id}</span>
        </footer>
      </aside>
    </>
  );
}
