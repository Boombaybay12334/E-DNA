// Workspace state lives in the URL so a filtered view ("these 63 ASVs") can be shared.

import { useCallback, useEffect, useState } from 'react';
import type { ConfidenceBand, DivergenceBand, Filters, PresetId } from './derive';

export type SortKey = 'id' | 'name' | 'rank' | 'confidence' | 'divergence' | 'reads' | 'identity';

export interface WorkspaceState {
  filters: Filters;
  view: 'table' | 'tree';
  groupBy: 'asv' | 'taxon';
  sort: { key: SortKey; dir: 'asc' | 'desc' };
  page: number;
  /** ASV open in the detail panel. */
  asv: string | null;
}

const list = (s: string | null) => (s ? s.split(',').filter(Boolean) : []);

function parse(search: string, defaults: WorkspaceState): WorkspaceState {
  const p = new URLSearchParams(search);
  const d = defaults.filters;
  return {
    filters: {
      q: p.get('q') ?? d.q,
      preset: (p.get('preset') as PresetId) ?? d.preset,
      ranks: list(p.get('rank')),
      conf: list(p.get('conf')) as ConfidenceBand[],
      div: list(p.get('div')) as DivergenceBand[],
      phyla: list(p.get('phylum')),
      taxon: p.get('taxon') ? p.get('taxon')!.split('>') : null,
      taxonExact: p.get('exact') === '1',
      minReads: p.has('minReads') ? Number(p.get('minReads')) || 0 : d.minReads,
      hideContaminants: p.get('hideContam') === '1',
    },
    view: p.get('view') === 'tree' ? 'tree' : 'table',
    groupBy: p.get('group') === 'taxon' ? 'taxon' : 'asv',
    sort: {
      key: (p.get('sort') as SortKey) ?? defaults.sort.key,
      dir: p.get('dir') === 'asc' ? 'asc' : p.get('dir') === 'desc' ? 'desc' : defaults.sort.dir,
    },
    page: Number(p.get('page')) || 0,
    asv: p.get('asv'),
  };
}

function serialize(s: WorkspaceState, defaults: WorkspaceState): string {
  const p = new URLSearchParams();
  const f = s.filters;
  const d = defaults.filters;
  if (f.q) p.set('q', f.q);
  if (f.preset !== 'all') p.set('preset', f.preset);
  if (f.ranks.length) p.set('rank', f.ranks.join(','));
  if (f.conf.length) p.set('conf', f.conf.join(','));
  if (f.div.length) p.set('div', f.div.join(','));
  if (f.phyla.length) p.set('phylum', f.phyla.join(','));
  if (f.taxon) p.set('taxon', f.taxon.join('>'));
  if (f.taxonExact) p.set('exact', '1');
  if (f.minReads !== d.minReads) p.set('minReads', String(f.minReads));
  if (f.hideContaminants) p.set('hideContam', '1');
  if (s.view !== 'table') p.set('view', s.view);
  if (s.groupBy !== 'asv') p.set('group', s.groupBy);
  if (s.sort.key !== defaults.sort.key || s.sort.dir !== defaults.sort.dir) {
    p.set('sort', s.sort.key);
    p.set('dir', s.sort.dir);
  }
  if (s.page) p.set('page', String(s.page));
  if (s.asv) p.set('asv', s.asv);
  const str = p.toString();
  return str ? `?${str}` : '';
}

export function useWorkspaceState(defaults: WorkspaceState) {
  const [state, setState] = useState(() => parse(window.location.search, defaults));

  useEffect(() => {
    const qs = serialize(state, defaults);
    if (qs !== window.location.search) {
      window.history.replaceState(null, '', `${window.location.pathname}${qs}${window.location.hash}`);
    }
  }, [state, defaults]);

  /** Changing any filter resets pagination. */
  const setFilters = useCallback((patch: Partial<Filters>) => {
    setState((s) => ({ ...s, filters: { ...s.filters, ...patch }, page: 0 }));
  }, []);

  const update = useCallback((patch: Partial<WorkspaceState>) => setState((s) => ({ ...s, ...patch })), []);

  return { state, setFilters, update, setState };
}
