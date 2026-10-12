// Deterministic DEMO datasets for each sample type (water, soil, sediment). Not real observations: taxa are
// plausible for each environment, but reads, sequences, accessions and scores are synthetic.
// The analysis is identical for every type; only the reference library, methods and sample metadata differ
// (see demoSamples.ts).
// Replace `buildMockReport()` with a fetch of the pipeline's output once it exists.

import type { Asv, FlagCode, Reason, RankCall, ReferenceHit, Report, ReportMethods, SampleType } from '../types';
import { SEDIMENT_LIBRARY, SEDIMENT_SAMPLE, SOIL_LIBRARY, SOIL_SAMPLE, WATER_SAMPLE } from './demoSamples';

const RANKS = ['Domain', 'Kingdom', 'Phylum', 'Class', 'Order', 'Family', 'Genus', 'Species'];

// [lineage (Kingdom..Species, Domain is always Eukaryota), relative weight]
const WATER_LIBRARY: [string, number][] = [
  ['Metazoa;Arthropoda;Hexanauplia;Calanoida;Metridinidae;Pleuromamma;Pleuromamma abdominalis', 9],
  ['Metazoa;Arthropoda;Hexanauplia;Calanoida;Metridinidae;Pleuromamma;Pleuromamma xiphias', 6],
  ['Metazoa;Arthropoda;Hexanauplia;Calanoida;Eucalanidae;Subeucalanus;Subeucalanus subcrassus', 7],
  ['Metazoa;Arthropoda;Hexanauplia;Cyclopoida;Oncaeidae;Oncaea;Oncaea venusta', 6],
  ['Metazoa;Arthropoda;Malacostraca;Euphausiacea;Euphausiidae;Euphausia;Euphausia diomedeae', 5],
  ['Metazoa;Arthropoda;Malacostraca;Decapoda;Acanthephyridae;Acanthephyra;Acanthephyra purpurea', 3],
  ['Metazoa;Arthropoda;Malacostraca;Amphipoda;Phronimidae;Phronima;Phronima sedentaria', 2],
  ['Metazoa;Cnidaria;Hydrozoa;Siphonophorae;Diphyidae;Chelophyes;Chelophyes appendiculata', 6],
  ['Metazoa;Cnidaria;Hydrozoa;Trachymedusae;Rhopalonematidae;Aglaura;Aglaura hemistoma', 4],
  ['Metazoa;Cnidaria;Scyphozoa;Coronatae;Atollidae;Atolla;Atolla wyvillei', 2],
  ['Metazoa;Cnidaria;Anthozoa;Scleractinia;Caryophylliidae;Desmophyllum;Desmophyllum pertusum', 1],
  ['Metazoa;Mollusca;Gastropoda;Pteropoda;Limacinidae;Limacina;Limacina bulimoides', 4],
  ['Metazoa;Mollusca;Gastropoda;Pteropoda;Limacinidae;Limacina;Limacina trochiformis', 3],
  ['Metazoa;Mollusca;Gastropoda;Littorinimorpha;Pterotracheidae;Firoloida;Firoloida desmarestia', 2],
  ['Metazoa;Mollusca;Cephalopoda;Oegopsida;Ommastrephidae;Sthenoteuthis;Sthenoteuthis oualaniensis', 3],
  ['Metazoa;Mollusca;Cephalopoda;Vampyromorpha;Vampyroteuthidae;Vampyroteuthis;Vampyroteuthis infernalis', 1],
  ['Metazoa;Chordata;Actinopteri;Myctophiformes;Myctophidae;Benthosema;Benthosema pterotum', 6],
  ['Metazoa;Chordata;Actinopteri;Myctophiformes;Myctophidae;Diaphus;Diaphus garmani', 3],
  ['Metazoa;Chordata;Actinopteri;Stomiiformes;Gonostomatidae;Cyclothone;Cyclothone pallida', 4],
  ['Metazoa;Chordata;Actinopteri;Stomiiformes;Gonostomatidae;Cyclothone;Cyclothone acclinidens', 3],
  ['Metazoa;Chordata;Actinopteri;Stomiiformes;Sternoptychidae;Argyropelecus;Argyropelecus aculeatus', 2],
  ['Metazoa;Chordata;Actinopteri;Scombriformes;Scombridae;Thunnus;Thunnus albacares', 1],
  ['Metazoa;Chordata;Actinopteri;Scombriformes;Scombridae;Thunnus;Thunnus obesus', 1],
  ['Metazoa;Chordata;Thaliacea;Salpida;Salpidae;Salpa;Salpa fusiformis', 3],
  ['Metazoa;Chordata;Appendicularia;Copelata;Oikopleuridae;Oikopleura;Oikopleura dioica', 4],
  ['Metazoa;Chordata;Mammalia;Primates;Hominidae;Homo;Homo sapiens', 0.4],
  ['Metazoa;Chordata;Mammalia;Artiodactyla;Bovidae;Bos;Bos taurus', 0.15],
  ['Metazoa;Annelida;Polychaeta;Phyllodocida;Tomopteridae;Tomopteris;Tomopteris helgolandica', 2],
  ['Metazoa;Chaetognatha;Sagittoidea;Aphragmophora;Sagittidae;Flaccisagitta;Flaccisagitta enflata', 5],
  ['Metazoa;Ctenophora;Tentaculata;Lobata;Bolinopsidae;Bolinopsis;Bolinopsis infundibulum', 1],
  ['Metazoa;Echinodermata;Holothuroidea;Elasipodida;Elpidiidae;Peniagone;Peniagone diaphana', 1],
  ['Metazoa;Porifera;Hexactinellida;Lyssacinosida;Euplectellidae;Euplectella;Euplectella aspergillum', 0.5],
  ['Chromista;Myzozoa;Dinophyceae;Gymnodiniales;Gymnodiniaceae;Gymnodinium;Gymnodinium catenatum', 3],
  ['Chromista;Ochrophyta;Bacillariophyceae;Naviculales;Naviculaceae;Navicula;Navicula directa', 2],
  ['Plantae;Rhodophyta;Florideophyceae;Corallinales;Corallinaceae;Corallina;Corallina officinalis', 0.5],
];

