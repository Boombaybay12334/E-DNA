#!/usr/bin/env python3
"""Score any tool on the leave-one-clade-out benchmark.

Prediction format (one TSV per tool, named pred_<tool>.tsv inside each split dir):
    id <TAB> name1;name2;...;nameN <TAB> conf1;conf2;...;confN
names root->leaf; conf = per-rank confidence in [0,1]. Tools with no confidence: use 1.0.
Unclassified/'unassigned' ranks should be left out (truncate the lineage).

Definitions (per query; T = deepest rank that exists in the reference for the truth
lineage, P = deepest rank the tool assigns at threshold tau, both capped at --max-rank):
  misclass     : some assigned rank is wrong   (includes any name given below T for novel taxa)
  exact        : no wrong rank and P == T      (for novel queries = the correct stop)
  conservative : no wrong rank and P < T
  flagged      : P <= h   (tool stopped before naming the held-out rank h)
Novelty detection = flagged on 'novel' (recall) vs flagged on 'known' (false-flag rate).
"""
import argparse, glob, os, json
import numpy as np
from common import *

TAUS = [round(x, 2) for x in np.arange(0.0, 1.0001, 0.05)]


def load_truth(p):
    T = {}
    with open(p) as f:
        next(f)
        for line in f:
            i, lin, grp, hr, td = line.rstrip("\n").split("\t")
            T[i] = (tuple((lin.split(";") + [""] * 9)[:9]), grp, hr, int(td))
    return T


def load_pred(p):
    P = {}
    with open(p) as f:
        next(f)
        for line in f:
            x = line.rstrip("\n").split("\t")
            if len(x) < 3:
                continue
            P[x[0]] = (x[1].split(";") if x[1] else [],
                       [float(c) for c in x[2].split(";")] if x[2] else [])
    return P


def pred_depth(names, conf, tau):
    d = 0
    for n, c in zip(names, conf):
        if n == "" or c < tau:
            break
        d += 1
    return d


def metrics_at(truth, pred, tau, h, cap):
    rows = {"known": [], "novel": []}
    for qid, (tn, grp, hr, T) in truth.items():
        pn, pc = pred.get(qid, ([], []))
        P = min(pred_depth(pn, pc, tau), cap)
        fw = next((i for i in range(P) if pn[i] != tn[i]), None)
        rows[grp].append((P, fw, min(T, cap), pn))
    out = {}
    for g, lst in rows.items():
        n = len(lst)
        if n == 0:
            continue
        m = {"n": n,
             "misclass": sum(fw is not None for P, fw, T, _ in lst) / n,
             "exact": sum(fw is None and P == T for P, fw, T, _ in lst) / n,
             "conservative": sum(fw is None and P < T for P, fw, T, _ in lst) / n,
             "overcall": sum(P > T for P, fw, T, _ in lst) / n,
             "flagged": sum(P <= h for P, fw, T, _ in lst) / n}
        out[g] = m
    return out


def auc(points):
    pts = sorted(set([(0.0, 0.0), (1.0, 1.0)] + points))
    return float(sum((x2 - x1) * (y1 + y2) / 2 for (x1, y1), (x2, y2) in zip(pts, pts[1:])))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--splits", nargs="+", required=True, help="split dirs (e.g. out/holdout_genus/seed*)")
    ap.add_argument("--max-rank", default="genus", choices=["genus", "species"])
    ap.add_argument("--show-taus", nargs="+", type=float, default=[0.5, 0.8, 0.95])
    ap.add_argument("--csv", default="results.csv")
    a = ap.parse_args()
    cap = 8 if a.max_rank == "genus" else 9

    acc = {}  # (tool,tau,group,metric) -> list over splits ; (tool,'auc') -> list
    for d in a.splits:
        truth = load_truth(f"{d}/truth.tsv")
        hname = next(v[2] for v in truth.values() if v[1] == "novel")
        h = RANKS.index(hname)
        for pf in sorted(glob.glob(f"{d}/pred_*.tsv")):
            tool = os.path.basename(pf)[5:-4]
            pred = load_pred(pf)
            pts = []
            for tau in TAUS:
                m = metrics_at(truth, pred, tau, h, cap)
                for g, mm in m.items():
                    for k, v in mm.items():
                        acc.setdefault((tool, tau, g, k), []).append(v)
                if "known" in m and "novel" in m:
                    pts.append((m["known"]["flagged"], m["novel"]["flagged"]))
            acc.setdefault((tool, "auc"), []).append(auc(pts))

    tools = sorted({k[0] for k in acc})
    with open(a.csv, "w") as f:
        f.write("tool,tau,group,metric,mean,sd,n_splits\n")
        for k, v in acc.items():
            if k[1] == "auc":
                f.write(f"{k[0]},,,flag_auc,{np.mean(v):.4f},{np.std(v):.4f},{len(v)}\n")
            else:
                f.write(f"{k[0]},{k[1]},{k[2]},{k[3]},{np.mean(v):.4f},{np.std(v):.4f},{len(v)}\n")

    g = lambda t, tau, grp, met: np.mean(acc.get((t, tau, grp, met), [np.nan]))
    print(f"holdout={hname}  splits={len(a.splits)}  cap={a.max_rank}\n")
    print("tool | tau | known:misclass exact | novel:exact(correct stop) overcall | novel flag recall | known false flag")
    for t in tools:
        for tau in a.show_taus:
            print(f"{t} | {tau} | {g(t,tau,'known','misclass'):.3f} {g(t,tau,'known','exact'):.3f} | "
                  f"{g(t,tau,'novel','exact'):.3f} {g(t,tau,'novel','overcall'):.3f} | "
                  f"{g(t,tau,'novel','flagged'):.3f} | {g(t,tau,'known','flagged'):.3f}")
        print(f"{t} | flag AUC = {np.mean(acc[(t,'auc')]):.3f} +/- {np.std(acc[(t,'auc')]):.3f}")
    print("\nfull curves ->", a.csv)


if __name__ == "__main__":
    main()
