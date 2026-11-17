#!/usr/bin/env python3
"""Compare tools at matched known-sequence error. Usage: python compare_matched.py [results_dir]"""
import csv, sys, collections, os
rd = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/edna/projects/proj2/results")
for rank in ("genus", "family"):
    path = f"{rd}/results_{rank}.csv"
    if not os.path.exists(path):
        continue
    d = collections.defaultdict(dict)
    for x in csv.DictReader(open(path)):
        if x["tau"] == "":
            continue
        d[(x["tool"], float(x["tau"]))][(x["group"], x["metric"])] = float(x["mean"])
    tools = sorted({k[0] for k in d})
    for target in (0.02, 0.05):
        print(f"\n== {rank} holdout: threshold where known misclass is closest to {target} ==")
        print(f"{'tool':16s} {'tau':>5s} {'known_mis':>9s} {'known_exact':>11s} {'novel_stop':>10s} {'novel_overcall':>14s}")
        for t in tools:
            taus = [k[1] for k in d if k[0] == t]
            b = min(taus, key=lambda u: abs(d[(t, u)][("known", "misclass")] - target))
            m = d[(t, b)]
            print(f"{t:16s} {b:5.2f} {m[('known','misclass')]:9.3f} {m[('known','exact')]:11.3f} "
                  f"{m[('novel','exact')]:10.3f} {m[('novel','overcall')]:14.3f}")