const CONTAMINANTS = new Set(['Homo sapiens', 'Bos taurus']);

const BASE_METHODS: ReportMethods = {
  marker: 'COI (mitochondrial cytochrome c oxidase I), ~313 bp',
  primers: 'mlCOIintF / jgHCO2198',
  referenceDb: 'MIDORI2-style COI reference (demo stand-in)',
  classifier: 'Naive Bayes classifier, 100 bootstraps (demo)',
  pipelineVersion: 'edna-pipeline 0.0.0-demo',
  ranks: RANKS,
  supportCutoff: 0.7,
  confidenceBands: { high: 0.9, moderate: 0.8 },
  divergenceBands: { lowMinIdentity: 97, mediumMinIdentity: 90 },
  identityThresholds: {
    Domain: 70, Kingdom: 74, Phylum: 78, Class: 82, Order: 86, Family: 90, Genus: 94, Species: 97,
  },
  minReadsDefault: 10,
};

// Identity range for the best hit, by deepest supported rank index (-1 = nothing supported).
const IDENTITY_RANGE: Record<number, [number, number]> = {
  [-1]: [62, 72], 0: [70, 77], 1: [74, 80], 2: [78, 85], 3: [82, 88],
  4: [86, 91], 5: [90, 94], 6: [94, 97.4], 7: [97.5, 100],
};

// Probability of each deepest supported rank, for non-contaminant ASVs.
const DEPTH_DIST: [number, number][] = [
  [7, 0.15], [6, 0.2], [5, 0.17], [4, 0.12], [3, 0.15], [2, 0.09], [1, 0.04], [0, 0.02], [-1, 0.06],
];

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DEMOS = {
  water: { library: WATER_LIBRARY, demo: WATER_SAMPLE },
  soil: { library: SOIL_LIBRARY, demo: SOIL_SAMPLE },
  sediment: { library: SEDIMENT_LIBRARY, demo: SEDIMENT_SAMPLE },
};

