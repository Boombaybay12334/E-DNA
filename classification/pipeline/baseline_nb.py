#!/usr/bin/env python3
"""Baseline 1: RDP-style naive Bayes k-mer classifier with bootstrap confidence.

Trained at genus level (like RDP). Per-rank confidence = fraction of bootstrap
replicates (1/8 of the query's k-mers each) whose best genus shares the same ancestor
at that rank. A threshold on that confidence is the 'novelty' rule of this baseline.
Memory: genera * 4^k float32  (k=7 -> ~65 KB per genus; k=8 -> ~260 KB per genus).
"""
import argparse
import numpy as np
from common import *


def train(ref_fasta, ref_tax, k):
    ids, seqs = read_fasta(ref_fasta)
    lin = read_lineages(ref_tax)
    gpaths = sorted({lin[i][: GENUS_IDX + 1] for i in ids})
    gidx = {p: j for j, p in enumerate(gpaths)}
    F = 4 ** k
    counts = np.zeros((len(gpaths), F), np.float32)
    Ng = np.zeros(len(gpaths), np.float32)
    for i, s in zip(ids, seqs):
        j = gidx[lin[i][: GENUS_IDX + 1]]
        counts[j, kmer_ids(s, k)] += 1
        Ng[j] += 1
    Pw = ((counts.sum(0) + 0.5) / (Ng.sum() + 1)).astype(np.float32)   # Wang et al. 2007
    counts += Pw[None, :]
    counts /= (Ng + 1)[:, None]
    np.log(counts, out=counts)
    return {"logP": counts, "gpaths": gpaths, "k": k}


def classify(model, qids, qseqs, n_boot=100, seed=0):
    rng = np.random.default_rng(seed)
    logP, gpaths, k = model["logP"], model["gpaths"], model["k"]
    out = []
    for qid, s in zip(qids, qseqs):
        w = kmer_ids(s, k)
        if len(w) == 0:
            out.append((qid, [], []))
            continue
        sub = logP[:, w]
        best = int(sub.sum(1).argmax())
        nsub = max(1, len(w) // 8)
        S = np.zeros((len(w), n_boot), np.float32)
        for b in range(n_boot):
            S[rng.choice(len(w), nsub, replace=False), b] = 1.0
        bs = (sub @ S).argmax(0)
        bp = gpaths[best]
        conf = [float(np.mean([gpaths[j][: r + 1] == bp[: r + 1] for j in bs]))
                for r in range(GENUS_IDX + 1)]
        out.append((qid, list(bp), conf))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ref-fasta", required=True)
    ap.add_argument("--ref-tax", required=True)
    ap.add_argument("--query", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--k", type=int, default=7)
    ap.add_argument("--boot", type=int, default=100)
    ap.add_argument("--seed", type=int, default=0)
    a = ap.parse_args()
    model = train(a.ref_fasta, a.ref_tax, a.k)
    qids, qseqs = read_fasta(a.query)
    res = classify(model, qids, qseqs, a.boot, a.seed)
    with open(a.out, "w") as f:
        f.write("id\tlineage\tconf\n")
        for qid, names, conf in res:
            f.write(f"{qid}\t{';'.join(names)}\t{';'.join(f'{c:.3f}' for c in conf)}\n")


if __name__ == "__main__":
    main()
