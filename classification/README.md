# classification/ - 18S novel-taxa classifier (frozen baseline v0)

Research skeleton: a leave-one-clade-out benchmark for 18S taxonomy under reference-database incompleteness, plus a first neural model.
Start with **`docs/STATE.md`** (what exists, architecture, protocol, tests, limitations, gaps). Numbers are in **`results/RESULTS.md`**.
Code is in `pipeline/` (flat; scripts import each other, copy the folder into `<project>/scripts` to run; see STATE.md section 10).
Large data (PR2 files, splits, predictions, logs) is not versioned.
