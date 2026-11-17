#!/usr/bin/env python3
"""Model A (v2): k-mer MLP genus classifier (optionally an ensemble) + distance-aware calibrated confidence.

Per split directory (uses ref.fasta, ref.tax.tsv, query.fasta, truth.tsv; writes
pred_modelA<tag>.tsv and pred_modelA<tag>_probonly.tsv):
  1. INNER split inside the reference (clades held out at the same rank as the outer holdout + some known
     sequences). Train the model(s) on the rest, early-stopping on the known part.
  2. Fit one logistic-regression calibrator per rank on the inner held-out sequences.
  3. Retrain on the FULL reference for each member's best epoch, classify the outer queries, apply the calibrators.
Defaults reproduce the v1 model. Regularisation / ensemble options are the v2 changes.
"""
import argparse, time, types
import numpy as np
import torch, torch.nn as nn, torch.nn.functional as Fn
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from common import *
from prepare_data import make_split

NR = GENUS_IDX + 1
A2I = np.zeros(256, dtype=np.uint8)
for _i, _c in enumerate("ACGT"):
    A2I[ord(_c)] = _i


def encode(seq):
    return A2I[np.frombuffer(seq.encode(), dtype=np.uint8)]


def counts_from_arr(a, k):
    n = len(a) - k + 1
    if n <= 0:
        return np.zeros(4 ** k, np.float32)
    code = np.zeros(n, dtype=np.int64)
    for j in range(k):
        code = (code << 2) | a[j: j + n]
    return np.bincount(code, minlength=4 ** k).astype(np.float32)


def featurize(arrs, k, rng=None, crop_min=0.8, mut_max=0.03):
    X = np.empty((len(arrs), 4 ** k), np.float32)
    for i, a in enumerate(arrs):
        if rng is not None:
            L = len(a)
            l = max(k + 1, int(L * rng.uniform(crop_min, 1.0)))
            s = int(rng.integers(0, L - l + 1))
            a = a[s: s + l]
            mask = rng.random(l) < rng.uniform(0.0, mut_max)
            if mask.any():
                a = a.copy()
                a[mask] = rng.integers(0, 4, int(mask.sum()))
        c = counts_from_arr(a, k)
        X[i] = np.sqrt(c / max(float(c.sum()), 1.0))
    return X


class Net(nn.Module):
    def __init__(self, d_in, n_cls, emb=256, p=0.2, p_in=0.0):
        super().__init__()
        self.enc = nn.Sequential(
            nn.Dropout(p_in),
            nn.Linear(d_in, 1024), nn.LayerNorm(1024), nn.GELU(), nn.Dropout(p),
            nn.Linear(1024, 512), nn.LayerNorm(512), nn.GELU(), nn.Dropout(p),
            nn.Linear(512, emb), nn.LayerNorm(emb), nn.GELU())
        self.head = nn.Linear(emb, n_cls)

    def forward(self, x):
        z = self.enc(x)
        return self.head(z), z


def train(arrs, y, n_cls, k, epochs, patience, dev, seed, hp, val=None, tag=""):
    torch.manual_seed(seed)
    rng = np.random.default_rng(seed)
    net = Net(4 ** k, n_cls, p=hp.dropout, p_in=hp.in_dropout).to(dev)
    opt = torch.optim.AdamW(net.parameters(), lr=1e-3, weight_decay=hp.wd)
    if val is not None:
        Xv = torch.from_numpy(featurize(val[0], k)).to(dev)
        yv = torch.from_numpy(val[1]).to(dev)
    best, best_sd, best_ep, bad = 1e9, None, epochs, 0
    n, bs = len(arrs), 256
    for ep in range(1, epochs + 1):
        net.train()
        perm = rng.permutation(n)
        t0, tot = time.time(), 0.0
        for i in range(0, n, bs):
            idx = perm[i: i + bs]
            xb = torch.from_numpy(featurize([arrs[j] for j in idx], k, rng, hp.crop, hp.mut)).to(dev)
            yb = torch.from_numpy(y[idx]).to(dev)
            loss = Fn.cross_entropy(net(xb)[0], yb, label_smoothing=hp.ls)
            opt.zero_grad(); loss.backward(); opt.step()
            tot += loss.item() * len(idx)
        msg = f"[{tag}] epoch {ep}/{epochs} train_loss {tot / n:.4f} ({time.time() - t0:.0f}s)"
        if val is not None:
            net.eval()
            with torch.no_grad():
                vl = Fn.cross_entropy(net(Xv)[0], yv).item()
            msg += f" val_loss {vl:.4f}"
            if vl < best - 1e-4:
                best, best_ep, bad = vl, ep, 0
                best_sd = {kk: v.detach().clone() for kk, v in net.state_dict().items()}
            else:
                bad += 1
        print(msg, flush=True)
        if val is not None and bad >= patience:
            break
    if best_sd is not None:
        net.load_state_dict(best_sd)
    return net, best_ep


