# 18S novel-taxa classifier: state freeze (v0)

Status: **research skeleton / baseline, not a product.** It is a working benchmark harness plus a first neural model (Model A).
Everything below is what was actually built and measured. Statements marked *(hypothesis)* were not verified.

## 1. Goal
Classify 18S eDNA sequences to the deepest rank the evidence supports, stop at the correct parent rank when the sequence belongs to
a clade that is missing from the reference, and make that "possibly novel" signal usable. Evaluate against common tools under
database-incompleteness simulated by leave-one-clade-out splits.

## 2. Data
- Reference: **PR2 v5.0.0 SSU, mothur format** (FASTA + separate `.tax`), Zenodo record 10137946. 221,085 records, all with lineage.
- Region: trimmed to **18S V4** with cutadapt linked adapters, TAReuk454FWD1 `CCAGCASCYGCGGTAATTCC` ... TAReukREV3 `ACTTTCGTTCTTGATYRA`
  (rev-comp `TYRATCAAGAACGAAAGT`), `-e 0.15`, `--discard-untrimmed`. 162,577 sequences kept (median input length 1518, so full-length).
- Ranks used: domain, supergroup, division, subdivision, class, order, family, genus (species present in files but evaluation is **capped at genus**).
- Filtering in `prepare_data.py`: drop <200 bp or non-ACGT, drop records not labelled to genus, collapse identical sequences, drop identical
  sequences with conflicting taxonomy (6,171 in the first run - these are exactly the hardest-to-resolve cases, so known-sequence accuracy is flattered).
  Result in the first run: 70,265 of 162,577 kept.
- **De-duplicated variant** ("dedup", the one used for final numbers): V4 sequences clustered with `vsearch --cluster_fast --id 0.99` (centroids) before splitting;
  46,509 sequences, 42,862 kept after the same filters.

## 3. Benchmark protocol (leave-one-clade-out)
Built by `pipeline/prepare_data.py`, per holdout rank (genus, family) and per seed:
- ~20% of eligible clades at the holdout rank (>=3 sequences, and parent keeps >=1 other child) are removed from the reference entirely.
  Up to 10 sequences per removed clade become **novel** queries. Correct behaviour: stop at the parent rank, name nothing at the held-out rank.
- **Known** queries: ~10% of sequences of genera with >=3 sequences; their genus stays in the reference.
- Splits: test seeds 0-4 (dedup), dev seeds 100-101 (dedup, used only for tuning Model A), first run seeds 0-2 (no dedup).
- Typical sizes: dev genus ref ~34-35k, known queries ~3.3-3.4k, novel ~2.4-2.6k; family novel ~1.2k.
- Scoring (`pipeline/score.py`): per query T = deepest rank whose name exists in the reference, P = deepest assigned rank at confidence threshold tau.
  Metrics: known misclassification, known exact, novel exact-stop, novel over-classification, flag AUC (see `results/RESULTS.md` header).
- Every tool writes `pred_<tool>.tsv`: `id <TAB> lineage a;b;c <TAB> per-rank confidences`. Any new model only has to write this file.
- `pipeline/compare_matched.py` compares tools at the tau where known misclassification is closest to 2% and 5%.

## 4. What was compared
| Name | What it is | Notes |
|---|---|---|
| `idtaxa` | **Real IDTAXA** (R/DECIPHER `LearnTaxa`/`IdTaxa`, threshold 0, strand top) | `run_idtaxa.R` |
| `sintax` | **Real SINTAX** via `vsearch --sintax --sintax_cutoff 0` | needs rank letters d,k,p,c,o,f,g,s (a first run with wrong letters was a bug, fixed) |
| `nb_k7` | **Our own RDP-style naive Bayes** (Wang et al. 2007 method), 7-mers, trained at genus level, 100 bootstraps of 1/8 of k-mers | not the RDP software; call it "RDP-style" |
| `tophit` | `vsearch --usearch_global`, best hit, confidence = identity | crude floor, not a published method |
| `modelA*` | **Our neural model**, below | the only learned/novel component |
The ensemble is **5 copies of the same MLP with different seeds**. IDTAXA/SINTAX/NB/top-hit are comparison baselines, not ensemble members.

