import type { Report } from '../types';
import { fmtInt, fmtPct, type AsvView, type ConfidenceBand, type DivergenceBand, type Filters } from '../lib/derive';
import { BarRow, ConfidenceBadge, DivergenceBadge, Section } from './bits';

interface Props {
  report: Report;
  views: AsvView[];
  onDrill: (patch: Partial<Filters>) => void;
}

const STRONG: ConfidenceBand[] = ['high', 'moderate'];
const WEAK: ConfidenceBand[] = ['low'];
const CLOSE: DivergenceBand[] = ['low', 'medium'];
const FAR: DivergenceBand[] = ['high'];

export function Reliability({ report, views, onDrill }: Props) {
  const m = report.methods;
  const placed = views.filter((v) => v.resolution !== 'unresolved');
  const count = (conf: ConfidenceBand[], div: DivergenceBand[]) =>
    placed.filter((v) => conf.includes(v.band) && div.includes(v.divergence)).length;

  const cells = [
    { conf: STRONG, div: CLOSE, title: 'Solid assignment', body: 'Supported placement, close to known references.' },
    { conf: STRONG, div: FAR, title: 'Likely unrepresented', body: 'Confidently placed in a group, but far from any reference. Candidate for follow-up.' },
    { conf: WEAK, div: CLOSE, title: 'Ambiguous between relatives', body: 'Close to references that disagree. The marker can\'t separate them. Not a novelty signal.' },
    { conf: WEAK, div: FAR, title: 'Weak and distant', body: 'Little support and far from references. Treat with caution.' },
  ];
  const qcMax = report.qc[0].reads;
  const { high, moderate } = m.confidenceBands;
  const { lowMinIdentity: lo, mediumMinIdentity: med } = m.divergenceBands;

  return (
    <Section id="reliability" title="Reliability & methods">
      <div className="subsection">
        <h3>Confidence and reference divergence are different things</h3>
        <p className="muted small">
          <strong>Confidence</strong>: how sure the classifier is at the deepest supported rank.{' '}
          <strong>Reference divergence</strong>: how far the sequence is from its closest reference record.
          Counts below are ASVs placed at Domain or deeper ({fmtInt(placed.length)}). Click a cell to view them.
        </p>
        <div className="matrix" role="table" aria-label="Confidence by reference divergence">
          <div role="row" className="matrix-row">
            <span role="columnheader" />
            <span role="columnheader" className="matrix-col-h">Low / Medium divergence<br /><span className="muted small">best match ≥ {med}%</span></span>
            <span role="columnheader" className="matrix-col-h">High divergence<br /><span className="muted small">best match &lt; {med}%</span></span>
          </div>
          {[STRONG, WEAK].map((conf) => (
            <div role="row" className="matrix-row" key={conf.join()}>
              <span role="rowheader" className="matrix-row-h">
                {conf === STRONG ? 'High / Moderate confidence' : 'Low confidence'}
                <br /><span className="muted small">{conf === STRONG ? `≥ ${moderate.toFixed(2)}` : `${m.supportCutoff.toFixed(2)}–${moderate.toFixed(2)}`}</span>
              </span>
              {cells.filter((c) => c.conf === conf).map((c) => (
                <button role="cell" type="button" key={c.title} className="matrix-cell"
                  onClick={() => onDrill({ conf: c.conf, div: c.div, minReads: 0 })}>
                  <strong>{c.title}</strong>
                  <span className="card-count mono">{fmtInt(count(c.conf, c.div))}</span>
                  <span className="small">{c.body}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="two-col">
        <div className="subsection">
          <h3>How the bands are defined</h3>
          <table className="mini-table">
            <tbody>
              <tr><th scope="row"><ConfidenceBadge band="high" /></th><td>confidence ≥ {high.toFixed(2)}</td></tr>
              <tr><th scope="row"><ConfidenceBadge band="moderate" /></th><td>{moderate.toFixed(2)} – {high.toFixed(2)}</td></tr>
              <tr><th scope="row"><ConfidenceBadge band="low" /></th><td>{m.supportCutoff.toFixed(2)} – {moderate.toFixed(2)}</td></tr>
              <tr><th scope="row"><ConfidenceBadge band="unsupported" /></th><td>&lt; {m.supportCutoff.toFixed(2)}: the rank is not reported</td></tr>
              <tr><th scope="row"><DivergenceBadge band="low" /></th><td>best match ≥ {lo}% identity</td></tr>
              <tr><th scope="row"><DivergenceBadge band="medium" /></th><td>{med}% – {lo}%</td></tr>
              <tr><th scope="row"><DivergenceBadge band="high" /></th><td>&lt; {med}%</td></tr>
            </tbody>
          </table>
          <p className="muted small">
            A rank is reported only when confidence ≥ {m.supportCutoff.toFixed(2)}. Typical identity needed per rank:{' '}
            {m.ranks.map((r) => `${r} ${m.identityThresholds[r]}%`).join(' · ')}.
          </p>
        </div>

        <div className="subsection">
          <h3>Read QC</h3>
          <div className="bars">
            {report.qc.map((s) => (
              <BarRow key={s.label} label={s.label} value={s.reads} max={qcMax}
                display={`${fmtInt(s.reads)} · ${fmtPct((s.reads / qcMax) * 100, 0)}`} />
            ))}
          </div>

          <h3>Negative controls</h3>
          <table className="mini-table">
            <thead><tr><th scope="col">Control</th><th scope="col">Taxon detected</th><th scope="col" className="num">Reads</th></tr></thead>
            <tbody>
              {report.controls.map((c) => (
                <tr key={c.control + c.taxon}>
                  <td>{c.control}</td>
                  <td><button type="button" className="link" onClick={() => onDrill({ q: c.taxon, minReads: 0 })}><em>{c.taxon}</em></button></td>
                  <td className="num mono">{fmtInt(c.reads)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted small">ASVs of these taxa carry the "CTRL" flag in results.</p>
        </div>
      </div>

      <div className="subsection">
        <h3>Methods & provenance</h3>
        <dl className="kv">
          <dt>Marker</dt><dd>{m.marker}</dd>
          <dt>Primers</dt><dd>{m.primers}</dd>
          <dt>Reference DB</dt><dd>{m.referenceDb}</dd>
          <dt>Classifier</dt><dd>{m.classifier}</dd>
          <dt>Taxonomic ranks</dt><dd>{m.ranks.join(' › ')} <span className="muted small">(from the reference DB's taxonomy)</span></dd>
          <dt>Pipeline</dt><dd className="mono">{m.pipelineVersion}</dd>
        </dl>
      </div>
    </Section>
  );
}
