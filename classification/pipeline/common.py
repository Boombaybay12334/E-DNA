"""Shared helpers for the 18S novel-taxa benchmark."""
import re
import numpy as np

# PR2-style ranks. Holdout/evaluation works on any contiguous prefix of these.
RANKS = ["domain", "supergroup", "division", "subdivision", "class",
         "order", "family", "genus", "species"]
GENUS_IDX = RANKS.index("genus")  # 7 -> depth 8 means "assigned to genus"

_clean = re.compile(r"[,;:=\s]")


def clean_name(n):
    """SINTAX/IDTAXA-safe name."""
    return _clean.sub("_", n.strip())


def read_fasta(path):
    ids, seqs = [], []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            if line[0] == ">":
                ids.append(line[1:].split()[0].split(";")[0])
                seqs.append([])
            else:
                seqs[-1].append(line.upper().replace("U", "T"))
    return ids, ["".join(s) for s in seqs]


def write_fasta(path, ids, seqs, headers=None):
    with open(path, "w") as f:
        for i, (sid, s) in enumerate(zip(ids, seqs)):
            h = headers[i] if headers else sid
            f.write(f">{h}\n{s}\n")


def read_lineages(path):
    """TSV: id <TAB> rank1;rank2;...  -> {id: tuple of len(RANKS)} (padded with '')."""
    out = {}
    with open(path) as f:
        for line in f:
            parts = line.rstrip("\n").split("\t")
            if len(parts) < 2 or parts[0] == "id":
                continue
            names = [clean_name(x) if x else "" for x in parts[1].split(";")]
            out[parts[0]] = tuple((names + [""] * len(RANKS))[: len(RANKS)])
    return out


def depth_of(path):
    d = 0
    for n in path:
        if n == "":
            break
        d += 1
    return d


_LUT = {"A": 0, "C": 1, "G": 2, "T": 3}


def kmer_ids(seq, k):
    """Unique k-mer integer codes; windows containing non-ACGT are skipped."""
    ids, code, valid, mask = set(), 0, 0, (1 << (2 * k)) - 1
    for ch in seq:
        v = _LUT.get(ch)
        if v is None:
            code, valid = 0, 0
            continue
        code = ((code << 2) | v) & mask
        valid += 1
        if valid >= k:
            ids.add(code)
    return np.fromiter(ids, dtype=np.int64, count=len(ids))
