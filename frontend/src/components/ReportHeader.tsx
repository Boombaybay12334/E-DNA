import type { Report, SampleType } from '../types';
import { formatCoords, sampleTypeInfo, SAMPLE_TYPES } from '../lib/sampleTypes';

const fmtDateTime = (iso: string) => iso.replace('T', ' ').replace(/:00Z$/, ' UTC').replace(/Z$/, ' UTC');

interface Props {
  report: Report;
  onSampleType: (t: SampleType) => void;
}

/**
 * Answers "what sample is this, and can these results be interpreted?" (marker + DB up front).
 * The first block of rows is the same for every sample type; the rest comes from `sample.details`
 * and `sample.parameters`, which the pipeline/LIMS defines per type.
 */
export function ReportHeader({ report, onSampleType }: Props) {
  const { sample: s, methods: m } = report;
  const info = sampleTypeInfo(s.sampleType);
  return (
    <section id="header" className="section report-header" aria-labelledby="header-h">
      <div className="header-top">
        <p className="eyebrow">Biodiversity report · {info.noun}</p>
        <SampleTypeSelector value={s.sampleType} onChange={onSampleType} />
      </div>
      <h1 id="header-h">
        Sample <span className="mono">{s.sampleId}</span>
      </h1>
      <p className="provenance">
        <span><strong>Marker</strong> {m.marker}</span>
        <span><strong>Reference DB</strong> {m.referenceDb}</span>
        <span><strong>Generated</strong> {fmtDateTime(report.generatedAt)}</span>
      </p>

      <div className="context-grid">
        <div>
          <h2 className="context-heading">Sample</h2>
          <dl className="kv">
            <FieldRow label="Sample type" value={info.label} />
            <FieldRow label="Project" value={s.project} />
            <FieldRow label="Location" value={`${formatCoords(s.latitude, s.longitude)} · ${s.locality}`} />
            <FieldRow label="Collected" value={fmtDateTime(s.collectedAt)} />
          </dl>
        </div>
        <div>
          <h2 className="context-heading">{info.contextHeading}</h2>
          <dl className="kv">
            {s.details.map((d) => <FieldRow key={d.label} {...d} />)}
          </dl>
        </div>
        <div>
          <h2 className="context-heading">Measured parameters</h2>
          {s.parameters.length > 0 ? (
            <dl className="kv">
              {s.parameters.map((p) => <FieldRow key={p.label} {...p} />)}
            </dl>
          ) : (
            <p className="muted small">None recorded for this sample.</p>
          )}
        </div>
        <ContextFigure type={s.sampleType} lat={s.latitude} lon={s.longitude} />
      </div>
    </section>
  );
}

function FieldRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return <><dt>{label}</dt><dd className={mono ? 'mono' : undefined}>{value}</dd></>;
}

/**
 * Segmented control beside the report title. It swaps the sample metadata and map texture only;
 * every analysis section below keeps the same structure.
 */
function SampleTypeSelector({ value, onChange }: { value: SampleType; onChange: (t: SampleType) => void }) {
  return (
    <div className="sample-type" role="group" aria-label="Sample type">
      <span className="sample-type-label" aria-hidden>Sample type</span>
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

/** Placeholder until a real basemap is chosen. The pin sits at the centre of the frame; the texture follows the sample type. */
function ContextFigure({ type, lat, lon }: { type: SampleType; lat: number; lon: number }) {
  return (
    <figure className={`map-placeholder map-${type}`}>
      <svg viewBox="0 0 240 160" role="img" aria-label={`Map placeholder, sampling point at ${formatCoords(lat, lon)}`}>
        <defs>
          <pattern id="tex-water" width="24" height="12" patternUnits="userSpaceOnUse">
            <path d="M0 6c6-6 6 6 12 0s6 6 12 0" className="map-texture" />
          </pattern>
          <pattern id="tex-soil" width="14" height="14" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="4" r="1" className="map-texture-fill" />
            <circle cx="10" cy="10" r="1.2" className="map-texture-fill" />
          </pattern>
          <pattern id="tex-sediment" width="20" height="8" patternUnits="userSpaceOnUse">
            <path d="M0 4h9M12 7h8" className="map-texture" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="240" height="160" className="map-bg" />
        <rect x="0" y="0" width="240" height="160" fill={`url(#tex-${type})`} />
        {[1, 2, 3].map((i) => <line key={`v${i}`} x1={i * 60} y1="0" x2={i * 60} y2="160" className="map-grid" />)}
        {[1, 2, 3].map((i) => <line key={`h${i}`} x1="0" y1={i * 40} x2="240" y2={i * 40} className="map-grid" />)}
        <circle cx="120" cy="80" r="5" className="map-pin" />
        <text x="129" y="84" className="map-label">Sample</text>
      </svg>
      <figcaption className="muted">Map placeholder · {formatCoords(lat, lon)}</figcaption>
    </figure>
  );
}
