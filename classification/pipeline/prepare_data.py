#!/usr/bin/env python3
"""Build leave-one-clade-out splits from a labelled 18S reference (e.g. PR2).

Inputs
  --fasta  reference sequences (full-length or already an amplicon)
  --tax    TSV: id <TAB> domain;supergroup;division;subdivision;class;order;family;genus[;species]
           (convert PR2's taxonomy table into this; sequences must be labelled to genus)

For every holdout rank (genus/family/order...) and seed it writes
  <out>/holdout_<rank>/seed<N>/{ref.fasta, ref.tax.tsv, query.fasta, truth.tsv,
                                ref_sintax.fasta, ref_idtaxa.fasta}
Query = 'novel' sequences (their whole clade at the holdout rank is removed from the
reference) + 'known' sequences (their genus stays in the reference).
"""
import argparse, os, random, re
from collections import defaultdict
from common import *

IUPAC = {"A": "A", "C": "C", "G": "G", "T": "T", "R": "[AG]", "Y": "[CT]", "S": "[CG]",
         "W": "[AT]", "K": "[GT]", "M": "[AC]", "B": "[CGT]", "D": "[AGT]",
         "H": "[ACT]", "V": "[ACG]", "N": "[ACGT]"}
COMP = str.maketrans("ACGTRYSWKMBDHVN", "TGCAYRSWMKVHDBN")


def primer_re(p):
    return re.compile("".join(IUPAC[c] for c in p.upper()))


def revcomp(p):
    return p.upper().translate(COMP)[::-1]


def trim(seq, fre, rre):
    m1 = fre.search(seq)
    if not m1:
        return None
    m2 = rre.search(seq, m1.end())
    if not m2:
        return None
    return seq[m1.end(): m2.start()]


def make_split(recs, h, seed, a):
    rng = random.Random(seed)
    clades = defaultdict(list)
    for r in recs:
        clades[r["path"][: h + 1]].append(r)
    children = defaultdict(list)
    for key in clades:
        children[key[:h]].append(key)

    held = set()
    for parent, kids in children.items():
        if len(kids) < 2:               # need a surviving relative so a parent-level stop exists
            continue
        elig = [k for k in kids if len(clades[k]) >= a.min_clade]
        rng.shuffle(elig)
        pick = [k for k in elig if rng.random() < a.holdout_frac]
        if len(pick) == len(kids):
            pick = pick[:-1]
        held.update(pick)

    novel, remaining = [], []
    for key, lst in clades.items():
        if key in held:
            novel += rng.sample(lst, min(len(lst), a.max_per_clade))
        else:
            remaining += lst

    by_genus = defaultdict(list)
    for r in remaining:
        by_genus[r["path"][: GENUS_IDX + 1]].append(r)
    known, ref = [], []
    for g, lst in by_genus.items():
        rng.shuffle(lst)
        if len(lst) >= 3:
            q = min(max(1, round(len(lst) * a.known_frac)), len(lst) - 2)
            known += lst[:q]
            ref += lst[q:]
        else:
            ref += lst
    return ref, known, novel


