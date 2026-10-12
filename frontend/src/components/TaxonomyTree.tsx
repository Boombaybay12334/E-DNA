import { useMemo, useState } from 'react';
import { buildTree, fmtInt, type AsvView, type Filters, type TreeNode } from '../lib/derive';
import { ConfidenceBadge } from './bits';

interface Props {
  rows: AsvView[];
  ranks: string[];
  onShowInTable: (patch: Partial<Filters>) => void;
  onOpen: (id: string) => void;
}

const ASV_PREVIEW = 10;

export function TaxonomyTree({ rows, ranks, onShowInTable, onOpen }: Props) {
  const { roots, unresolved } = useMemo(() => buildTree(rows), [rows]);
  // Nodes above this rank index are open, so 2 shows the tree down to Phylum.
  const [expandDepth, setExpandDepth] = useState(2);
  const [overrides, setOverrides] = useState<Map<string, boolean>>(new Map());

  const isOpen = (n: TreeNode) => overrides.get(n.key) ?? n.rankIdx < expandDepth;
  const toggle = (n: TreeNode) => setOverrides((m) => new Map(m).set(n.key, !isOpen(n)));
  const expandTo = (d: number) => { setExpandDepth(d); setOverrides(new Map()); };

  return (
    <div className="tree">
      <div className="table-toolbar">
        <label className="inline-control">
          Show down to{' '}
          <select value={expandDepth} onChange={(e) => expandTo(Number(e.target.value))}>
            <option value={0}>Collapse all</option>
            {ranks.slice(1).map((r, i) => <option key={r} value={i + 1}>{r}</option>)}
          </select>
        </label>
        <span className="muted small">
          Showing {fmtInt(rows.length)} ASVs that match the current filters. The bar shows the share of ASVs that stop at
          that node and are not resolved further.
        </span>
      </div>

      <div className="tree-head" aria-hidden>
        <span>Taxon</span><span className="num">ASVs</span><span className="num">Reads</span><span>Stop here</span><span />
      </div>
      <ul className="tree-list" role="tree">
        {roots.map((n) => (
          <Node key={n.key} node={n} ranks={ranks} isOpen={isOpen} toggle={toggle}
            onShowInTable={onShowInTable} onOpen={onOpen} />
        ))}
        {unresolved.length > 0 && (
          <li role="treeitem" aria-selected={false}>
            <div className="tree-row unresolved-row">
              <span className="tree-name" style={{ paddingLeft: 4 }}>
                <span className="twisty" />
                <em>Unresolved: no Domain support</em>
              </span>
              <span className="num mono">{fmtInt(unresolved.length)}</span>
              <span className="num mono">{fmtInt(unresolved.reduce((s, v) => s + v.asv.reads, 0))}</span>
              <span />
              <button type="button" className="link small" onClick={() => onShowInTable({ preset: 'unresolved' })}>Show in table</button>
            </div>
          </li>
        )}
      </ul>
    </div>
  );
}

interface NodeProps {
  node: TreeNode;
  ranks: string[];
  isOpen: (n: TreeNode) => boolean;
  toggle: (n: TreeNode) => void;
  onShowInTable: (patch: Partial<Filters>) => void;
  onOpen: (id: string) => void;
}

function Node({ node, ranks, isOpen, toggle, onShowInTable, onOpen }: NodeProps) {
  const open = isOpen(node);
  const isSpecies = node.rankIdx === ranks.length - 1;
  const stopShare = node.asvs ? node.stopsHere.length / node.asvs : 0;
  const indent = { paddingLeft: 4 + node.rankIdx * 18 };

  return (
    <li role="treeitem" aria-expanded={open} aria-selected={false}>
      <div className="tree-row">
        <span className="tree-name" style={indent}>
          <button type="button" className="twisty" onClick={() => toggle(node)} aria-label={open ? 'Collapse' : 'Expand'}>
            {open ? '▾' : '▸'}
          </button>
          <span className={isSpecies ? 'species' : ''}>{node.name}</span>{' '}
          <span className="rank-label">{ranks[node.rankIdx]}</span>
        </span>
        <span className="num mono">{fmtInt(node.asvs)}</span>
        <span className="num mono">{fmtInt(node.reads)}</span>
        <span className="stop-bar" title={`${fmtInt(node.stopsHere.length)} of ${fmtInt(node.asvs)} ASVs are not resolved below this node`}>
          {!isSpecies && (
            <>
              <span className="bar-track stop-track"><span className="bar-fill unassigned" style={{ width: `${stopShare * 100}%` }} /></span>
              <span className="stop-pct mono small muted">{Math.round(stopShare * 100)}%</span>
            </>
          )}
        </span>
        <button type="button" className="link small" onClick={() => onShowInTable({ taxon: node.path, taxonExact: false })}>
          Show in table
        </button>
      </div>

      {open && (
        <ul role="group">
          {node.children.map((c) => (
            <Node key={c.key} node={c} ranks={ranks} isOpen={isOpen} toggle={toggle}
              onShowInTable={onShowInTable} onOpen={onOpen} />
          ))}
          {node.stopsHere.length > 0 && (
            <StopsHere node={node} ranks={ranks} isSpecies={isSpecies} onShowInTable={onShowInTable} onOpen={onOpen} />
          )}
        </ul>
      )}
    </li>
  );
}

/** Explicit node for ASVs resolved to this rank and no further, so uncertainty is never hidden. */
function StopsHere({ node, ranks, isSpecies, onShowInTable, onOpen }: {
  node: TreeNode; ranks: string[]; isSpecies: boolean;
  onShowInTable: (patch: Partial<Filters>) => void; onOpen: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const asvs = [...node.stopsHere].sort((a, b) => b.asv.reads - a.asv.reads);
  const indent = { paddingLeft: 4 + (node.rankIdx + 1) * 18 };
  return (
    <li role="treeitem" aria-expanded={open} aria-selected={false}>
      <div className={`tree-row ${isSpecies ? '' : 'stops-row'}`}>
        <span className="tree-name" style={indent}>
          <button type="button" className="twisty" onClick={() => setOpen(!open)} aria-label={open ? 'Collapse' : 'Expand'}>
            {open ? '▾' : '▸'}
          </button>
          <em>{isSpecies ? 'ASVs assigned to this species' : `Not resolved below ${ranks[node.rankIdx]}`}</em>
        </span>
        <span className="num mono">{fmtInt(asvs.length)}</span>
        <span className="num mono">{fmtInt(asvs.reduce((s, v) => s + v.asv.reads, 0))}</span>
        <span />
        <button type="button" className="link small" onClick={() => onShowInTable({ taxon: node.path, taxonExact: true })}>
          Show in table
        </button>
      </div>
      {open && (
        <ul role="group" className="asv-list" style={{ paddingLeft: indent.paddingLeft + 22 }}>
          {asvs.slice(0, ASV_PREVIEW).map((v) => (
            <li key={v.asv.id}>
              <button type="button" className="link mono" onClick={() => onOpen(v.asv.id)}>{v.asv.id}</button>
              <span className="mono small muted"> {fmtInt(v.asv.reads)} reads</span>{' '}
              <ConfidenceBadge band={v.band} value={v.confidence} />
            </li>
          ))}
          {asvs.length > ASV_PREVIEW && (
            <li>
              <button type="button" className="link small" onClick={() => onShowInTable({ taxon: node.path, taxonExact: true })}>
                + {fmtInt(asvs.length - ASV_PREVIEW)} more in table
              </button>
            </li>
          )}
        </ul>
      )}
    </li>
  );
}
