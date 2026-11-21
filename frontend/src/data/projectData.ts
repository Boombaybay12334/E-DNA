import type { ProjectRecord, SampleRecord, PipelineJob } from '../types';

export const INITIAL_PROJECTS: ProjectRecord[] = [
  {
    id: 'PRJ-GOA-01',
    name: 'Mormugao Port Coastal Biodiversity Baseline',
    organization: 'Goa Coastal Ecology & Port Authority Consortium',
    location: 'Mormugao Bay & Harbor, Goa',
    domain: 'aquatic',
    subtype: 'marine',
    objective: 'Pre-dredging marine ecological baseline, coral patch assessment, and invasive ballast-water taxa surveillance under CPCB/CRZ regulations.',
    samplingDate: '2026-09-14',
    status: 'active',
    sampleIds: ['SMP-GOA-01', 'SMP-GOA-02', 'SMP-GOA-03'],
    keyObservation: '2 IUCN Vulnerable taxa detected; 1 potential invasive dinoflagellate requiring biosecurity review.',
    complianceStandard: 'MoEFCC EIA 2006 / CRZ Notification 2019 / CPCB Class SW-II',
  },
  {
    id: 'PRJ-KRW-02',
    name: 'Karwar Harbor & Netrani Marine Ecosystem Survey',
    organization: 'Karnataka Marine Conservation & Coastal Zone Management',
    location: 'Karwar Coastline & Netrani Waters, Coastal Karnataka',
    domain: 'aquatic',
    subtype: 'marine',
    objective: 'Longitudinal monitoring of demersal fish diversity and rocky reef fauna adjacent to naval infrastructure and commercial shipping lanes.',
    samplingDate: '2026-08-20',
    status: 'completed',
    sampleIds: ['SMP-KRW-01', 'SMP-KRW-02'],
    keyObservation: 'High teleost richness (84 species) with stable trophic evenness (J′ = 0.81). Negative controls verified clear.',
    complianceStandard: 'IFC Performance Standard 6 (Biodiversity Conservation)',
  },
  {
    id: 'PRJ-ZRI-03',
    name: 'Zuari River Estuary Mangrove Biomonitoring',
    organization: 'Western Ghats Ecology & Mangrove Society',
    location: 'Zuari River Basin & Chicalim Swamp, Goa',
    domain: 'aquatic',
    subtype: 'estuarine',
    objective: 'Assessment of benthic infauna and mangrove-associated fish assemblages across tidal salinity gradients.',
    samplingDate: '2026-10-04',
    status: 'active',
    sampleIds: ['SMP-ZRI-01', 'SMP-ZRI-02'],
    keyObservation: 'Polychaete indicator species reflect moderate seasonal salinity dilution; 0 toxic benthic blooms.',
    complianceStandard: 'State Biodiversity Strategy & Action Plan (SBSAP)',
  },
  {
    id: 'PRJ-WGH-04',
    name: 'North Goa Iron Ore Overburden Soil Reclamation',
    organization: 'Mining Rehabilitation Research Cell & Envisage Ecology Ltd.',
    location: 'Bicholim Mining Lease Area, North Goa',
    domain: 'terrestrial',
    subtype: 'mine_reclamation',
    objective: 'Assessment of arbuscular mycorrhizal fungal (AMF) re-establishment and pioneer bacterial communities in revegetated spoil dumps.',
    samplingDate: '2026-05-18',
    status: 'active',
    sampleIds: ['SMP-SL-01', 'SMP-SL-02'],
    keyObservation: 'Rhizophagus irregularis and Streptomyces active in topsoil (0-10 cm), confirming soil biological reactivation.',
    complianceStandard: 'Indian Bureau of Mines (IBM) Environmental Management Plan',
  },
  {
    id: 'PRJ-ARB-05',
    name: 'Arabian Sea Bathypelagic eDNA Transect',
    organization: 'National Oceanographic Research Institute',
    location: 'Off-shelf Arabian Sea (Lat 15.42° N, Long 68.10° E)',
    domain: 'aquatic',
    subtype: 'deep_sea',
    objective: 'Investigation of mesopelagic-bathypelagic nekton biomass and vertical migration patterns across oxygen minimum layers.',
    samplingDate: '2026-03-12',
    status: 'completed',
    sampleIds: ['DEMO-AS-014'],
    keyObservation: 'Confirmed detection of Lophelia reef builders and lanternfish scattering layers; zero negative control bleed.',
    complianceStandard: 'UN Decade of Ocean Science / CBD Post-2020 Target 3',
  },
];

