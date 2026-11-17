# Results log (all numbers copied from the runs' own output)

Metric definitions are at the top of `pipeline/score.py`. Short version, per query: T = deepest rank that exists in the
reference for the true lineage; P = deepest rank the tool assigns at confidence threshold tau (capped at genus).
- `known_mis`  : fraction of KNOWN queries with any wrong assigned rank
- `known_exact`: fraction of KNOWN queries assigned to genus (P == T), no wrong rank
- `novel_stop` : fraction of NOVEL queries stopped exactly at the parent rank, no wrong rank (credit only for the exact stop)
- `novel_overcall`: fraction of NOVEL queries given a name at the held-out rank or deeper (necessarily wrong)
- `flag AUC`   : "stopped before the held-out rank" as a novelty detector, known false-flag rate vs novel recall, over tau 0..1 (step 0.05)
"matched" tables pick, per tool, the tau whose known_mis is closest to 0.02 / 0.05 (grid step 0.05, so not exact).
Seed-to-seed +/- understates real uncertainty: all seeds come from the same PR2 pool.

## RUN 3 (FINAL TEST): near-duplicates clustered at 99%, 5 seeds (0-4), genus+family holdout. Includes tuned Model A `reg_ens5`
(`modelA` = v1 settings, `modelA_reg_ens5` = v2 tuned ensemble; `_probonly` = same network without distance features)

holdout=genus  splits=5
idtaxa | flag AUC = 0.771 +/- 0.007
modelA | flag AUC = 0.770 +/- 0.008
modelA_probonly | flag AUC = 0.759 +/- 0.010
modelA_reg_ens5 | flag AUC = 0.784 +/- 0.009
modelA_reg_ens5_probonly | flag AUC = 0.771 +/- 0.012
nb_k7 | flag AUC = 0.757 +/- 0.005
sintax | flag AUC = 0.748 +/- 0.005
tophit | flag AUC = 0.641 +/- 0.013

holdout=family  splits=5
idtaxa | flag AUC = 0.903 +/- 0.003
modelA | flag AUC = 0.902 +/- 0.005
modelA_probonly | flag AUC = 0.885 +/- 0.007
modelA_reg_ens5 | flag AUC = 0.914 +/- 0.006
modelA_reg_ens5_probonly | flag AUC = 0.906 +/- 0.008
nb_k7 | flag AUC = 0.890 +/- 0.005
sintax | flag AUC = 0.894 +/- 0.002
tophit | flag AUC = 0.794 +/- 0.010

== genus holdout: threshold where known misclass is closest to 0.02 ==
tool               tau known_mis known_exact novel_stop novel_overcall
idtaxa            0.75     0.019       0.306      0.201          0.052
modelA            0.90     0.020       0.135      0.483          0.010
modelA_probonly   0.90     0.020       0.124      0.475          0.011
modelA_reg_ens5   0.85     0.022       0.230      0.602          0.023
modelA_reg_ens5_probonly  0.85     0.022       0.224      0.583          0.023
nb_k7             1.00     0.031       0.414      0.403          0.102
sintax            1.00     0.017       0.334      0.381          0.073
tophit            1.00     0.000       0.000      0.000          0.000

== genus holdout: threshold where known misclass is closest to 0.05 ==
tool               tau known_mis known_exact novel_stop novel_overcall
idtaxa            0.55     0.053       0.518      0.333          0.169
modelA            0.70     0.048       0.348      0.581          0.062
modelA_probonly   0.70     0.047       0.346      0.564          0.067
modelA_reg_ens5   0.60     0.051       0.418      0.646          0.083
modelA_reg_ens5_probonly  0.60     0.049       0.416      0.626          0.090
nb_k7             0.95     0.055       0.540      0.448          0.187
sintax            0.85     0.054       0.569      0.467          0.234
tophit            1.00     0.000       0.000      0.000          0.000

== family holdout: threshold where known misclass is closest to 0.02 ==
tool               tau known_mis known_exact novel_stop novel_overcall
idtaxa            0.75     0.019       0.283      0.028          0.040
modelA            0.90     0.018       0.212      0.135          0.038
modelA_probonly   0.90     0.017       0.166      0.141          0.046
modelA_reg_ens5   0.85     0.020       0.290      0.299          0.050
modelA_reg_ens5_probonly  0.85     0.019       0.288      0.279          0.058
nb_k7             1.00     0.034       0.392      0.158          0.072
sintax            1.00     0.018       0.301      0.134          0.066
tophit            1.00     0.000       0.000      0.000          0.000

