#!/usr/bin/env bash
# One-shot pipeline: PR2 -> V4 reference -> splits -> baselines + Model A -> score tables.
# Usage:   bash run_all.sh            (resumable: re-run it after any failure or Ctrl-C)
# Optional environment variables (all have defaults):
#   PR2_FASTA=/path/to/pr2_version_..._SSU_mothur.fasta[.gz]   (auto-found otherwise)
#   RANKS="genus family"   SEEDS=3   MA_EPOCHS=25   SKIP_IDTAXA=1   SKIP_MODELA=1   QUICK=1
set -uo pipefail

P=${P:-$HOME/edna/projects/proj1}
DB=${DB:-$HOME/edna/db}
CB=${CONDA_BASE:-$HOME/miniforge3}
RANKS=${RANKS:-"genus family"}
SEEDS=${SEEDS:-3}
MA_EPOCHS=${MA_EPOCHS:-25}
THREADS=${THREADS:-$(nproc)}
if [ "${QUICK:-0}" = 1 ]; then RANKS="genus"; SEEDS=1; MA_EPOCHS=10; fi
S=$P/scripts; W=$P/work; L=$P/logs; R=$P/results
mkdir -p "$W/v4" "$W/splits" "$L" "$R" "$DB/pr2"
cd "$S" || { echo "scripts dir $S not found"; exit 1; }
die() { echo "ERROR: $*" >&2; exit 1; }
export OMP_NUM_THREADS=$THREADS

MAMBA=$CB/bin/mamba; [ -x "$MAMBA" ] || MAMBA=$(command -v mamba || true)
find_tool() { for e in edna-qc edna-core edna-r snakemake; do [ -x "$CB/envs/$e/bin/$1" ] && { echo "$CB/envs/$e/bin/$1"; return; }; done; }

echo "### [0/5] checking environments"
PY=$CB/envs/edna-core/bin/python
[ -x "$PY" ] || die "env edna-core not found at $CB/envs/edna-core (run with CONDA_BASE=/path/to/miniforge3)"
if ! "$PY" -c "import numpy, sklearn, torch" 2>/dev/null; then
  echo "installing numpy scikit-learn pytorch into edna-core ..."
  "$MAMBA" install -y -n edna-core -c conda-forge numpy scikit-learn pytorch || die "could not install python packages"
  "$PY" -c "import numpy, sklearn, torch" || die "python packages still missing in edna-core"
fi
CUTADAPT=$(find_tool cutadapt); VSEARCH=$(find_tool vsearch)
if [ -z "$CUTADAPT" ] || [ -z "$VSEARCH" ]; then
  echo "installing cutadapt + vsearch into edna-qc ..."
  "$MAMBA" install -y -n edna-qc -c conda-forge -c bioconda cutadapt vsearch
  CUTADAPT=$(find_tool cutadapt); VSEARCH=$(find_tool vsearch)
fi
[ -n "$CUTADAPT" ] || die "cutadapt not available"
[ -n "$VSEARCH" ] || echo "WARNING: vsearch not available -> SINTAX and top-hit baselines will be skipped"
RSCRIPT=$CB/envs/edna-r/bin/Rscript; HAVE_IDTAXA=0
if [ "${SKIP_IDTAXA:-0}" != 1 ]; then
  if [ -x "$RSCRIPT" ] && "$RSCRIPT" -e 'library(DECIPHER)' >/dev/null 2>&1; then HAVE_IDTAXA=1
  else
    echo "installing DECIPHER into edna-r (can take a few minutes) ..."
    "$MAMBA" install -y -n edna-r -c conda-forge -c bioconda r-base bioconductor-decipher
    [ -x "$RSCRIPT" ] && "$RSCRIPT" -e 'library(DECIPHER)' >/dev/null 2>&1 && HAVE_IDTAXA=1
  fi
  [ "$HAVE_IDTAXA" = 1 ] || echo "WARNING: DECIPHER unavailable -> IDTAXA will be skipped"
fi

echo "### [1/5] locating and converting PR2"
if [ -z "${PR2_FASTA:-}" ]; then
  PR2_FASTA=$(find "$DB" "$HOME/Downloads" "$HOME/edna" -maxdepth 4 -type f \
      \( -iname 'pr2*SSU*mothur*.fasta' -o -iname 'pr2*SSU*mothur*.fasta.gz' \) 2>/dev/null | head -1)
  [ -n "$PR2_FASTA" ] || PR2_FASTA=$(find "$DB" "$HOME/Downloads" "$HOME/edna" -maxdepth 4 -type f \
      \( -iname 'pr2*.fasta' -o -iname 'pr2*.fasta.gz' \) 2>/dev/null | head -1)
fi
[ -n "$PR2_FASTA" ] && [ -f "$PR2_FASTA" ] || die "PR2 FASTA not found. Run: PR2_FASTA=/full/path/to/file.fasta bash run_all.sh"
echo "using $PR2_FASTA"
if [ ! -s "$W/v4/pr2_clean.fasta" ]; then
  RAW=$W/v4/pr2_raw.fasta
  case "$PR2_FASTA" in *.gz) gunzip -c "$PR2_FASTA" > "$RAW" ;; *) ln -sf "$PR2_FASTA" "$RAW" ;; esac
  TAXF=$(find "$(dirname "$PR2_FASTA")" -maxdepth 1 -type f -iname '*mothur*.tax*' 2>/dev/null | head -1)
  TAXARG=""
  if [ -n "$TAXF" ]; then
    case "$TAXF" in *.gz) gunzip -c "$TAXF" > "$W/v4/pr2_raw.tax"; TAXARG="--tax-file $W/v4/pr2_raw.tax" ;;
                    *) TAXARG="--tax-file $TAXF" ;; esac
    echo "using taxonomy file $TAXF"
  fi
  "$PY" make_tax_from_pr2.py --fasta "$RAW" $TAXARG --out-fasta "$W/v4/pr2_clean.fasta" --out-tax "$W/v4/pr2_tax.tsv"
  N=$(grep -c '>' "$W/v4/pr2_clean.fasta" || true)
  if [ "${N:-0}" -lt 1000 ]; then
    echo "--- first 3 FASTA headers:"; grep '>' "$RAW" | head -3
    die "only $N records got a usable lineage. Send me the 3 headers above (and 'ls $(dirname "$PR2_FASTA")')."
  fi