export const INITIAL_SAMPLES: SampleRecord[] = [
  {
    id: 'SMP-GOA-01',
    projectId: 'PRJ-GOA-01',
    projectName: 'Mormugao Port Coastal Biodiversity Baseline',
    locality: 'Mormugao Outer Bay (Station MB-01)',
    latitude: 15.4124,
    longitude: 73.7915,
    sampleType: 'water',
    domain: 'aquatic',
    collectionDate: '2026-09-14',
    depth: '14.5 m (Subsurface)',
    qcStatus: 'passed',
    readCount: 148200,
    asvCount: 3820,
    identifiedSpecies: 72,
    shannonIndex: 3.18,
    pipelineJobId: 'JOB-2026-0914-01',
    parameters: { Temperature: '27.8 °C', Salinity: '34.2 PSU', DissolvedOxygen: '5.8 mg/L', pH: '8.1' },
  },
  {
    id: 'SMP-GOA-02',
    projectId: 'PRJ-GOA-01',
    projectName: 'Mormugao Port Coastal Biodiversity Baseline',
    locality: 'Navigation Channel Benthic Silt (Station MB-02)',
    latitude: 15.4056,
    longitude: 73.7842,
    sampleType: 'sediment',
    domain: 'aquatic',
    collectionDate: '2026-09-14',
    depth: '18.2 m (Seabed)',
    qcStatus: 'passed',
    readCount: 122400,
    asvCount: 3560,
    identifiedSpecies: 58,
    shannonIndex: 2.94,
    pipelineJobId: 'JOB-2026-0914-02',
    parameters: { Temperature: '26.4 °C', GrainSize: 'Fine Silty Clay', OrganicMatter: '4.2 %' },
  },
  {
    id: 'SMP-GOA-03',
    projectId: 'PRJ-GOA-01',
    projectName: 'Mormugao Port Coastal Biodiversity Baseline',
    locality: 'Chicalim Bay Estuarine Mouth (Station MB-03)',
    latitude: 15.3988,
    longitude: 73.8122,
    sampleType: 'water',
    domain: 'aquatic',
    collectionDate: '2026-09-15',
    depth: '4.2 m',
    qcStatus: 'review',
    readCount: 96500,
    asvCount: 2940,
    identifiedSpecies: 49,
    shannonIndex: 2.72,
    pipelineJobId: 'JOB-2026-0915-01',
    parameters: { Temperature: '28.9 °C', Salinity: '28.4 PSU', Turbidity: '18.6 NTU' },
  },
  {
    id: 'SMP-KRW-01',
    projectId: 'PRJ-KRW-02',
    projectName: 'Karwar Harbor & Netrani Marine Ecosystem Survey',
    locality: 'Netrani Island Coral Ridge (Station NI-01)',
    latitude: 14.0189,
    longitude: 74.3283,
    sampleType: 'water',
    domain: 'aquatic',
    collectionDate: '2026-08-20',
    depth: '12.0 m',
    qcStatus: 'passed',
    readCount: 184500,
    asvCount: 4410,
    identifiedSpecies: 84,
    shannonIndex: 3.42,
    pipelineJobId: 'JOB-2026-0820-01',
    parameters: { Temperature: '28.1 °C', Salinity: '35.1 PSU', SecchiDepth: '14.0 m' },
  },
  {
    id: 'SMP-KRW-02',
    projectId: 'PRJ-KRW-02',
    projectName: 'Karwar Harbor & Netrani Marine Ecosystem Survey',
    locality: 'Kali Estuary Mixing Plume (Station KE-02)',
    latitude: 14.8421,
    longitude: 74.1205,
    sampleType: 'sediment',
    domain: 'aquatic',
    collectionDate: '2026-08-21',
    depth: '6.5 m',
    qcStatus: 'passed',
    readCount: 115200,
    asvCount: 3120,
    identifiedSpecies: 53,
    shannonIndex: 2.86,
    pipelineJobId: 'JOB-2026-0821-01',
    parameters: { Temperature: '27.5 °C', Salinity: '21.0 PSU' },
  },
  {
    id: 'SMP-ZRI-01',
    projectId: 'PRJ-ZRI-03',
    projectName: 'Zuari River Estuary Mangrove Biomonitoring',
    locality: 'Corticor Mangrove Creek (Station ZC-01)',
    latitude: 15.3421,
    longitude: 73.9125,
    sampleType: 'water',
    domain: 'aquatic',
    collectionDate: '2026-10-04',
    depth: '2.5 m (Mid-depth)',
    qcStatus: 'passed',
    readCount: 138000,
    asvCount: 3450,
    identifiedSpecies: 61,
    shannonIndex: 3.05,
    pipelineJobId: 'JOB-2026-1004-01',
    parameters: { Temperature: '29.2 °C', Salinity: '19.5 PSU', pH: '7.8' },
  },
  {
    id: 'SMP-ZRI-02',
    projectId: 'PRJ-ZRI-03',
    projectName: 'Zuari River Estuary Mangrove Biomonitoring',
    locality: 'Corticor Mangrove Sediment (Station ZC-02)',
    latitude: 15.3425,
    longitude: 73.9130,
    sampleType: 'sediment',
    domain: 'aquatic',
    collectionDate: '2026-10-04',
    depth: 'Intertidal Mudflat',
    qcStatus: 'passed',
    readCount: 104200,
    asvCount: 3210,
    identifiedSpecies: 48,
    shannonIndex: 2.68,
    pipelineJobId: 'JOB-2026-1004-02',
    parameters: { SoilMoisture: '42 %', OrganicCarbon: '3.8 %' },
  },
  {
    id: 'SMP-SL-01',
    projectId: 'PRJ-WGH-04',
    projectName: 'North Goa Iron Ore Overburden Soil Reclamation',
    locality: 'Bicholim Spoil Heap Plot R-04 (Topsoil 0-10cm)',
    latitude: 15.5892,
    longitude: 73.9451,
    sampleType: 'soil',
    domain: 'terrestrial',
    collectionDate: '2026-05-18',
    depth: '0-10 cm Topsoil',
    qcStatus: 'passed',
    readCount: 162000,
    asvCount: 4120,
    identifiedSpecies: 67,
    shannonIndex: 3.25,
    pipelineJobId: 'JOB-2026-0518-01',
    parameters: { SoilPH: '5.8', Moisture: '14 %', OrganicMatter: '3.2 %', SoilTemp: '24.5 °C' },
  },
  {
    id: 'SMP-SL-02',
    projectId: 'PRJ-WGH-04',
    projectName: 'North Goa Iron Ore Overburden Soil Reclamation',
    locality: 'Adjacent Native Semievergreen Forest (Reference Plot F-01)',
    latitude: 15.5921,
    longitude: 73.9512,
    sampleType: 'soil',
    domain: 'terrestrial',
    collectionDate: '2026-05-19',
    depth: '0-10 cm Topsoil',
    qcStatus: 'passed',
    readCount: 178000,
    asvCount: 4680,
    identifiedSpecies: 89,
    shannonIndex: 3.65,
    pipelineJobId: 'JOB-2026-0519-01',
    parameters: { SoilPH: '6.4', Moisture: '22 %', OrganicMatter: '6.8 %', SoilTemp: '22.8 °C' },
  },
  {
    id: 'DEMO-AS-014',
    projectId: 'PRJ-ARB-05',
    projectName: 'Arabian Sea Bathypelagic eDNA Transect',
    locality: 'Arabian Sea Offshore Bathypelagic (Station AS-014)',
    latitude: 15.4200,
    longitude: 68.1000,
    sampleType: 'water',
    domain: 'aquatic',
    collectionDate: '2026-03-12',
    depth: '1,850 m (Bathypelagic)',
    qcStatus: 'passed',
    readCount: 198400,
    asvCount: 4812,
    identifiedSpecies: 94,
    shannonIndex: 3.51,
    pipelineJobId: 'JOB-2026-0312-01',
    parameters: { WaterDepth: '1,850 m', Temperature: '3.4 °C', pH: '7.9' },
  },
];