## 5. Model A: architecture
Code: `pipeline/train_modelA.py`.
- **Input:** 6-mer relative-frequency vector (4096 dims), square-rooted. (Variant tested: 7-mers, 16384 dims.)
- **Augmentation (training only):** random crop (v1: keep 80-100%; v2: 60-100%) and random substitutions at a rate drawn up to 3% (v1) / 6% (v2).
- **Encoder:** [input dropout] -> Linear 4096->1024 -> LayerNorm -> GELU -> Dropout -> Linear 1024->512 -> LayerNorm -> GELU -> Dropout -> Linear 512->256 -> LayerNorm -> GELU.
  The 256-d output is the embedding. About 4.9M encoder parameters.
- **Head:** Linear 256 -> #genera, softmax over **genera in the reference** (~257 x #genera parameters). Higher-rank probabilities are obtained by **summing genus
  probabilities over each clade** (consistent hierarchy). Predicted lineage = lineage of the argmax genus.
- **Training:** AdamW lr 1e-3, batch 256, <=25 epochs, early stopping (patience 4) on loss of an inner known-sequence validation set.
  v1: dropout 0.2, wd 1e-5, label smoothing 0.05. v2 "reg": dropout 0.5, input dropout 0.2, wd 1e-2, label smoothing 0.1.
  One epoch takes ~1 s on the author's RTX 4060 8 GB; the full 3-hour runs are dominated by IDTAXA and the other tools.
- **Ensemble (`reg_ens5`):** 5 members, seeds differ, probabilities averaged before the argmax.

### Confidence / novelty layer (this is the actual idea being tested)
1. **Inner split inside the reference** with the same holdout rank as the outer test (fraction 0.2, up to 10 seqs per held-out clade, 10% known). Train the inner model(s) on the rest.
2. On the inner held-out sequences (known + pseudo-novel) compute, per query and rank r: logit of the clade probability p_r, entropy of the genus distribution,
   mean cosine distance to the nearest reference sequence in embedding space, mean distance to the nearest reference sequence *inside the predicted clade at rank r*
   (searched among the top-50 neighbours; if none, distance of the 50th + 0.1), fraction of members where one was found, and (ensemble only) std of p_r across members.
3. Fit one **logistic regression per rank** (StandardScaler + LR, C=1) to predict "my call at rank r is correct".
4. Retrain on the **full** reference for each member's best epoch, classify the real queries, output calibrated probabilities with a running minimum down the ranks
   (non-increasing). If <20 inner known or novel sequences exist, it falls back to raw probabilities.
5. `*_probonly` = same network, calibrator uses only [logit p_r, entropy] (ablation for the distance signal).
No explicit "novel" class exists: "novel" means confidence below a chosen tau at some rank. Choosing tau is an operating-point decision.

## 6. Results (details in `results/RESULTS.md`)
Final test (dedup, 5 seeds, matched ~5% known-sequence error):
| Holdout | Tool | known assigned to genus | novel correct stop | novel over-classified | flag AUC |
|---|---|---|---|---|---|
| genus | Model A reg_ens5 | 0.418 | 0.646 | 0.083 | 0.784 +/- 0.009 |
| genus | IDTAXA | 0.518 | 0.333 | 0.169 | 0.771 +/- 0.007 |
| genus | SINTAX | 0.569 | 0.467 | 0.234 | 0.748 +/- 0.005 |
| genus | NB (RDP-style) | 0.540 | 0.448 | 0.187 | 0.757 +/- 0.005 |
| family | Model A reg_ens5 | 0.441 | 0.347 | 0.096 | 0.914 +/- 0.006 |
| family | IDTAXA | 0.439 | 0.071 | 0.106 | 0.903 +/- 0.003 |
| family | SINTAX | 0.496 | 0.209 | 0.180 | 0.894 +/- 0.002 |
What the data supports:
- At matched known error, genus holdout: the ensemble makes about half as many impossible calls as IDTAXA and stops correctly ~2x as often, at ~10 points lower coverage of known sequences.
- Family holdout: same coverage and similar over-classification as IDTAXA, far more correct stops.
- AUC lead over IDTAXA is small (about 1-2 standard deviations) - do **not** present it as a clear win.
- Model A v1 had an AUC lead before de-duplication that vanished after it (artifact of near-duplicates).
- The distance signal adds about +0.01 AUC (close to noise).
- Tuning (dev splits only): v1 overfit (best epoch 7-10); heavier regularisation + 5-member ensemble was best; regularised models hit the 25-epoch cap (probably undertrained).