@torch.no_grad()
def embed(net, arrs, k, dev, bs=1024):
    net.eval()
    Z = []
    for i in range(0, len(arrs), bs):
        x = torch.from_numpy(featurize(arrs[i: i + bs], k)).to(dev)
        Z.append(Fn.normalize(net(x)[1], dim=1))
    return torch.cat(Z)


def clade_ids(gpaths):
    gcid = np.zeros((NR, len(gpaths)), dtype=np.int64)
    for r in range(NR):
        m = {}
        for g, p in enumerate(gpaths):
            gcid[r, g] = m.setdefault(p[: r + 1], len(m))
    return gcid


@torch.no_grad()
def query_features(nets, arrs, k, dev, ref_Zs, ref_gidx, gcid, topk=50, bs=512):
    """Ensemble-aware features. Probabilities are averaged over members before the argmax; distances are
    averaged over members (each in its own embedding space); 'sd' = member disagreement per rank."""
    for net in nets:
        net.eval()
    E = len(nets)
    gcid_t = torch.from_numpy(gcid).to(dev)
    ref_cid = gcid_t[:, torch.from_numpy(ref_gidx).to(dev)]
    keys = ("pred", "p", "sd", "dall", "dcl", "found", "ent")
    out = {kk: [] for kk in keys}
    for i in range(0, len(arrs), bs):
        x = torch.from_numpy(featurize(arrs[i: i + bs], k)).to(dev)
        outs = [net(x) for net in nets]
        mprobs = [torch.softmax(o[0], 1) for o in outs]
        pm = torch.stack(mprobs).mean(0)
        pred = pm.argmax(1)
        ent = -(pm * torch.log(pm + 1e-12)).sum(1)
        n_b = len(x)
        P, SD = [], []
        for r in range(NR):
            C = int(gcid[r].max()) + 1
            pc = gcid_t[r][pred]
            m = torch.zeros(n_b, C, device=dev).index_add_(1, gcid_t[r], pm)
            P.append(m.gather(1, pc[:, None])[:, 0])
            if E > 1:
                ms = [torch.zeros(n_b, C, device=dev).index_add_(1, gcid_t[r], mp).gather(1, pc[:, None])[:, 0]
                      for mp in mprobs]
                SD.append(torch.stack(ms).std(0))
            else:
                SD.append(torch.zeros(n_b, device=dev))
        dall = torch.zeros(n_b, device=dev)
        DC = [torch.zeros(n_b, device=dev) for _ in range(NR)]
        FD = [torch.zeros(n_b, device=dev) for _ in range(NR)]
        for o, Zr in zip(outs, ref_Zs):
            z = Fn.normalize(o[1], dim=1)
            vals, idxs = (z @ Zr.T).topk(min(topk, Zr.shape[0]), dim=1)
            dist = 1.0 - vals
            dall += dist[:, 0] / E
            for r in range(NR):
                pc = gcid_t[r][pred]
                same = ref_cid[r][idxs] == pc[:, None]
                dc = torch.where(same, dist, torch.full_like(dist, 9.0)).min(1).values
                found = dc < 9.0
                DC[r] += torch.where(found, dc, dist[:, -1] + 0.1) / E
                FD[r] += found.float() / E
        out["pred"].append(pred.cpu()); out["ent"].append(ent.cpu()); out["dall"].append(dall.cpu())
        out["p"].append(torch.stack(P, 1).cpu()); out["sd"].append(torch.stack(SD, 1).cpu())
        out["dcl"].append(torch.stack(DC, 1).cpu()); out["found"].append(torch.stack(FD, 1).cpu())
    return {kk: torch.cat(v).numpy() for kk, v in out.items()}


def feat_matrix(F, r, use_dist, use_sd):
    p = np.clip(F["p"][:, r], 1e-4, 1 - 1e-4)
    cols = [np.log(p / (1 - p)), F["ent"]]
    if use_dist:
        cols += [F["dall"], F["dcl"][:, r], F["found"][:, r]]
        if use_sd:
            cols.append(F["sd"][:, r])
    return np.stack(cols, 1)


def fit_calibrators(F, correct, use_dist, use_sd):
    cals = []
    for r in range(NR):
        y = correct[:, r]
        if len(set(y.tolist())) < 2:
            cals.append(None)
            continue
        m = make_pipeline(StandardScaler(), LogisticRegression(C=1.0, max_iter=2000))
        m.fit(feat_matrix(F, r, use_dist, use_sd), y)
        cals.append(m)
    return cals


def apply_calibrators(F, cals, use_dist, use_sd):
    conf = np.zeros((len(F["pred"]), NR))
    for r in range(NR):
        conf[:, r] = F["p"][:, r] if cals[r] is None else cals[r].predict_proba(feat_matrix(F, r, use_dist, use_sd))[:, 1]
    return np.minimum.accumulate(conf, axis=1)


