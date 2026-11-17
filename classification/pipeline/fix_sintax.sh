#!/usr/bin/env bash
# One-time fix: rebuild SINTAX references, rerun SINTAX on every split, rescore. Other tools are untouched.
set -uo pipefail
P=${P:-$HOME/edna/projects/proj2}; CB=${CONDA_BASE:-$HOME/miniforge3}
PY=$CB/envs/edna-core/bin/python; THREADS=${THREADS:-$(nproc)}
VS=""; for e in edna-qc edna-core edna-r snakemake; do [ -x "$CB/envs/$e/bin/vsearch" ] && { VS=$CB/envs/$e/bin/vsearch; break; }; done
[ -n "$VS" ] || { echo "vsearch not found"; exit 1; }
cd "$P/scripts" || exit 1
"$PY" fix_sintax.py "$P/work/splits"
for d in "$P"/work/splits/holdout_*/seed*; do
  echo "=== sintax on $d"
  "$VS" --sintax "$d/query.fasta" --db "$d/ref_sintax.fasta" --sintax_cutoff 0 --tabbedout "$d/sintax.raw" \
        --strand plus --threads "$THREADS" > /dev/null 2>> "$P/logs/vsearch.log" \
    && "$PY" convert_tool.py sintax --in "$d/sintax.raw" --out "$d/pred_sintax.tsv"
done
for r in genus family; do
  "$PY" score.py --splits "$P"/work/splits/holdout_$r/seed* --csv "$P/results/results_$r.csv" | tee "$P/results/summary_$r.txt"
done
"$PY" "$P/scripts/compare_matched.py" "$P/results" 2>/dev/null || true
