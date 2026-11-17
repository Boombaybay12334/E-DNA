#!/usr/bin/env python3
"""Convert external tool output to the benchmark prediction format (id, lineage, conf).

  sintax : vsearch --sintax ... --tabbedout out.tsv   (use ref_sintax.fasta as --db)
  tophit : vsearch --usearch_global ... --userout hits.tsv --userfields query+target+id
           lineage of best hit, conf = identity/100 at every rank (crude top-hit baseline)
"""
import argparse, re
from common import *


def sintax(inp, out):
    LET = "dkpcofgs"                       # rank letters written by prepare_data.py (domain..genus)
    pat = re.compile(r"^([dkpcofgst]):(.*)\(([0-9.]+)\)$")
    with open(inp) as f, open(out, "w") as o:
        o.write("id\tlineage\tconf\n")
        for line in f:
            x = line.rstrip("\n").split("\t")
            slots = {}
            if len(x) > 1 and x[1]:
                for tok in x[1].split(","):
                    m = pat.match(tok)
                    if m and m.group(1) in LET:
                        slots[LET.index(m.group(1))] = (m.group(2), float(m.group(3)))
            names, conf = [], []
            for i in range(len(LET)):
                if i not in slots:
                    break
                names.append(slots[i][0]); conf.append(slots[i][1])
            o.write(f"{x[0].split(';')[0]}\t{';'.join(names)}\t{';'.join(f'{c:.3f}' for c in conf)}\n")


def tophit(inp, reftax, out):
    lin = read_lineages(reftax)
    best = {}
    with open(inp) as f:
        for line in f:
            q, t, idn = line.rstrip("\n").split("\t")[:3]
            idn = float(idn)
            if q not in best or idn > best[q][1]:
                best[q] = (t.split(";")[0], idn)
    with open(out, "w") as o:
        o.write("id\tlineage\tconf\n")
        for q, (t, idn) in best.items():
            p = lin[t]; d = depth_of(p)
            o.write(f"{q}\t{';'.join(p[:d])}\t{';'.join([f'{idn/100:.3f}']*d)}\n")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("mode", choices=["sintax", "tophit"])
    ap.add_argument("--in", dest="inp", required=True)
    ap.add_argument("--ref-tax")
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    sintax(a.inp, a.out) if a.mode == "sintax" else tophit(a.inp, a.ref_tax, a.out)
