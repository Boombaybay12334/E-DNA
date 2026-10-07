// DEMO-only sample definitions for each sample type: reference libraries, methods overrides and sample metadata.
// Synthetic. Taxa are plausible for each environment; nothing here is an observation.
// Entries with 7 parts are Eukaryota (the Domain is prepended by the builder); 8-part entries carry their own Domain.

import type { ControlHit, MetaField, ReportMethods, SampleContext } from '../types';

export const SOIL_LIBRARY: [string, number][] = [
  // Fungi
  ['Fungi;Basidiomycota;Agaricomycetes;Agaricales;Russulaceae;Russula;Russula emetica', 6],
  ['Fungi;Basidiomycota;Agaricomycetes;Boletales;Boletaceae;Boletus;Boletus edulis', 3],
  ['Fungi;Basidiomycota;Agaricomycetes;Agaricales;Hygrophoraceae;Hygrocybe;Hygrocybe conica', 3],
  ['Fungi;Basidiomycota;Agaricomycetes;Cantharellales;Cantharellaceae;Cantharellus;Cantharellus cibarius', 2],
  ['Fungi;Basidiomycota;Agaricomycetes;Agaricales;Amanitaceae;Amanita;Amanita muscaria', 2],
  ['Fungi;Ascomycota;Sordariomycetes;Hypocreales;Nectriaceae;Fusarium;Fusarium oxysporum', 6],
  ['Fungi;Ascomycota;Sordariomycetes;Hypocreales;Hypocreaceae;Trichoderma;Trichoderma harzianum', 5],
  ['Fungi;Ascomycota;Eurotiomycetes;Eurotiales;Aspergillaceae;Penicillium;Penicillium chrysogenum', 5],
  ['Fungi;Ascomycota;Eurotiomycetes;Eurotiales;Aspergillaceae;Aspergillus;Aspergillus niger', 4],
  ['Fungi;Ascomycota;Dothideomycetes;Pleosporales;Pleosporaceae;Alternaria;Alternaria alternata', 3],
  ['Fungi;Mucoromycota;Mucoromycetes;Mucorales;Mucoraceae;Mucor;Mucor hiemalis', 3],
  ['Fungi;Mortierellomycota;Mortierellomycetes;Mortierellales;Mortierellaceae;Mortierella;Mortierella alpina', 5],
  ['Fungi;Glomeromycota;Glomeromycetes;Glomerales;Glomeraceae;Rhizophagus;Rhizophagus irregularis', 3],
  // Bacteria and Archaea
  ['Bacteria;Bacteria;Actinomycetota;Actinomycetes;Streptomycetales;Streptomycetaceae;Streptomyces;Streptomyces griseus', 6],
  ['Bacteria;Bacteria;Actinomycetota;Actinomycetes;Mycobacteriales;Mycobacteriaceae;Mycobacterium;Mycobacterium smegmatis', 2],
  ['Bacteria;Bacteria;Bacillota;Bacilli;Bacillales;Bacillaceae;Bacillus;Bacillus subtilis', 6],
  ['Bacteria;Bacteria;Pseudomonadota;Gammaproteobacteria;Pseudomonadales;Pseudomonadaceae;Pseudomonas;Pseudomonas fluorescens', 6],
  ['Bacteria;Bacteria;Pseudomonadota;Alphaproteobacteria;Hyphomicrobiales;Bradyrhizobiaceae;Bradyrhizobium;Bradyrhizobium japonicum', 4],
  ['Bacteria;Bacteria;Pseudomonadota;Alphaproteobacteria;Hyphomicrobiales;Rhizobiaceae;Rhizobium;Rhizobium leguminosarum', 3],
  ['Bacteria;Bacteria;Pseudomonadota;Betaproteobacteria;Burkholderiales;Burkholderiaceae;Burkholderia;Burkholderia cepacia', 2],
  ['Bacteria;Bacteria;Acidobacteriota;Terriglobia;Terriglobales;Acidobacteriaceae;Granulicella;Granulicella paludicola', 3],
  ['Bacteria;Bacteria;Verrucomicrobiota;Verrucomicrobiia;Chthoniobacterales;Chthoniobacteraceae;Candidatus Udaeobacter;Candidatus Udaeobacter copiosus', 3],
  ['Bacteria;Bacteria;Myxococcota;Myxococcia;Myxococcales;Myxococcaceae;Myxococcus;Myxococcus xanthus', 2],
  ['Bacteria;Bacteria;Cyanobacteriota;Cyanophyceae;Nostocales;Nostocaceae;Nostoc;Nostoc commune', 1.5],
  ['Archaea;Archaea;Thermoproteota;Nitrososphaeria;Nitrososphaerales;Nitrososphaeraceae;Nitrososphaera;Nitrososphaera viennensis', 2],
  // Plants and green algae
  ['Plantae;Streptophyta;Magnoliopsida;Poales;Poaceae;Festuca;Festuca rubra', 4],
  ['Plantae;Streptophyta;Magnoliopsida;Poales;Poaceae;Lolium;Lolium perenne', 3],
  ['Plantae;Streptophyta;Magnoliopsida;Fabales;Fabaceae;Trifolium;Trifolium repens', 3],
  ['Plantae;Streptophyta;Magnoliopsida;Asterales;Asteraceae;Taraxacum;Taraxacum officinale', 2],
  ['Plantae;Streptophyta;Magnoliopsida;Fagales;Fagaceae;Quercus;Quercus robur', 2],
  ['Plantae;Streptophyta;Magnoliopsida;Rosales;Rosaceae;Rubus;Rubus fruticosus', 1.5],
  ['Plantae;Streptophyta;Pinopsida;Pinales;Pinaceae;Pinus;Pinus sylvestris', 2],
  ['Plantae;Bryophyta;Bryopsida;Hypnales;Hylocomiaceae;Pleurozium;Pleurozium schreberi', 1],
  ['Plantae;Chlorophyta;Trebouxiophyceae;Chlorellales;Chlorellaceae;Chlorella;Chlorella vulgaris', 2],
  // Animals
  ['Metazoa;Nematoda;Chromadorea;Rhabditida;Rhabditidae;Caenorhabditis;Caenorhabditis elegans', 4],
  ['Metazoa;Nematoda;Chromadorea;Tylenchida;Pratylenchidae;Pratylenchus;Pratylenchus penetrans', 3],
  ['Metazoa;Annelida;Clitellata;Haplotaxida;Lumbricidae;Lumbricus;Lumbricus terrestris', 2],
  ['Metazoa;Annelida;Clitellata;Haplotaxida;Lumbricidae;Aporrectodea;Aporrectodea caliginosa', 2],
  ['Metazoa;Annelida;Clitellata;Enchytraeida;Enchytraeidae;Enchytraeus;Enchytraeus albidus', 2],
  ['Metazoa;Arthropoda;Collembola;Entomobryomorpha;Isotomidae;Folsomia;Folsomia candida', 3],
  ['Metazoa;Arthropoda;Arachnida;Sarcoptiformes;Oribatulidae;Oribatula;Oribatula tibialis', 2],
  ['Metazoa;Arthropoda;Insecta;Coleoptera;Carabidae;Pterostichus;Pterostichus melanarius', 1],
  ['Metazoa;Arthropoda;Insecta;Hymenoptera;Formicidae;Lasius;Lasius niger', 1],
  ['Metazoa;Tardigrada;Eutardigrada;Parachela;Macrobiotidae;Macrobiotus;Macrobiotus hufelandi', 1],
  // Protists
  ['Chromista;Oomycota;Oomycetes;Peronosporales;Pythiaceae;Pythium;Pythium ultimum', 3],
  ['Chromista;Oomycota;Oomycetes;Peronosporales;Peronosporaceae;Phytophthora;Phytophthora cinnamomi', 1.5],
  ['Chromista;Ochrophyta;Bacillariophyceae;Bacillariales;Bacillariaceae;Nitzschia;Nitzschia palea', 2],
  ['Chromista;Cercozoa;Imbricatea;Euglyphida;Euglyphidae;Euglypha;Euglypha rotunda', 1.5],
  ['Protozoa;Amoebozoa;Discosea;Acanthamoebida;Acanthamoebidae;Acanthamoeba;Acanthamoeba castellanii', 2],
  ['Protozoa;Ciliophora;Colpodea;Colpodida;Colpodidae;Colpoda;Colpoda steinii', 2],
  // Likely handling/lab contaminants
  ['Metazoa;Chordata;Mammalia;Primates;Hominidae;Homo;Homo sapiens', 0.4],
  ['Metazoa;Chordata;Mammalia;Artiodactyla;Bovidae;Bos;Bos taurus', 0.15],
];