## 7. Testing actually done
- End-to-end smoke tests on **synthetic** hierarchical sequences (splits, NB, Model A incl. ensemble and k=7, scoring, converters, PR2 header parser).
- Real-data runs of the whole pipeline on PR2 (3 runs, listed above).
- **No unit tests, no CI, no tests on real environmental (non-PR2) data, no V9 marker test, no PROTAX comparison.**
- Bugs found and fixed: PR2 headers carry no lineage (needs the `.tax` file); SINTAX rank letters (vsearch accepts only d,k,p,c,o,f,g,s); a script missing from the project folder.

## 8. Known limitations (state them with any number)
- Clade holdout from PR2 only approximates real novelty; held-out clades always keep relatives in the reference. Real deep-sea dark taxa may be harder.
- PR2 labels are not ground truth; some "novel" clades may be mislabeled or polyphyletic.
- Removing identical sequences with conflicting taxonomy flatters known-sequence accuracy for all tools.
- All seeds share one PR2 pool; dev and test splits share it too (small tuning leakage). Seed std is optimistic.
- "Correct stop" credits only an exact stop at the parent rank; a tool that stops higher is cautious, not wrong, but scores 0. Over-classification is the cleaner harm measure.
- Evaluation capped at genus; V4 only; eukaryotes only; one reference (PR2).
- Thresholds are matched on a 0.05 grid, so matching is approximate; naive Bayes cannot reach 2% known error.
- Ensemble costs ~5x compute of v1.

## 9. Gaps before a UI / product can use this
- **Trained models are not saved.** `train_modelA.py` trains per split and only writes predictions. There is no weights file, label map, or calibrator artifact and no
  single-sequence/batch inference entry point. A final model trained on the full PR2 V4 reference does not exist yet.
- No FASTA/ASV-table-in, report-out API; no abundance weighting; no explicit novel/known/lineage-only labels (only per-rank confidences).
- The operating threshold (tau) and its error trade-off are undecided.
- Hardware assumptions: tested on one RTX 4060 8 GB + CPU; vsearch/cutadapt/DECIPHER commands run on the author's machine.

## 10. Reproduce
Layout used: `~/edna/projects/<proj>/{scripts,work,results,logs}`; copy `pipeline/*` into `<proj>/scripts`. Conda envs: `edna-core` (python, numpy, scikit-learn, torch), `edna-qc` (cutadapt, vsearch), `edna-r` (R + DECIPHER).
```bash
# download pr2_version_5.0.0_SSU_mothur.fasta AND pr2_version_5.0.0_SSU_mothur.tax from https://zenodo.org/records/10137946 into ~/Downloads
cd ~/edna/projects/proj2/scripts
P=~/edna/projects/proj2 bash run_all.sh            # V4 + splits + all tools (genus, family; 3 seeds); ~3 h on the author's machine
bash run_dedup.sh                                  # 99% de-duplicated sibling project proj2_dedup, 5 seeds
bash tune_modelA.sh                                # tuning on dev splits (seeds 100-101); ~1h50 on the author's machine
# final tuned model on the test seeds:
python train_modelA.py --split-dir <split> --tag _reg_ens5 --dropout 0.5 --in-dropout 0.2 --wd 0.01 --mut 0.06 --crop 0.6 --ls 0.1 --ensemble 5
python score.py --splits <proj>/work/splits/holdout_genus/seed* --csv <proj>/results/results_genus.csv
python compare_matched.py <proj>/results
```
Adding a new model: write `pred_<name>.tsv` into each split folder in the format above; `score.py` picks it up automatically.

## 11. Ideas for the next design (hypotheses, none verified)
- Train with explicit novelty: use inner held-out clades as negatives / outlier exposure, or an "unknown" output per rank, instead of only calibrating afterwards.
- Hierarchical loss or per-rank heads, so higher ranks are not just sums of genus probabilities.
- Different input: CNN on raw sequence, learned k-mer embeddings, or sequence + position.
- Distance/prototype methods, or conformal prediction per rank (coverage guarantees).
- Phylogenetic placement for the unknown group (stable IDs for novel lineages).
- Longer training for the regularised models (they hit the 25-epoch cap); bigger or more diverse ensembles.
- A clade-disjoint dev protocol; V9 marker; PROTAX as a comparison; the real CCZ deep-sea reads as a qualitative demo.