export function buildMockReport(type: SampleType = 'water'): Report {
  const { library: LIBRARY, demo } = DEMOS[type];
  const METHODS: ReportMethods = { ...BASE_METHODS, ...demo.methods };
  const { asvCount, seed } = demo;
  const rng = mulberry32(seed);
  const between = (a: number, b: number) => a + rng() * (b - a);
  const normal = () => Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng());
  const round = (x: number, dp: number) => Math.round(x * 10 ** dp) / 10 ** dp;

  const lineages = LIBRARY.map(([l]) => {
    const parts = l.split(';');
    return parts.length === RANKS.length ? parts : ['Eukaryota', ...parts];
  });
  const totalWeight = LIBRARY.reduce((s, [, w]) => s + w, 0);
  const pickLineage = () => {
    let r = rng() * totalWeight;
    for (let i = 0; i < LIBRARY.length; i++) {
      r -= LIBRARY[i][1];
      if (r <= 0) return lineages[i];
    }
    return lineages[lineages.length - 1];
  };
  const pickDepth = () => {
    let r = rng();
    for (const [d, p] of DEPTH_DIST) {
      r -= p;
      if (r <= 0) return d;
    }
    return 7;
  };
  const sharesPrefix = (a: string[], b: string[], through: number) => {
    for (let k = 0; k <= through; k++) if (a[k] !== b[k]) return false;
    return true;
  };
  const accession = (lineage: string[], variant: number) => {
    const idx = lineages.indexOf(lineage);
    return `MOCK${String(idx * 1000 + variant).padStart(6, '0')}`;
  };

  const raw: Omit<Asv, 'id'>[] = [];
  for (let i = 0; i < asvCount; i++) {
    const L = pickLineage();
    const species = L[7];
    const contaminant = CONTAMINANTS.has(species);
    const d = contaminant ? 7 : pickDepth();
    const ambiguous = !contaminant && (d === 5 || d === 6) && rng() < 0.35 &&
      lineages.some((o) => o !== L && sharesPrefix(o, L, d));

    // Best-hit identity
    const [lo, hi] = ambiguous ? [97, 99.5] : IDENTITY_RANGE[d];
    const bestId = round(between(lo, hi), 1);

    // Per-rank confidence
    const bandRoll = rng();
    const target = ambiguous
      ? (bandRoll < 0.5 ? between(0.8, 0.9) : between(0.7, 0.8))
      : (bandRoll < 0.55 ? between(0.9, 1) : bandRoll < 0.85 ? between(0.8, 0.9) : between(0.7, 0.8));
    const calls: RankCall[] = RANKS.map((rank, k) => ({ rank, name: L[k], confidence: 0 }));
    for (let k = 0; k <= d; k++) {
      const frac = ((k + 1) / (d + 1)) ** 2;
      calls[k].confidence = round(Math.max(target, 1 - (1 - target) * frac), 2);
    }
    let c = between(0.35, 0.69);
    for (let k = d + 1; k < RANKS.length; k++) {
      calls[k].confidence = round(c, 2);
      c *= between(0.5, 0.85);
    }

    // Reference hits: drawn from records sharing the supported part of the lineage.
    const pool = d >= 0 ? lineages.filter((o) => sharesPrefix(o, L, d)) : lineages;
    const nHits = 5 + Math.floor(rng() * 4);
    const hits: ReferenceHit[] = [];
    let id = bestId;
    for (let j = 0; j < nHits; j++) {
      let hitLineage: string[];
      if (d === 7 && j < 3) hitLineage = L;
      else if (ambiguous && j < 3) {
        const others = pool.filter((o) => o !== L);
        hitLineage = j === 0 ? L : others[(j - 1) % others.length];
      } else hitLineage = pool[Math.floor(rng() * pool.length)];
      hits.push({
        accession: accession(hitLineage, Math.floor(rng() * 999)),
        taxon: hitLineage[7],
        lineage: hitLineage,
        identity: round(id, 1),
        coverage: round(between(92, 100), 0),
      });
      id -= ambiguous && j < 2 ? between(0, 0.3) : between(0.1, 1.2);
    }

    // Reasons for stopping above species (structured, as the pipeline would return them).
    const reasons: Reason[] = [];
    if (d === -1) {
      reasons.push({
        code: 'NO_DOMAIN_SUPPORT',
        detail: `Confidence at Domain is ${calls[0].confidence.toFixed(2)}, below the ${METHODS.supportCutoff.toFixed(2)} cut-off. Best match is only ${bestId}% identity.`,
      });
    } else if (d < 7) {
      const next = RANKS[d + 1];
      const need = METHODS.identityThresholds[next];
      if (bestId < need) {
        reasons.push({
          code: 'LOW_IDENTITY',
          detail: `Best reference match is ${bestId}% identity; assignment at ${next} typically needs ≥ ${need}%.`,
        });
      }
      const near = hits.filter((h) => h.identity >= bestId - 1);
      const names = [...new Set(near.map((h) => h.lineage[d + 1]))];
      if (names.length > 1) {
        reasons.push({
          code: 'SPLIT_HITS',
          detail: `Top hits within 1% identity disagree at ${next}: ${names.join(', ')}.`,
        });
      }
      reasons.push({
        code: 'BELOW_CONFIDENCE',
        detail: `Classifier confidence at ${next} is ${calls[d + 1].confidence.toFixed(2)}, below the ${METHODS.supportCutoff.toFixed(2)} cut-off.`,
      });
    }

    const reads = contaminant
      ? Math.max(2, Math.round(Math.exp(2 + normal() * 1.2)))
      : Math.max(2, Math.round(Math.exp(3.2 + normal() * 1.7)));

    const flags: FlagCode[] = [];
    if (contaminant) flags.push('LIKELY_CONTAMINANT');
    if (d === 7 && demo.negControlSpecies.includes(species)) flags.push('IN_NEGATIVE_CONTROL');
    if (reads < METHODS.minReadsDefault) flags.push('LOW_READS');

    const len = 313 + (rng() < 0.1 ? Math.round(normal() * 3) : 0);
    let sequence = '';
    for (let k = 0; k < len; k++) sequence += 'ACGT'[Math.floor(rng() * 4)];

    raw.push({ sequence, reads, calls, topHits: hits, reasons, flags });
  }

  // ASVs are conventionally numbered by abundance.
  raw.sort((a, b) => b.reads - a.reads);
  const asvs: Asv[] = raw.map((a, i) => ({ id: `ASV_${String(i + 1).padStart(4, '0')}`, ...a }));
  const assigned = asvs.reduce((s, a) => s + a.reads, 0);

  return {
    isDemoData: true,
    generatedAt: demo.generatedAt,
    sample: demo.sample,
    methods: METHODS,
    qc: [
      { label: 'Raw read pairs', reads: Math.round(assigned / 0.58) },
      { label: 'After primer trimming', reads: Math.round(assigned / 0.66) },
      { label: 'After quality filtering', reads: Math.round(assigned / 0.78) },
      { label: 'After merging + denoising', reads: Math.round(assigned / 0.93) },
      { label: 'After chimera removal (in ASVs)', reads: assigned },
    ],
    controls: demo.controls,
    asvs,
  };
}