export const SEDIMENT_LIBRARY: [string, number][] = [
  ['Metazoa;Annelida;Polychaeta;Phyllodocida;Nereididae;Hediste;Hediste diversicolor', 6],
  ['Metazoa;Annelida;Polychaeta;Spionida;Spionidae;Pygospio;Pygospio elegans', 4],
  ['Metazoa;Annelida;Polychaeta;Capitellida;Capitellidae;Capitella;Capitella capitata', 4],
  ['Metazoa;Mollusca;Bivalvia;Cardiida;Tellinidae;Macoma;Macoma balthica', 4],
  ['Metazoa;Mollusca;Bivalvia;Mytilida;Mytilidae;Mytilus;Mytilus edulis', 3],
  ['Metazoa;Mollusca;Gastropoda;Littorinimorpha;Hydrobiidae;Peringia;Peringia ulvae', 3],
  ['Metazoa;Arthropoda;Malacostraca;Amphipoda;Corophiidae;Corophium;Corophium volutator', 4],
  ['Metazoa;Arthropoda;Hexanauplia;Harpacticoida;Tachidiidae;Tachidius;Tachidius discipes', 3],
  ['Metazoa;Nematoda;Chromadorea;Chromadorida;Chromadoridae;Chromadora;Chromadora nudicapitata', 5],
  ['Metazoa;Nematoda;Enoplea;Enoplida;Oncholaimidae;Oncholaimus;Oncholaimus oxyuris', 3],
  ['Metazoa;Echinodermata;Ophiuroidea;Amphilepidida;Amphiuridae;Amphiura;Amphiura filiformis', 2],
  ['Metazoa;Cnidaria;Anthozoa;Actiniaria;Edwardsiidae;Nematostella;Nematostella vectensis', 1.5],
  ['Chromista;Ochrophyta;Bacillariophyceae;Naviculales;Naviculaceae;Navicula;Navicula directa', 3],
  ['Chromista;Ochrophyta;Bacillariophyceae;Thalassiosirales;Skeletonemataceae;Skeletonema;Skeletonema costatum', 3],
  ['Protozoa;Foraminifera;Globothalamea;Rotaliida;Ammoniidae;Ammonia;Ammonia tepida', 4],
  ['Plantae;Chlorophyta;Ulvophyceae;Ulvales;Ulvaceae;Ulva;Ulva lactuca', 1.5],
  ['Plantae;Streptophyta;Magnoliopsida;Alismatales;Zosteraceae;Zostera;Zostera marina', 1.5],
  ['Metazoa;Chordata;Mammalia;Primates;Hominidae;Homo;Homo sapiens', 0.4],
  ['Metazoa;Chordata;Mammalia;Artiodactyla;Bovidae;Bos;Bos taurus', 0.15],
];

