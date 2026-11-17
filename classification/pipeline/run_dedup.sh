#!/usr/bin/env bash
# Stricter test: cluster near-duplicates (99% identity) BEFORE building splits, 5 seeds, same tools.
# Builds a sibling project (proj2_dedup) that reuses your scripts and your trimmed PR2 data, then runs run_all.sh on it.
# Usage: bash ~/Downloads/run_dedup.sh 2>&1 | tee ~/edna/projects/proj2/logs/dedup_run.log
set -uo pipefail
SRC=${SRC:-$HOME/edna/projects/proj2}
DST=${DST:-$HOME/edna/projects/proj2_dedup}
CB=${CONDA_BASE:-$HOME/miniforge3}
THREADS=${THREADS:-$(nproc)}
VS=""; for e in edna-qc edna-core edna-r snakemake; do [ -x "$CB/envs/$e/bin/vsearch" ] && { VS=$CB/envs/$e/bin/vsearch; break; }; done
[ -n "$VS" ] || { echo "vsearch not found"; exit 1; }
[ -s "$SRC/work/v4/pr2_v4.fasta" ] || { echo "missing $SRC/work/v4/pr2_v4.fasta (run run_all.sh on proj2 first)"; exit 1; }

mkdir -p "$DST/work/v4" "$DST/logs" "$DST/results" "$DST/raw"
[ -e "$DST/scripts" ] || ln -s "$SRC/scripts" "$DST/scripts"
cp -n "$SRC/work/v4/pr2_tax.tsv" "$DST/work/v4/pr2_tax.tsv"
cp -n "$SRC/work/v4/pr2_clean.fasta" "$DST/work/v4/pr2_clean.fasta"      # lets run_all.sh skip its PR2 conversion
if [ ! -s "$DST/work/v4/pr2_v4.fasta" ]; then
  echo "### clustering at 99% identity"
  "$VS" --cluster_fast "$SRC/work/v4/pr2_v4.fasta" --id 0.99 --centroids "$DST/work/v4/pr2_v4.fasta" \
        --threads "$THREADS" --strand plus 2> "$DST/logs/cluster.log" || { tail -5 "$DST/logs/cluster.log"; exit 1; }
fi
echo "sequences before: $(grep -c '>' "$SRC/work/v4/pr2_v4.fasta")  after clustering: $(grep -c '>' "$DST/work/v4/pr2_v4.fasta")"
cd "$DST/scripts" && P="$DST" SEEDS=${SEEDS:-5} bash run_all.sh 2>&1 | tee "$DST/logs/full_run.log"
