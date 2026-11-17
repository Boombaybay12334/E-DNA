#!/usr/bin/env python3
"""Turn a PR2 FASTA (or FASTA + .tax file) into the two files prepare_data.py needs.

  python make_tax_from_pr2.py --fasta pr2.fasta [--tax-file pr2.tax] --out-fasta pr2_clean.fasta --out-tax pr2_tax.tsv

Handles lineage in the FASTA header (after the first space/tab, or '|'-separated) or in a separate
mothur-style .tax file (id <TAB> a;b;c;). ALWAYS run `head -3` on your file first and check the output.
"""
import argparse, re, sys


def parse_lineage(s):
    s = s.strip().rstrip(";")
    parts = s.split(";") if ";" in s else s.split("|")
    return [p.strip() for p in parts if p.strip() != ""]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--fasta", required=True)
    ap.add_argument("--tax-file")
    ap.add_argument("--out-fasta", required=True)
    ap.add_argument("--out-tax", required=True)
    ap.add_argument("--min-ranks", type=int, default=8, help="drop records with fewer ranks (8 = genus)")
    a = ap.parse_args()

    ext = {}
    if a.tax_file:
        for line in open(a.tax_file):
            x = line.rstrip("\n").split("\t")
            if len(x) >= 2:
                ext[x[0].split()[0]] = parse_lineage(x[1])

    n_in = n_out = n_nolin = n_short = 0
    with open(a.fasta) as f, open(a.out_fasta, "w") as fo, open(a.out_tax, "w") as to:
        sid, lin, seq = None, None, []

        def flush():
            nonlocal n_out, n_nolin, n_short
            if sid is None:
                return
            L = ext.get(sid, lin)
            if not L:
                n_nolin += 1
            elif len(L) < a.min_ranks:
                n_short += 1
            else:
                fo.write(f">{sid}\n{''.join(seq)}\n")
                to.write(f"{sid}\t{';'.join(L)}\n")
                n_out += 1

        for line in f:
            line = line.rstrip("\n")
            if line.startswith(">"):
                flush()
                n_in += 1
                h = line[1:]
                m = re.match(r"^(\S+)[\s](.*)$", h)
                if m:
                    sid, rest = m.group(1), m.group(2)
                elif "|" in h:
                    sid, rest = h.split("|", 1)
                else:
                    sid, rest = h, ""
                lin = parse_lineage(rest) if rest else None
                seq = []
            else:
                seq.append(line.strip())
        flush()
    print(f"records in: {n_in} | written: {n_out} | no lineage: {n_nolin} | fewer than {a.min_ranks} ranks: {n_short}",
          file=sys.stderr)


if __name__ == "__main__":
    main()