export interface DemoSample {
  asvCount: number;
  seed: number;
  methods: Partial<ReportMethods>;
  /** Species that, when resolved, are also flagged as seen in a negative control. */
  negControlSpecies: string[];
  generatedAt: string;
  sample: SampleContext;
  controls: ControlHit[];
}

const f = (label: string, value: string, mono = false): MetaField => ({ label, value, ...(mono ? { mono } : {}) });

export const WATER_SAMPLE: DemoSample = {
  asvCount: 4812,
  seed: 20260312,
  methods: {},
  negControlSpecies: ['Homo sapiens', 'Bos taurus', 'Oikopleura dioica'],
  generatedAt: '2026-10-06T09:30:00Z',
  sample: {
    sampleId: 'DEMO-AS-014',
    project: 'Demo: Arabian Sea mesopelagic–bathypelagic transect',
    sampleType: 'water',
    latitude: 15.42,
    longitude: 68.1,
    locality: 'Arabian Sea, off-shelf',
    collectedAt: '2026-03-12T04:20:00Z',
    details: [
      f('Water body', 'Arabian Sea, open ocean'),
      f('Water depth', '1,850 m · Bathypelagic'),
      f('Habitat', 'Open ocean water column; oxygen minimum zone below'),
      f('Collection', 'Seawater (Niskin bottle), 5 L filtered, 0.22 µm Sterivex'),
    ],
    parameters: [f('Temperature', '3.4 °C', true), f('pH', '7.9', true)],
  },
  controls: [
    { control: 'Extraction blank', taxon: 'Homo sapiens', reads: 412 },
    { control: 'PCR blank', taxon: 'Bos taurus', reads: 38 },
    { control: 'Field blank', taxon: 'Oikopleura dioica', reads: 12 },
  ],
};

