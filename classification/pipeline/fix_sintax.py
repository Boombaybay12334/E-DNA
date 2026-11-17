#!/usr/bin/env python3
"""Rewrite ref_sintax.fasta in every split with vsearch-compatible rank letters (no other change)."""
import glob, sys, os
from common import *
root = sys.argv[1]
LET = "dkpcofgs"
for d in sorted(glob.glob(f"{root}/holdout_*/seed*")):
    ids, seqs = read_fasta(f"{d}/ref.fasta")
    lin = read_lineages(f"{d}/ref.tax.tsv")
    hdr = []
    for i in ids:
        p = lin[i]; n = min(depth_of(p), len(LET))
        hdr.append(f"{i};tax=" + ",".join(f"{LET[j]}:{p[j]}" for j in range(n)) + ";")
    write_fasta(f"{d}/ref_sintax.fasta", ids, seqs, hdr)
    for f in ("sintax.raw", "pred_sintax.tsv"):
        if os.path.exists(f"{d}/{f}"):
            os.remove(f"{d}/{f}")
    print("rewrote", d)