def write_split(outdir, ref, known, novel, hname):
    os.makedirs(outdir, exist_ok=True)
    prefixes = set()
    for r in ref:
        for i in range(depth_of(r["path"])):
            prefixes.add(r["path"][: i + 1])

    def target_depth(path):
        t = 0
        for i in range(depth_of(path)):
            if path[: i + 1] in prefixes:
                t = i + 1
            else:
                break
        return t

    write_fasta(f"{outdir}/ref.fasta", [r["id"] for r in ref], [r["seq"] for r in ref])
    with open(f"{outdir}/ref.tax.tsv", "w") as f:
        for r in ref:
            f.write(f"{r['id']}\t{';'.join(r['path'][:depth_of(r['path'])])}\n")
    letters = "dkpcofgs"   # the only rank letters vsearch --sintax understands (domain..genus)
    hdr_s, hdr_i = [], []
    for r in ref:
        d = depth_of(r["path"])
        tax = ",".join(f"{letters[i]}:{r['path'][i]}" for i in range(min(d, len(letters))))
        hdr_s.append(f"{r['id']};tax={tax};")
        hdr_i.append(f"{r['id']} Root;{';'.join(r['path'][:d])};")
    write_fasta(f"{outdir}/ref_sintax.fasta", [r["id"] for r in ref], [r["seq"] for r in ref], hdr_s)
    write_fasta(f"{outdir}/ref_idtaxa.fasta", [r["id"] for r in ref], [r["seq"] for r in ref], hdr_i)

    q = known + novel
    write_fasta(f"{outdir}/query.fasta", [r["id"] for r in q], [r["seq"] for r in q])
    with open(f"{outdir}/truth.tsv", "w") as f:
        f.write("id\tlineage\tgroup\tholdout_rank\ttarget_depth\n")
        for grp, lst in (("known", known), ("novel", novel)):
            for r in lst:
                f.write(f"{r['id']}\t{';'.join(r['path'])}\t{grp}\t"
                        f"{hname if grp == 'novel' else ''}\t{target_depth(r['path'])}\n")
    return len(ref), len(known), len(novel)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--fasta", required=True)
    ap.add_argument("--tax", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--fwd", help="forward primer (e.g. TAReuk454FWD1 CCAGCASCYGCGGTAATTCC)")
    ap.add_argument("--rev", help="reverse primer 5'->3' (e.g. TAReukREV3 ACTTTCGTTCTTGATYRA)")
    ap.add_argument("--holdout-ranks", nargs="+", default=["genus", "family", "order"])
    ap.add_argument("--seeds", type=int, default=5)
    ap.add_argument("--seed-start", type=int, default=0, help="first seed (use e.g. 100 for dev splits)")
    ap.add_argument("--min-len", type=int, default=200)
    ap.add_argument("--min-clade", type=int, default=3, help="min seqs for a clade to be holdout-eligible")
    ap.add_argument("--holdout-frac", type=float, default=0.2)
    ap.add_argument("--max-per-clade", type=int, default=10)
    ap.add_argument("--known-frac", type=float, default=0.1)
    a = ap.parse_args()

    ids, seqs = read_fasta(a.fasta)
    lin = read_lineages(a.tax)
    fre = rre = None
    if a.fwd and a.rev:
        fre, rre = primer_re(a.fwd), primer_re(revcomp(a.rev))

    recs, stats = [], defaultdict(int)
    for i, s in zip(ids, seqs):
        if i not in lin:
            stats["no_taxonomy"] += 1
            continue
        if fre:
            s = trim(s, fre, rre)
            if s is None:
                stats["primers_not_found"] += 1
                continue
        if len(s) < a.min_len or not re.fullmatch("[ACGT]+", s):
            stats["too_short_or_ambiguous"] += 1
            continue
        if depth_of(lin[i]) < GENUS_IDX + 1:
            stats["not_labelled_to_genus"] += 1
            continue
        recs.append({"id": i, "seq": s, "path": lin[i]})

    by_seq = defaultdict(list)
    for r in recs:
        by_seq[r["seq"]].append(r)
    final = []
    for s, lst in by_seq.items():
        if len({x["path"] for x in lst}) > 1:
            stats["identical_seq_conflicting_taxonomy"] += 1
            continue
        final.append(lst[0])
    print("kept", len(final), "of", len(ids), dict(stats))

    for hname in a.holdout_ranks:
        h = RANKS.index(hname)
        for seed in range(a.seed_start, a.seed_start + a.seeds):
            ref, known, novel = make_split(final, h, seed, a)
            d = f"{a.out}/holdout_{hname}/seed{seed}"
            n = write_split(d, ref, known, novel, hname)
            print(f"{d}: ref={n[0]} known_q={n[1]} novel_q={n[2]}")


if __name__ == "__main__":
    main()