export const SOIL_SAMPLE: DemoSample = {
  asvCount: 4120,
  seed: 20260518,
  methods: {
    marker: '16S rRNA V4 (prokaryotes) + 18S rRNA V4 (eukaryotes), combined demo run',
    primers: '515F / 806R and TAReuk454FWD1 / TAReukREV3 (demo)',
    referenceDb: 'SILVA + PR2 + UNITE (demo stand-in)',
  },
  negControlSpecies: ['Homo sapiens', 'Bos taurus', 'Pseudomonas fluorescens'],
  generatedAt: '2026-10-06T10:05:00Z',
  sample: {
    sampleId: 'DEMO-SL-207',
    project: 'Demo: Post-mining restoration monitoring',
    sampleType: 'soil',
    latitude: 51.38,
    longitude: 14.62,
    locality: 'Former open-cast lignite mine, Lusatia',
    collectedAt: '2026-05-18T08:40:00Z',
    details: [
      f('Site', 'Plot R-07, northern spoil heap'),
      f('Sampling zone', 'Restoration zone (re-vegetated 2019)'),
      f('Habitat / land use', 'Post-mining land; seeded grassland with pioneer trees'),
      f('Soil depth', '0–10 cm · topsoil'),
      f('Collection', 'Composite of 5 cores, 0.25 g extracted, frozen on site'),
    ],
    parameters: [
      f('Soil pH', '5.8', true), f('Moisture', '14 %', true), f('Soil temperature', '11.3 °C', true),
      f('Organic matter', '3.2 %', true),
    ],
  },
  controls: [
    { control: 'Extraction blank', taxon: 'Homo sapiens', reads: 233 },
    { control: 'PCR blank', taxon: 'Bos taurus', reads: 21 },
    { control: 'Field blank', taxon: 'Pseudomonas fluorescens', reads: 9 },
  ],
};

export const SEDIMENT_SAMPLE: DemoSample = {
  asvCount: 3560,
  seed: 20260702,
  methods: {
    marker: '18S rRNA V9 (eukaryotes)',
    primers: '1389F / 1510R (demo)',
    referenceDb: 'PR2 + SILVA (demo stand-in)',
  },
  negControlSpecies: ['Homo sapiens', 'Bos taurus'],
  generatedAt: '2026-10-06T10:20:00Z',
  sample: {
    sampleId: 'DEMO-SD-031',
    project: 'Demo: Estuarine harbour dredging baseline',
    sampleType: 'sediment',
    latitude: 53.55,
    longitude: 9.97,
    locality: 'Inner harbour, tidal estuary',
    collectedAt: '2026-06-24T07:15:00Z',
    details: [
      f('Site', 'Station H-03, inner harbour'),
      f('Water body', 'Tidal estuary'),
      f('Water depth', '6.5 m'),
      f('Sediment depth', '0–2 cm · surface layer'),
      f('Habitat / land use', 'Subtidal mud beside industrial quay'),
      f('Collection', 'Van Veen grab, subsampled with sterile corer, frozen on board'),
    ],
    parameters: [f('Salinity', '18.2 PSU', true), f('Temperature', '9.8 °C', true), f('Grain size', 'Silty mud')],
  },
  controls: [
    { control: 'Extraction blank', taxon: 'Homo sapiens', reads: 188 },
    { control: 'PCR blank', taxon: 'Bos taurus', reads: 17 },
  ],
};
