import type { Report, SampleType } from '../types';
import { formatCoords, sampleTypeInfo, SAMPLE_TYPES } from '../lib/sampleTypes';
import { StationMap } from './StationMap';

const fmtDateTime = (iso: string) => iso.replace('T', ' ').replace(/:00Z$/, ' UTC').replace(/Z$/, ' UTC');

interface Props {
  report: Report;
  onSampleType: (t: SampleType) => void;
}

/**
 * Modern eDNA report header:
 * - Direct sample identification and environment switcher
 * - Provenance strip: Marker, Primers, Reference DB, Pipeline Version
 * - Rich metadata cards with measured parameters
 * - Interactive Station Map with radar pin and coordinate copier
 */
export function ReportHeader({ report, onSampleType }: Props) {
  const { sample: s, methods: m } = report;
  const info = sampleTypeInfo(s.sampleType);

  return (
    <section id="header" className="section report-header" aria-labelledby="header-h">
      <div className="header-top">
        <div className="header-meta-lead">
          <span className="live-status-pill">
            <span className="pulse-dot green" />
            Bioinformatics Pipeline Completed
          </span>
          <p className="eyebrow">Environmental DNA Biodiversity Report · {info.noun}</p>
        </div>
        <SampleTypeSelector value={s.sampleType} onChange={onSampleType} />
      </div>

      <div className="report-title-row">
        <h1 id="header-h">
          Sample <span className="mono">{s.sampleId}</span>
        </h1>
        <div className="header-chips">
          <span className="chip-badge chip-primary">
            Marker: <strong>{m.marker.split(',')[0]}</strong>
          </span>
          <span className="chip-badge">
            Reference DB: <strong>{m.referenceDb.split(' ')[0]}</strong>
          </span>
          <span className="chip-badge">
            Support Cut-off: <strong>{(m.supportCutoff * 100).toFixed(0)}%</strong>
          </span>
        </div>
      </div>

      <p className="provenance">
        <span><strong>Marker:</strong> {m.marker}</span>
        <span><strong>Primers:</strong> {m.primers}</span>
        <span><strong>Reference DB:</strong> {m.referenceDb}</span>
        <span><strong>Generated:</strong> {fmtDateTime(report.generatedAt)}</span>
        <span><strong>Pipeline:</strong> {m.pipelineVersion}</span>
      </p>

      <div className="context-grid">
        <div className="context-card">
          <h2 className="context-heading">Sampling Metadata</h2>
          <dl className="kv">
            <FieldRow label="Sample Type" value={info.label} />
            <FieldRow label="Project" value={s.project} />
            <FieldRow label="Location" value={`${formatCoords(s.latitude, s.longitude)} · ${s.locality}`} />
            <FieldRow label="Collected" value={fmtDateTime(s.collectedAt)} />
          </dl>
        </div>

        <div className="context-card">
          <h2 className="context-heading">{info.contextHeading}</h2>
          <dl className="kv">
            {s.details.map((d) => (
              <FieldRow key={d.label} {...d} />
            ))}
          </dl>
        </div>

        <div className="context-card">
          <h2 className="context-heading">Field & Physical Parameters</h2>
          {s.parameters.length > 0 ? (
            <dl className="kv">
              {s.parameters.map((p) => (
                <FieldRow key={p.label} {...p} />
              ))}
            </dl>
          ) : (
            <p className="muted small">None recorded for this sample.</p>
          )}
        </div>

        <StationMap type={s.sampleType} lat={s.latitude} lon={s.longitude} locality={s.locality} />
      </div>
    </section>
  );
}

function FieldRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <>
      <dt>{label}</dt>
      <dd className={mono ? 'mono' : undefined}>{value}</dd>
    </>
  );
}

/**
 * Segmented control beside the report title. It swaps the sample metadata and map texture only;
 * every analysis section below keeps the same structure.
 */
function SampleTypeSelector({ value, onChange }: { value: SampleType; onChange: (t: SampleType) => void }) {
  return (
    <div className="sample-type" role="group" aria-label="Sample type">
      <span className="sample-type-label" aria-hidden>
        Environment
      </span>
      <div className="toggle">
        {SAMPLE_TYPES.map((t) => (
          <button key={t.id} type="button" aria-pressed={value === t.id} onClick={() => onChange(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