fi

echo "### [2/5] trimming to 18S V4"
if [ ! -s "$W/v4/pr2_v4.fasta" ]; then
  MED=$("$PY" - "$W/v4/pr2_clean.fasta" << 'PYEOF'
import sys, statistics
L, n = [], 0
for line in open(sys.argv[1]):
    if line[0] == '>':
        L.append(0)
    else:
        L[-1] += len(line.strip())
print(int(statistics.median(L)))
PYEOF
)
  echo "median sequence length: $MED"
  if [ "$MED" -lt 800 ]; then
    echo "sequences already look like amplicons -> skipping primer trimming"
    cp "$W/v4/pr2_clean.fasta" "$W/v4/pr2_v4.fasta"
  else
    "$CUTADAPT" -g "CCAGCASCYGCGGTAATTCC...TYRATCAAGAACGAAAGT" -e 0.15 --discard-untrimmed \
        -j "$THREADS" -o "$W/v4/pr2_v4.fasta" "$W/v4/pr2_clean.fasta" > "$L/cutadapt.log" 2>&1
  fi
  N=$(grep -c '>' "$W/v4/pr2_v4.fasta" || true)
  echo "V4 sequences kept: $N"
  [ "${N:-0}" -ge 1000 ] || { tail -20 "$L/cutadapt.log" 2>/dev/null; die "too few V4 sequences. Send me the lines above."; }
fi

echo "### [3/5] building splits (ranks: $RANKS, seeds: $SEEDS)"
if [ ! -f "$W/splits/.done_${RANKS// /_}_$SEEDS" ]; then
  "$PY" prepare_data.py --fasta "$W/v4/pr2_v4.fasta" --tax "$W/v4/pr2_tax.tsv" --out "$W/splits" \
      --holdout-ranks $RANKS --seeds "$SEEDS" 2>&1 | tee "$L/prepare_data.log"
  [ "${PIPESTATUS[0]}" -eq 0 ] || die "prepare_data.py failed (see $L/prepare_data.log)"
  touch "$W/splits/.done_${RANKS// /_}_$SEEDS"
fi

echo "### [4/5] running tools on every split (resumable)"
for r in $RANKS; do
  for d in "$W"/splits/holdout_$r/seed*; do
    [ -d "$d" ] || continue
    echo "=== $d"
    [ -s "$d/pred_nb_k7.tsv" ] || "$PY" baseline_nb.py --ref-fasta "$d/ref.fasta" --ref-tax "$d/ref.tax.tsv" \
        --query "$d/query.fasta" --out "$d/pred_nb_k7.tsv" --k 7 || echo "WARNING: baseline_nb failed on $d"
    if [ -n "$VSEARCH" ]; then
      [ -s "$d/pred_sintax.tsv" ] || { "$VSEARCH" --sintax "$d/query.fasta" --db "$d/ref_sintax.fasta" \
          --sintax_cutoff 0 --tabbedout "$d/sintax.raw" --strand plus --threads "$THREADS" > /dev/null 2>> "$L/vsearch.log" \
          && "$PY" convert_tool.py sintax --in "$d/sintax.raw" --out "$d/pred_sintax.tsv"; } || echo "WARNING: sintax failed on $d"
      [ -s "$d/pred_tophit.tsv" ] || { "$VSEARCH" --usearch_global "$d/query.fasta" --db "$d/ref.fasta" --id 0.5 \
          --maxaccepts 1 --top_hits_only --strand plus --userout "$d/hits.tsv" --userfields query+target+id \
          --threads "$THREADS" > /dev/null 2>> "$L/vsearch.log" \
          && "$PY" convert_tool.py tophit --in "$d/hits.tsv" --ref-tax "$d/ref.tax.tsv" --out "$d/pred_tophit.tsv"; } || echo "WARNING: tophit failed on $d"
    fi
    if [ "$HAVE_IDTAXA" = 1 ]; then
      [ -s "$d/pred_idtaxa.tsv" ] || "$RSCRIPT" run_idtaxa.R "$d" 2>> "$L/idtaxa.log" || echo "WARNING: idtaxa failed on $d (see $L/idtaxa.log)"
    fi
    if [ "${SKIP_MODELA:-0}" != 1 ]; then
      [ -s "$d/pred_modelA.tsv" ] || "$PY" train_modelA.py --split-dir "$d" --epochs "$MA_EPOCHS" \
          2>&1 | tee -a "$L/modelA.log" | grep -E "device|inner|calibrat|WARNING|wrote|Error|error" \
          || echo "WARNING: modelA failed on $d (see $L/modelA.log)"
    fi
  done
done 2>&1 | tee -a "$L/run_all.log"

echo "### [5/5] scoring"
for r in $RANKS; do
  ls "$W"/splits/holdout_$r/seed*/pred_*.tsv >/dev/null 2>&1 || continue
  "$PY" score.py --splits "$W"/splits/holdout_$r/seed* --csv "$R/results_$r.csv" | tee "$R/summary_$r.txt"
done
echo; echo "DONE. Tables: $R/summary_*.txt   Curves: $R/results_*.csv"
