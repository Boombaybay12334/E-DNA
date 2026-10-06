import type { Report } from '../types';

const fmtDateTime = (iso: string) => iso.replace('T', ' ').replace(/:00Z$/, ' UTC').replace(/Z$/, ' UTC');

/** Answers "what sample is this, and can these results be interpreted?" (marker + DB up front). */
export function ReportHeader({ report }: { report: Report }) {
  const { sample: s, methods: m } = report;
  return (
    <section id="header" className="section report-header" aria-labelledby="header-h">
      <p className="eyebrow">Biodiversity report</p>
      <h1 id="header-h">
        Sample <span className="mono">{s.sampleId}</span>
      </h1>
      <p className="provenance">
        <span><strong>Marker</strong> {m.marker}</span>
        <span><strong>Reference DB</strong> {m.referenceDb}</span>
        <span><strong>Generated</strong> {fmtDateTime(report.generatedAt)}</span>
      </p>

      <div className="context-grid">
        <dl className="kv">
          <dt>Project</dt><dd>{s.project}</dd>
          <dt>Location</dt>
          <dd>
            <span className="mono">{s.latitude.toFixed(2)}°N, {s.longitude.toFixed(2)}°E</span> · {s.locality}
          </dd>
          <dt>Collected</dt><dd className="mono">{fmtDateTime(s.collectedAt)}</dd>
          <dt>Depth</dt><dd><span className="mono">{s.depthM.toLocaleString('en-US')} m</span> · {s.depthZone}</dd>
          <dt>Environment</dt><dd>{s.environment}</dd>
          <dt>Sample type</dt><dd>{s.sampleType}, {s.volumeFiltered} filtered, {s.filter}</dd>
        </dl>
        <MapPlaceholder lat={s.latitude} lon={s.longitude} />
      </div>
    </section>
  );
}

/** Placeholder until a real basemap is chosen. One pin is enough for a single sample. */
function MapPlaceholder({ lat, lon }: { lat: number; lon: number }) {
  // Frame: 50–80°E, 5–25°N
  const x = ((lon - 50) / 30) * 240;
  const y = ((25 - lat) / 20) * 160;
  return (
    <figure className="map-placeholder">
      <svg viewBox="0 0 240 160" role="img" aria-label={`Map placeholder, sampling point at ${lat}°N ${lon}°E`}>
        <rect x="0" y="0" width="240" height="160" className="map-bg" />
        {[1, 2, 3].map((i) => <line key={`v${i}`} x1={i * 60} y1="0" x2={i * 60} y2="160" className="map-grid" />)}
        {[1, 2, 3].map((i) => <line key={`h${i}`} x1="0" y1={i * 40} x2="240" y2={i * 40} className="map-grid" />)}
        <circle cx={x} cy={y} r="5" className="map-pin" />
        <text x={x + 9} y={y + 4} className="map-label">Sample</text>
      </svg>
      <figcaption className="muted">Map placeholder · 50–80°E, 5–25°N</figcaption>
    </figure>
  );
}
