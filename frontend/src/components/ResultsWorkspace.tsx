import type { ReportMethods } from '../types';
import type { AsvView, Filters } from '../lib/derive';
import type { WorkspaceState } from '../lib/urlState';
import { Section, Toggle } from './bits';
import { FilterBar } from './FilterBar';
import { ResultsTable } from './ResultsTable';
import { TaxonomyTree } from './TaxonomyTree';

interface Props {
  views: AsvView[];
  rows: AsvView[]; // filtered + sorted
  methods: ReportMethods;
  sampleId: string;
  state: WorkspaceState;
  defaults: Filters;
  setFilters: (patch: Partial<Filters>) => void;
  update: (patch: Partial<WorkspaceState>) => void;
  onOpen: (id: string) => void;
}

/** One dataset, two views. Filters are shared, so the tree and the table always agree. */
export function ResultsWorkspace({ views, rows, methods, sampleId, state, defaults, setFilters, update, onOpen }: Props) {
  return (
    <Section id="results" title="Results"
      aside={
        <Toggle label="View" value={state.view} onChange={(view) => update({ view })}
          options={[{ value: 'table', label: 'Table' }, { value: 'tree', label: 'Taxonomy tree' }]} />
      }>
      <FilterBar views={views} filters={state.filters} defaults={defaults} methods={methods}
        matched={rows.length} setFilters={setFilters} />
      {state.view === 'table' ? (
        <ResultsTable rows={rows} ranks={methods.ranks} sampleId={sampleId} state={state}
          update={update} setFilters={setFilters} onOpen={onOpen} />
      ) : (
        <TaxonomyTree rows={rows} ranks={methods.ranks} onOpen={onOpen}
          onShowInTable={(patch) => { setFilters(patch); update({ view: 'table', groupBy: 'asv' }); }} />
      )}
    </Section>
  );
}
