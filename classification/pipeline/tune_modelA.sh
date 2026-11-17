#!/usr/bin/env bash
# Tune Model A on SEPARATE dev splits (seeds 100,101) so the final test seeds (0-4) are never used for tuning.
# Usage: bash tune_modelA.sh 2>&1 | tee ~/edna/projects/proj2_dedup/logs/tune.log
set -uo pipefail
P=${P:-$HOME/edna/projects/proj2_dedup}; CB=${CONDA_BASE:-$HOME/miniforge3}
PY=$CB/envs/edna-core/bin/python; D=$P/work/splits_dev; R=$P/results_dev
mkdir -p "$R" "$P/logs"; cd "$P/scripts" || exit 1
[ -s "$P/work/v4/pr2_v4.fasta" ] || { echo "missing $P/work/v4/pr2_v4.fasta"; exit 1; }
if [ ! -d "$D" ]; then
  "$PY" prepare_data.py --fasta "$P/work/v4/pr2_v4.fasta" --tax "$P/work/v4/pr2_tax.tsv" --out "$D" \
        --holdout-ranks genus family --seeds 2 --seed-start 100 || exit 1
fi
# name | extra arguments   (v1 = the model you already evaluated)
CFGS=(
 "_v1|"
 "_reg|--dropout 0.5 --in-dropout 0.2 --wd 0.01 --mut 0.06 --crop 0.6 --ls 0.1"
 "_reg_ens5|--dropout 0.5 --in-dropout 0.2 --wd 0.01 --mut 0.06 --crop 0.6 --ls 0.1 --ensemble 5"
 "_reg_k7|--dropout 0.5 --in-dropout 0.2 --wd 0.01 --mut 0.06 --crop 0.6 --ls 0.1 --k 7"
)
for d in "$D"/holdout_*/seed*; do
  echo "=== $d"
  [ -s "$d/pred_nb_k7.tsv" ] || "$PY" baseline_nb.py --ref-fasta "$d/ref.fasta" --ref-tax "$d/ref.tax.tsv" \
        --query "$d/query.fasta" --out "$d/pred_nb_k7.tsv" --k 7
  for c in "${CFGS[@]}"; do
    tag=${c%%|*}; args=${c#*|}
    [ -s "$d/pred_modelA$tag.tsv" ] || { echo "--- $tag"; "$PY" train_modelA.py --split-dir "$d" --tag "$tag" $args 2>&1 \
        | tee -a "$P/logs/tune_modelA.log" | grep -E "inner best|wrote|Error|error|WARNING"; }
  done
done
for r in genus family; do
  "$PY" score.py --splits "$D"/holdout_$r/seed* --csv "$R/results_$r.csv" | grep -E "holdout=|AUC" | tee "$R/summary_$r.txt"
done
"$PY" compare_matched.py "$R"
