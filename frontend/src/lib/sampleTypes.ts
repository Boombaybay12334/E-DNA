import type { SampleType } from '../types';

export interface SampleTypeInfo {
  id: SampleType;
  label: string;
  /** What a sample of this type is called in headings, e.g. "Soil sample". */
  noun: string;
  /** Rank shown first in Composition: the one that best splits the groups typically seen in this environment. */
  compositionRank: string;
  /** Heading for the sample-specific block in the report header. */
  contextHeading: string;
}

/** Order here is the order of the selector. */
export const SAMPLE_TYPES: SampleTypeInfo[] = [
  { id: 'water', label: 'Water', noun: 'Water sample', compositionRank: 'Phylum', contextHeading: 'Water context' },
  { id: 'soil', label: 'Soil', noun: 'Soil sample', compositionRank: 'Kingdom', contextHeading: 'Soil context' },
  { id: 'sediment', label: 'Sediment', noun: 'Sediment sample', compositionRank: 'Phylum', contextHeading: 'Sediment context' },
];

export const DEFAULT_SAMPLE_TYPE: SampleType = 'water';

export const sampleTypeInfo = (t: SampleType) => SAMPLE_TYPES.find((x) => x.id === t)!;

export const isSampleType = (x: string | null): x is SampleType => SAMPLE_TYPES.some((t) => t.id === x);

/** Sample type is part of the URL (?type=soil) so a shared link opens the right report. */
export function readSampleType(): SampleType {
  const t = new URLSearchParams(window.location.search).get('type');
  return isSampleType(t) ? t : DEFAULT_SAMPLE_TYPE;
}

export function formatCoords(lat: number, lon: number) {
  return `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`;
}