export const INITIAL_PIPELINE_JOBS: PipelineJob[] = [
  {
    id: 'JOB-2026-0914-01',
    sampleId: 'SMP-GOA-01',
    sampleName: 'Mormugao Outer Bay (Station MB-01)',
    projectId: 'PRJ-GOA-01',
    marker: 'COI (cytochrome c oxidase I), ~313 bp',
    referenceDb: 'MIDORI2 + WoRMS Taxonomy',
    readsInput: 156400,
    readsRetained: 148200,
    asvsInferred: 3820,
    startedAt: '2026-09-14T11:20:00Z',
    completedAt: '2026-09-14T11:42:15Z',
    status: 'completed',
    currentStage: 5,
    stages: [
      { name: 'FastQC & Quality Trimming (Q30)', status: 'completed', progress: 100, detail: '156,400 raw paired-end reads trimmed to Q >= 30; 98.2% passed.' },
      { name: 'DADA2 ASV Denoising', status: 'completed', progress: 100, detail: 'Exact sequence variants inferred with error rate model estimation.' },
      { name: 'Chimera Detection & Removal', status: 'completed', progress: 100, detail: 'Bimera removal cleared 1,420 non-biological artefacts.' },
      { name: 'Naive Bayes Taxonomic Classifier', status: 'completed', progress: 100, detail: '100 bootstrap iterations aligned against MIDORI2 reference library.' },
      { name: 'Negative Control Subtraction', status: 'completed', progress: 100, detail: 'Extraction and PCR blank filtering completed. Verified clean.' },
    ],
  },
  {
    id: 'JOB-2026-0915-01',
    sampleId: 'SMP-GOA-03',
    sampleName: 'Chicalim Bay Estuarine Mouth (Station MB-03)',
    projectId: 'PRJ-GOA-01',
    marker: 'COI (cytochrome c oxidase I), ~313 bp',
    referenceDb: 'MIDORI2 + WoRMS Taxonomy',
    readsInput: 105000,
    readsRetained: 96500,
    asvsInferred: 2940,
    startedAt: '2026-09-15T14:10:00Z',
    completedAt: '2026-09-15T14:31:00Z',
    status: 'completed',
    currentStage: 5,
    stages: [
      { name: 'FastQC & Quality Trimming (Q30)', status: 'completed', progress: 100, detail: 'Adapter clipping and quality sliding window completed.' },
      { name: 'DADA2 ASV Denoising', status: 'completed', progress: 100, detail: 'Denoised into 3,120 putative ASVs.' },
      { name: 'Chimera Detection & Removal', status: 'completed', progress: 100, detail: '180 chimeric variants flagged and removed.' },
      { name: 'Naive Bayes Taxonomic Classifier', status: 'completed', progress: 100, detail: 'Taxonomic lineage inferred to species cut-off.' },
      { name: 'Negative Control Subtraction', status: 'completed', progress: 100, detail: 'Flagged 1 control hit in field blank (Oikopleura dioica).' },
    ],
  },
  {
    id: 'JOB-2026-1004-01',
    sampleId: 'SMP-ZRI-01',
    sampleName: 'Corticor Mangrove Creek (Station ZC-01)',
    projectId: 'PRJ-ZRI-03',
    marker: '18S rRNA V9 (Micro-eukaryotes & Benthos)',
    referenceDb: 'PR2 v5.0.0 (Protist & Eukaryote Reference)',
    readsInput: 144200,
    readsRetained: 138000,
    asvsInferred: 3450,
    startedAt: '2026-10-04T09:15:00Z',
    completedAt: '2026-10-04T09:36:20Z',
    status: 'completed',
    currentStage: 5,
    stages: [
      { name: 'FastQC & Quality Trimming (Q30)', status: 'completed', progress: 100, detail: 'High retention (95.7% reads retained).' },
      { name: 'DADA2 ASV Denoising', status: 'completed', progress: 100, detail: 'Resolved 3,450 unique amplicon variants.' },
      { name: 'Chimera Detection & Removal', status: 'completed', progress: 100, detail: 'De novo chimera checking passed.' },
      { name: 'Naive Bayes Taxonomic Classifier', status: 'completed', progress: 100, detail: 'Assigned against PR2 reference database.' },
      { name: 'Negative Control Subtraction', status: 'completed', progress: 100, detail: 'Negative blanks verified completely clean.' },
    ],
  },
  {
    id: 'JOB-LIVE-QUEUED',
    sampleId: 'SMP-GOA-02',
    sampleName: 'Navigation Channel Benthic Silt (Station MB-02)',
    projectId: 'PRJ-GOA-01',
    marker: 'COI (cytochrome c oxidase I)',
    referenceDb: 'MIDORI2 Reference',
    readsInput: 128000,
    readsRetained: 122400,
    asvsInferred: 3560,
    startedAt: '2026-11-10T14:15:00Z',
    status: 'processing',
    currentStage: 4,
    stages: [
      { name: 'FastQC & Quality Trimming (Q30)', status: 'completed', progress: 100, detail: 'Completed in 3m 12s.' },
      { name: 'DADA2 ASV Denoising', status: 'completed', progress: 100, detail: 'Completed in 8m 45s.' },
      { name: 'Chimera Detection & Removal', status: 'completed', progress: 100, detail: 'Completed in 2m 10s.' },
      { name: 'Naive Bayes Taxonomic Classifier', status: 'running', progress: 78, detail: 'Bootstrapping taxonomic assignments (78/100)...' },
      { name: 'Negative Control Subtraction', status: 'queued', progress: 0, detail: 'Awaiting classifier completion.' },
    ],
  },
];

/**
 * Storage helpers to allow the user to create new projects and add samples
 * with persistence during the current session or via localStorage.
 */
const STORAGE_KEYS = {
  PROJECTS: 'ecodna_projects_v2',
  SAMPLES: 'ecodna_samples_v2',
  PIPELINE: 'ecodna_pipeline_jobs_v2',
};

export function loadProjects(): ProjectRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to read projects from storage', e);
  }
  return INITIAL_PROJECTS;
}

export function saveProjects(projects: ProjectRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
  } catch (e) {
    console.error('Failed to save projects to storage', e);
  }
}

export function loadSamples(): SampleRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SAMPLES);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to read samples from storage', e);
  }
  return INITIAL_SAMPLES;
}

export function saveSamples(samples: SampleRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.SAMPLES, JSON.stringify(samples));
  } catch (e) {
    console.error('Failed to save samples to storage', e);
  }
}

export function loadPipelineJobs(): PipelineJob[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PIPELINE);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to read pipeline jobs from storage', e);
  }
  return INITIAL_PIPELINE_JOBS;
}

export function savePipelineJobs(jobs: PipelineJob[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.PIPELINE, JSON.stringify(jobs));
  } catch (e) {
    console.error('Failed to save pipeline jobs to storage', e);
  }
}