def write_pred(path, qids, gpaths, pred, conf):
    with open(path, "w") as f:
        f.write("id\tlineage\tconf\n")
        for q, g, c in zip(qids, pred, conf):
            f.write(f"{q}\t{';'.join(gpaths[g][:NR])}\t{';'.join(f'{x:.3f}' for x in c)}\n")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--split-dir", required=True)
    ap.add_argument("--tag", default="", help="suffix for output files, e.g. _reg -> pred_modelA_reg.tsv")
    ap.add_argument("--k", type=int, default=6)
    ap.add_argument("--epochs", type=int, default=25)
    ap.add_argument("--patience", type=int, default=4)
    ap.add_argument("--seed", type=int, default=0)
    ap.add_argument("--device", default="auto")
    ap.add_argument("--ensemble", type=int, default=1)
    ap.add_argument("--dropout", type=float, default=0.2)
    ap.add_argument("--in-dropout", type=float, default=0.0)
    ap.add_argument("--wd", type=float, default=1e-5)
    ap.add_argument("--mut", type=float, default=0.03, help="max substitution rate in augmentation")
    ap.add_argument("--crop", type=float, default=0.8, help="min fraction of sequence kept in augmentation")
    ap.add_argument("--ls", type=float, default=0.05, help="label smoothing")
    a = ap.parse_args()
    dev = torch.device("cuda" if (a.device == "auto" and torch.cuda.is_available()) else
                       ("cpu" if a.device == "auto" else a.device))
    print("device:", dev, flush=True)
    d, k, E = a.split_dir, a.k, a.ensemble
    use_sd = E > 1

    rid, rseq = read_fasta(f"{d}/ref.fasta")
    lin = read_lineages(f"{d}/ref.tax.tsv")
    recs = [{"id": i, "seq": s, "path": lin[i]} for i, s in zip(rid, rseq)]
    with open(f"{d}/truth.tsv") as f:
        next(f)
        hname = next(l.split("\t")[3] for l in f if l.split("\t")[2] == "novel")
    h = RANKS.index(hname)

    ns = types.SimpleNamespace(min_clade=2, holdout_frac=0.2, max_per_clade=10, known_frac=0.1)
    tr, kval, nval = make_split(recs, h, a.seed, ns)
    print(f"inner split: train={len(tr)} known_val={len(kval)} novel_val={len(nval)}", flush=True)
    gp_tr = sorted({r["path"][:NR] for r in tr})
    gi_tr = {p: j for j, p in enumerate(gp_tr)}
    y_tr = np.array([gi_tr[r["path"][:NR]] for r in tr], dtype=np.int64)
    arr_tr = [encode(r["seq"]) for r in tr]
    val = ([encode(r["seq"]) for r in kval], np.array([gi_tr[r["path"][:NR]] for r in kval], dtype=np.int64))

    nets_in, best_eps = [], []
    for m in range(E):
        net_m, ep_m = train(arr_tr, y_tr, len(gp_tr), k, a.epochs, a.patience, dev, a.seed + 100 * m, a, val, f"inner{m}")
        nets_in.append(net_m); best_eps.append(ep_m)
    print("inner best epochs:", best_eps, flush=True)

    cals = {True: [None] * NR, False: [None] * NR}
    if len(nval) >= 20 and len(kval) >= 20:
        Zs = [embed(n_, arr_tr, k, dev) for n_ in nets_in]
        vrecs = kval + nval
        Fv = query_features(nets_in, [encode(r["seq"]) for r in vrecs], k, dev, Zs, y_tr, clade_ids(gp_tr))
        correct = np.zeros((len(vrecs), NR), dtype=int)
        for n, (r, g) in enumerate(zip(vrecs, Fv["pred"])):
            pp = gp_tr[g]
            for rk in range(NR):
                correct[n, rk] = int(pp[: rk + 1] == r["path"][: rk + 1])
        cals[True] = fit_calibrators(Fv, correct, True, use_sd)
        cals[False] = fit_calibrators(Fv, correct, False, False)
        print("calibrators fitted on", len(vrecs), "inner validation sequences", flush=True)
    else:
        print("WARNING: too few inner validation sequences; falling back to raw probabilities", flush=True)
    del nets_in

    gp = sorted({r["path"][:NR] for r in recs})
    gi = {p: j for j, p in enumerate(gp)}
    y = np.array([gi[r["path"][:NR]] for r in recs], dtype=np.int64)
    arr = [encode(r["seq"]) for r in recs]
    nets = [train(arr, y, len(gp), k, best_eps[m], a.patience, dev, a.seed + 100 * m + 1, a, None, f"full{m}")[0]
            for m in range(E)]
    Zs = [embed(n_, arr, k, dev) for n_ in nets]
    qid, qseq = read_fasta(f"{d}/query.fasta")
    Fq = query_features(nets, [encode(s) for s in qseq], k, dev, Zs, y, clade_ids(gp))
    write_pred(f"{d}/pred_modelA{a.tag}.tsv", qid, gp, Fq["pred"], apply_calibrators(Fq, cals[True], True, use_sd))
    write_pred(f"{d}/pred_modelA{a.tag}_probonly.tsv", qid, gp, Fq["pred"], apply_calibrators(Fq, cals[False], False, False))
    print("wrote", f"{d}/pred_modelA{a.tag}.tsv", flush=True)


if __name__ == "__main__":
    main()
