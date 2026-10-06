import type { ReportMethods } from '../types';
import { fmtInt, resolutionProfile, type AsvView, type Filters } from '../lib/derive';
import { BarRow, Section } from './bits';

interface Props {
  views: AsvView[];
  methods: ReportMethods;
  onDrill: (patch: Partial<Filters>) => void;
}

/**
 * Not a second table: an explanation + entry points into the shared Results workspace.
 * Keeps "uncertain" and "unrepresented" visibly separate.
 */
export function UnresolvedCallout({ views, methods, onDrill }: Props) {
  const close = views.filter((v) => v.resolution === 'partial' && v.divergence !== 'high');
  const unrep = views.filter((v) => v.possiblyUnrepresented);
  const unresolved = views.filter((v) => v.resolution === 'unresolved');
  const unrepByRank = resolutionProfile(unrep, methods.ranks).filter((r) => r.asvs > 0);
  const max = Math.max(...unrepByRank.map((r) => r.asvs));
  const { lowMinIdentity, mediumMinIdentity } = methods.divergenceBands;

  return (
    <Section id="unresolved" title="Unresolved & possibly unrepresented sequences">
      <p className="lede">
        Many ASVs cannot be named to species. This report separates three situations, because they mean different things:
      </p>

      <div className="cards-3">
        <article className="card">
          <p className="card-count mono">{fmtInt(close.length)} ASVs</p>
          <h3>Above species, close to references</h3>
          <p>Best match ≥ {mediumMinIdentity}% identity, but evidence stops above species. Usually close relatives the marker
            can't separate, or too few reference records.</p>
          <p className="muted small">Not a novelty signal.</p>
          <button type="button" onClick={() => onDrill({ ranks: methods.ranks.slice(0, -1), div: ['low', 'medium'], minReads: 0 })}>
            View these →
          </button>
        </article>

        <article className="card card-key">
          <p className="card-count mono">{fmtInt(unrep.length)} ASVs</p>
          <h3>Possibly unrepresented in the reference DB</h3>
          <p>Placed with support at a higher rank, but best match is &lt; {mediumMinIdentity}% identity to every reference.
            May be a lineage missing from the database. Could also be an artefact (e.g. a pseudogene).</p>
          <p className="small"><strong>Needs follow-up. Not evidence of a new species.</strong></p>
          <button type="button" onClick={() => onDrill({ preset: 'unrepresented', minReads: 0 })}>View these →</button>
        </article>

        <article className="card">
          <p className="card-count mono">{fmtInt(unresolved.length)} ASVs</p>
          <h3>Unresolved</h3>
          <p>No rank supported, not even Domain. Possible non-target amplification, sequencing artefact, or a very divergent lineage.</p>
          <p className="muted small">Cannot be interpreted biologically without further analysis.</p>
          <button type="button" onClick={() => onDrill({ preset: 'unresolved', minReads: 0 })}>View these →</button>
        </article>
      </div>

      <div className="subsection">
        <h3>Possibly unrepresented ASVs: deepest supported rank</h3>
        <div className="bars">
          {unrepByRank.map((r) => (
            <BarRow key={r.rank} label={r.rank} value={r.asvs} max={max} display={fmtInt(r.asvs)}
              onClick={() => onDrill({ preset: 'unrepresented', ranks: [r.rank], minReads: 0 })} />
          ))}
        </div>
      </div>

      <p className="caveat">
        ⓘ "Possibly unrepresented" means far from the references in <em>{methods.referenceDb}</em> (divergence bands:
        Low ≥ {lowMinIdentity}%, Medium {mediumMinIdentity}–{lowMinIdentity}%, High &lt; {mediumMinIdentity}% identity).
        This report never labels a sequence as a new species. Confirming that requires specimen-based taxonomy,
        additional markers and phylogenetic analysis.
      </p>
    </Section>
  );
}