== family holdout: threshold where known misclass is closest to 0.05 ==
tool               tau known_mis known_exact novel_stop novel_overcall
idtaxa            0.60     0.045       0.439      0.071          0.106
modelA            0.75     0.045       0.384      0.231          0.082
modelA_probonly   0.70     0.050       0.395      0.236          0.112
modelA_reg_ens5   0.70     0.046       0.441      0.347          0.096
modelA_reg_ens5_probonly  0.65     0.047       0.446      0.328          0.118
nb_k7             0.95     0.062       0.511      0.211          0.138
sintax            0.90     0.047       0.496      0.209          0.180
tophit            1.00     0.000       0.000      0.000          0.000

## RUN 4 (DEV TUNING of Model A on separate dev splits, seeds 100-101, dedup data; 2 seeds -> indicative only)
Settings: _v1 (dropout .2, wd 1e-5, mut .03, crop .8, ls .05, k6) | _reg (dropout .5, in-dropout .2, wd .01, mut .06, crop .6, ls .1)
| _reg_ens5 (_reg + 5-network ensemble) | _reg_k7 (_reg with 7-mers)
Observed: v1 early-stopped at epoch 7-10; the regularised models ran to the 25-epoch cap (23-25) -> likely undertrained.

holdout=genus  splits=2
modelA_reg | flag AUC = 0.775 +/- 0.005
modelA_reg_ens5 | flag AUC = 0.784 +/- 0.004
modelA_reg_ens5_probonly | flag AUC = 0.772 +/- 0.005
modelA_reg_k7 | flag AUC = 0.772 +/- 0.003
modelA_reg_k7_probonly | flag AUC = 0.748 +/- 0.003
modelA_reg_probonly | flag AUC = 0.751 +/- 0.006
modelA_v1 | flag AUC = 0.758 +/- 0.001
modelA_v1_probonly | flag AUC = 0.744 +/- 0.002
nb_k7 | flag AUC = 0.751 +/- 0.003
holdout=family  splits=2
modelA_reg | flag AUC = 0.912 +/- 0.007
modelA_reg_ens5 | flag AUC = 0.921 +/- 0.006
modelA_reg_ens5_probonly | flag AUC = 0.914 +/- 0.010
modelA_reg_k7 | flag AUC = 0.914 +/- 0.009
modelA_reg_k7_probonly | flag AUC = 0.898 +/- 0.013
modelA_reg_probonly | flag AUC = 0.896 +/- 0.011
modelA_v1 | flag AUC = 0.909 +/- 0.000
modelA_v1_probonly | flag AUC = 0.890 +/- 0.007
nb_k7 | flag AUC = 0.901 +/- 0.001

(genus @5% known error, dev) known_exact / novel_stop / novel_overcall:
 v1 0.330/0.594/0.062 | reg 0.379/0.629/0.070 | reg_ens5 0.405/0.675/0.075 | reg_k7 0.331/0.630/0.053 | nb_k7 0.529/0.470/0.189

## RUN 2 (first stricter test): near-duplicates clustered at 99%, 5 seeds, Model A v1 settings only
holdout=genus: idtaxa 0.771+/-0.007 | modelA 0.770+/-0.008 | modelA_probonly 0.759+/-0.010 | nb_k7 0.757+/-0.005 | sintax 0.748+/-0.005 | tophit 0.641+/-0.013
holdout=family: idtaxa 0.903+/-0.003 | modelA 0.902+/-0.005 | modelA_probonly 0.885+/-0.007 | nb_k7 0.890+/-0.005 | sintax 0.894+/-0.002 | tophit 0.794+/-0.010
(matched-error tables for v1 are the `modelA` rows in RUN 3 above; identical splits and predictions.)

## RUN 1 (first full run): NO de-duplication, 3 seeds, Model A v1. Kept for reference only; known-sequence accuracy is inflated by near-duplicates.
holdout=genus : idtaxa 0.796+/-0.005 | modelA 0.816+/-0.005 | modelA_probonly 0.794+/-0.008 | nb_k7 0.781+/-0.003 | sintax 0.781+/-0.006 | tophit 0.645+/-0.004
holdout=family: idtaxa 0.923+/-0.005 | modelA 0.932+/-0.006 | modelA_probonly 0.911+/-0.006 | nb_k7 0.912+/-0.010 | sintax 0.899+/-0.005 | tophit 0.828+/-0.013
Model A's AUC lead over IDTAXA seen here (genus +0.020) disappeared after de-duplication (RUN 2) -> partly an artifact of duplicates.
(An earlier SINTAX result in this run was a bug - wrong rank letters for vsearch - and was fixed; the numbers above are post-fix.)
