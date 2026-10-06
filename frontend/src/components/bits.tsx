import { useEffect, useRef, type ReactNode } from 'react';
import { CONFIDENCE_LABEL, DIVERGENCE_LABEL, type ConfidenceBand, type DivergenceBand } from '../lib/derive';
import type { FlagCode } from '../types';

// Every state has a glyph + text label, never color alone.
const CONF_GLYPH: Record<ConfidenceBand, string> = { high: '●', moderate: '◐', low: '○', unsupported: '✕' };
const DIV_GLYPH: Record<DivergenceBand, string> = { low: '–', medium: '▲', high: '▲▲' };

export function ConfidenceBadge({ band, value }: { band: ConfidenceBand; value?: number }) {
  return (
    <span className={`badge conf-${band}`} title="Classifier confidence at the deepest supported rank">
      <span aria-hidden>{CONF_GLYPH[band]}</span> {CONFIDENCE_LABEL[band]}
      {value !== undefined && <span className="mono muted"> {value.toFixed(2)}</span>}
    </span>
  );
}

export function DivergenceBadge({ band }: { band: DivergenceBand }) {
  return (
    <span className={`badge div-${band}`} title="Distance from the closest reference record (by % identity)">
      <span aria-hidden>{DIV_GLYPH[band]}</span> {DIVERGENCE_LABEL[band]}
    </span>
  );
}

export const FLAG_LABEL: Record<FlagCode, string> = {
  LIKELY_CONTAMINANT: 'Likely contaminant',
  IN_NEGATIVE_CONTROL: 'Also in a negative control',
  LOW_READS: 'Low read count',
};
const FLAG_SHORT: Record<FlagCode, string> = {
  LIKELY_CONTAMINANT: 'CONTAM',
  IN_NEGATIVE_CONTROL: 'CTRL',
  LOW_READS: 'LOW',
};

export function Flags({ flags }: { flags: FlagCode[] }) {
  if (!flags.length) return <span className="muted">–</span>;
  return (
    <span className="flags">
      {flags.map((f) => (
        <span key={f} className="flag" title={FLAG_LABEL[f]}>{FLAG_SHORT[f]}</span>
      ))}
    </span>
  );
}

/** Shows the tail of the supported lineage; full path on hover. */
export function Lineage({ lineage, tail = 2 }: { lineage: string[]; tail?: number }) {
  if (!lineage.length) return <span className="muted" title="No rank supported, not even Domain">Unresolved</span>;
  // Context (parents) truncates first; the deepest supported name always stays visible.
  // A binomial already names its genus, so species rows show the name alone.
  const name = lineage[lineage.length - 1];
  const isBinomial = name.includes(' ');
  const context = isBinomial ? [] : lineage.slice(-tail, -1);
  const hidden = !isBinomial && lineage.length > tail;
  return (
    <span className="lineage" title={lineage.join(' › ')}>
      {(hidden || context.length > 0) && (
        <span className="lineage-ctx">
          {hidden && <span className="muted">… › </span>}
          {context.map((n, i) => <span key={i}>{n}<span className="muted"> › </span></span>)}
        </span>
      )}
      <strong className={`lineage-name${isBinomial ? ' species' : ''}`}>{name}</strong>
    </span>
  );
}

export function Section({ id, title, aside, children }: { id: string; title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="section" aria-labelledby={`${id}-h`}>
      <header className="section-head">
        <h2 id={`${id}-h`}>{title}</h2>
        {aside && <div className="section-aside">{aside}</div>}
      </header>
      {children}
    </section>
  );
}

export function Toggle<T extends string>({ value, options, onChange, label }: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string;
}) {
  return (
    <div className="toggle" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function MultiSelect<T extends string>({ label, options, selected, onChange }: {
  label: string;
  options: { value: T; label: string; count?: number }[];
  selected: T[];
  onChange: (v: T[]) => void;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) ref.current.open = false;
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);
  const toggle = (v: T) => onChange(selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v]);
  return (
    <details className="multiselect" ref={ref}>
      <summary>
        {label}
        {selected.length > 0 && <span className="count-pill">{selected.length}</span>} ▾
      </summary>
      <div className="multiselect-menu">
        {options.map((o) => (
          <label key={o.value} className={o.count === 0 ? 'muted' : ''}>
            <input type="checkbox" checked={selected.includes(o.value)} onChange={() => toggle(o.value)} />
            <span>{o.label}</span>
            {o.count !== undefined && <span className="mono muted">{o.count.toLocaleString('en-US')}</span>}
          </label>
        ))}
        {selected.length > 0 && (
          <button type="button" className="link" onClick={() => onChange([])}>Clear</button>
        )}
      </div>
    </details>
  );
}

/** Horizontal bar row: label | bar | value. Single neutral series, so no legend. */
export function BarRow({ label, value, max, display, onClick, emphasis, title }: {
  label: ReactNode; value: number; max: number; display: string;
  onClick?: () => void; emphasis?: 'unassigned'; title?: string;
}) {
  const width = max > 0 ? (value / max) * 100 : 0;
  const content = (
    <>
      <span className="bar-label">{label}</span>
      <span className="bar-track">
        <span className={`bar-fill ${emphasis ?? ''}`} style={{ width: `${width}%` }} />
      </span>
      <span className="bar-value mono">{display}</span>
    </>
  );
  return onClick ? (
    <button type="button" className="bar-row clickable" onClick={onClick} title={title}>{content}</button>
  ) : (
    <div className="bar-row" title={title}>{content}</div>
  );
}
