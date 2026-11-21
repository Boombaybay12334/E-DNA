// Ecological and conservation metadata for eDNA taxa.
// In real-world platforms (e.g. NatureMetrics, Wilderlab), taxonomies are linked to
// IUCN Red List, GBIF, World Register of Marine Species (WoRMS), and regional biosecurity lists.

export type IucnStatus = 'CR' | 'EN' | 'VU' | 'NT' | 'LC' | 'DD' | 'NE';

export type EcologicalTag =
  | 'threatened'
  | 'bioindicator'
  | 'commercial'
  | 'invasive'
  | 'keystone'
  | 'mutualist'
  | 'pathogen';

export interface TaxonEcoInfo {
  commonName: string;
  iucnStatus?: IucnStatus;
  tag?: EcologicalTag;
  tagLabel?: string;
  summary: string;
  habitat?: string;
}

export const IUCN_META: Record<IucnStatus, { label: string; desc: string; tone: string }> = {
  CR: { label: 'Critically Endangered', desc: 'Extremely high risk of extinction in the wild', tone: 'bad' },
  EN: { label: 'Endangered', desc: 'Very high risk of extinction in the wild', tone: 'bad' },
  VU: { label: 'Vulnerable', desc: 'High risk of extinction in the wild', tone: 'weak' },
  NT: { label: 'Near Threatened', desc: 'Close to qualifying for a threatened category', tone: 'mid' },
  LC: { label: 'Least Concern', desc: 'Widespread and abundant taxa', tone: 'good' },
  DD: { label: 'Data Deficient', desc: 'Inadequate information to make a direct assessment', tone: 'none' },
  NE: { label: 'Not Evaluated', desc: 'Taxon has not yet been assessed against IUCN criteria', tone: 'none' },
};

export const ECO_TAG_META: Record<EcologicalTag, { label: string; tone: string; icon: string }> = {
  threatened: { label: 'IUCN Threatened', tone: 'bad', icon: '🛡️' },
  bioindicator: { label: 'Bioindicator', tone: 'teal', icon: '🌿' },
  commercial: { label: 'Commercial Value', tone: 'info', icon: '🐟' },
  invasive: { label: 'Biosecurity Alert', tone: 'bad', icon: '⚠️' },
  keystone: { label: 'Keystone Habitat', tone: 'good', icon: '⚓' },
  mutualist: { label: 'Soil Mutualist', tone: 'good', icon: '🌱' },
  pathogen: { label: 'Plant Pathogen', tone: 'weak', icon: '🔬' },
};

/**
 * Curated catalog of ecological annotations for demo taxa.
 * Keyed by species name or genus name.
 */
export const TAXA_ECOLOGY: Record<string, TaxonEcoInfo> = {
  // --- Water / Pelagic ---
  'Pleuromamma abdominalis': {
    commonName: 'Northern Luminous Copepod',
    iucnStatus: 'LC',
    tag: 'bioindicator',
    tagLabel: 'Mesopelagic Bioindicator',
    summary: 'Key calanoid copepod displaying strong diel vertical migration; vital link in ocean carbon export.',
    habitat: 'Mesopelagic & Bathypelagic water column',
  },
  'Pleuromamma xiphias': {
    commonName: 'Sword-head Luminous Copepod',
    iucnStatus: 'LC',
    tag: 'bioindicator',
    tagLabel: 'Vertical Migrator',
    summary: 'Bioluminescent deep-sea copepod indicative of healthy open-ocean pelagic food webs.',
    habitat: 'Subtropical and tropical deep sea',
  },
  'Subeucalanus subcrassus': {
    commonName: 'Subtropical Glass Copepod',
    iucnStatus: 'LC',
    tag: 'bioindicator',
    tagLabel: 'Zooplankton Grazer',
    summary: 'Transparent herbivorous copepod regulating phytoplankton blooms in epipelagic to mesopelagic zones.',
    habitat: 'Tropical and subtropical oceans',
  },
  'Oncaea venusta': {
    commonName: 'Poecilostomatoid Micro-Copepod',
    iucnStatus: 'LC',
    tag: 'bioindicator',
    tagLabel: 'Pelagic Decomposer',
    summary: 'Marine snow grazer playing a pivotal role in particle remineralization in deep water columns.',
    habitat: 'Global pelagic ocean',
  },
  'Euphausia diomedeae': {
    commonName: 'Equatorial Krill',
    iucnStatus: 'LC',
    tag: 'commercial',
    tagLabel: 'Trophic Keystone',
    summary: 'Abundant tropical euphausiid providing primary forage biomass for pelagic fishes, cephalopods, and whales.',
    habitat: 'Epipelagic & upper mesopelagic',
  },
  'Acanthephyra purpurea': {
    commonName: 'Deepwater Crimson Caridean Shrimp',
    iucnStatus: 'LC',
    tag: 'bioindicator',
    tagLabel: 'Deep Bathypelagic Nekton',
    summary: 'Bright red bioluminescent decapod adapted to high hydrostatic pressure and low oxygen zones.',
    habitat: 'Mesopelagic to bathypelagic (500–2,000 m)',
  },
  'Phronima sedentaria': {
    commonName: 'Barrel-housing Amphipod',
    iucnStatus: 'LC',
    tag: 'bioindicator',
    tagLabel: 'Symbiont / Parasitoid',
    summary: 'Hyperiid amphipod that carves salivary barrels out of gelatinous salp bodies for shelter and brood-care.',
    habitat: 'Midwater pelagic realm',
  },
  'Chelophyes appendiculata': {
    commonName: 'Rocket Siphonophore',
    iucnStatus: 'LC',
    tag: 'bioindicator',
    tagLabel: 'Gelatinous Predator',
    summary: 'Colonial hydrozoan; critical midwater planktivore whose abundance reflects oceanic stratification.',
    habitat: 'Warm pelagic waters worldwide',
  },
  'Aglaura hemistoma': {
    commonName: 'Helmet Hydrozoan Medusa',
    iucnStatus: 'LC',
    tag: 'bioindicator',
    tagLabel: 'Epipelagic Hydromedusa',
    summary: 'Direct-developing trachymedusa with worldwide tropical distribution.',
    habitat: 'Tropical oceanic surface waters',
  },
  'Atolla wyvillei': {
    commonName: 'Coronate Deep-Sea Medusa',
    iucnStatus: 'LC',
    tag: 'bioindicator',
    tagLabel: 'Deep Sea Predator',
    summary: 'Renowned crimson scyphozoan that emits vivid bioluminescent burglar-alarm flashes when attacked.',
    habitat: 'Bathypelagic zone (1,000–4,000 m)',
  },
  'Desmophyllum pertusum': {
    commonName: 'Lophelia Deep-Water Coral',
    iucnStatus: 'VU',
    tag: 'threatened',
    tagLabel: 'Vulnerable Reef Builder',
    summary: 'Cold-water framework-forming scleractinian coral; legally protected biodiversity refuge in benthic canyons.',
    habitat: 'Deep-sea cold waters (200–2,000 m)',
  },
  'Limacina bulimoides': {
    commonName: 'Spiral Sea Butterfly',
    iucnStatus: 'LC',
    tag: 'bioindicator',
    tagLabel: 'Ocean Acidification Sentinel',
    summary: 'Planktonic pteropod with fragile aragonite shell, highly sensitive to ocean acidification and carbonate chemistry.',
    habitat: 'Tropical oceanic water column',
  },
  'Limacina trochiformis': {
    commonName: 'Trochiform Sea Butterfly',
    iucnStatus: 'LC',
    tag: 'bioindicator',
    tagLabel: 'Ocean Acidification Sentinel',
    summary: 'Pelagic gastropod providing early warning indications of declining aragonite saturation in sea water.',
    habitat: 'Warm and temperate oceans',
  },
  'Firoloida desmarestia': {
    commonName: 'Sea Elephant Pterotracheid',
    iucnStatus: 'LC',
    tag: 'bioindicator',
    tagLabel: 'Pelagic Carnivorous Snail',
    summary: 'Transparent, streamlined pelagic heteropod predator active in tropical sunlit waters.',
    habitat: 'Epipelagic oceanic zone',
  },
  'Sthenoteuthis oualaniensis': {
    commonName: 'Purpleback Flying Squid',
    iucnStatus: 'LC',
    tag: 'commercial',
    tagLabel: 'Commercial Cephalopod',
    summary: 'Dominant pelagic squid of the tropical Indo-Pacific; high economic significance in offshore fisheries.',
    habitat: 'Tropical open ocean',
  },
  'Vampyroteuthis infernalis': {
    commonName: 'Vampire Squid from Hell',
    iucnStatus: 'LC',
    tag: 'bioindicator',
    tagLabel: 'Oxygen Minimum Zone Specialist',
    summary: 'Phylogenetic relic consuming marine detritus and marine snow within suboxic midwater zones.',
    habitat: 'Oxygen minimum layers (600–1,200 m)',
  },
  'Benthosema pterotum': {
    commonName: 'Skinnycheek Lanternfish',
    iucnStatus: 'LC',
    tag: 'bioindicator',
    tagLabel: 'Deep Scattering Layer',
    summary: 'One of the most abundant vertebrate biomass species on Earth; crucial trophic conduit between plankton and top predators.',
    habitat: 'Arabian Sea mesopelagic layer',
  },
  'Diaphus garmani': {
    commonName: 'Garman’s Lanternfish',
    iucnStatus: 'LC',
    tag: 'bioindicator',
    tagLabel: 'Myctophid Mesopelagic',
    summary: 'Bioluminescent lanternfish inhabiting deep continental slopes and oceanic basins.',
    habitat: 'Tropical and subtropical deep water',
  },
  'Cyclothone pallida': {
    commonName: 'Shadow Bristlemouth',
    iucnStatus: 'LC',
    tag: 'bioindicator',
    tagLabel: 'Hyper-abundant Vertebrate',
    summary: 'Deep-sea gonostomatid fish constituting colossal biomass in bathypelagic waters worldwide.',
    habitat: 'Bathypelagic zone (750–2,500 m)',
  },
  'Cyclothone acclinidens': {
    commonName: 'Benttooth Bristlemouth',
    iucnStatus: 'LC',
    tag: 'bioindicator',
    tagLabel: 'Deep Bathypelagic Fish',
    summary: 'Abundant midwater micro-predator feeding on small pelagic crustaceans.',
    habitat: 'Deep-sea water column',
  },
  'Argyropelecus aculeatus': {
    commonName: 'Lovely Hatchetfish',
    iucnStatus: 'LC',
    tag: 'bioindicator',
    tagLabel: 'Mesopelagic Hatchetfish',
    summary: 'Silvery laterally compressed body with ventral photophores providing counterillumination camouflage.',
    habitat: 'Mesopelagic (200–1,000 m)',
  },
  'Thunnus albacares': {
    commonName: 'Yellowfin Tuna',
    iucnStatus: 'NT',
    tag: 'threatened',
    tagLabel: 'Near Threatened / Commercial',
    summary: 'Apex pelagic predatory fish subject to intense global fishing quotas and management oversight.',
    habitat: 'Tropical and subtropical pelagic oceans',
  },
  'Thunnus obesus': {
    commonName: 'Bigeye Tuna',
    iucnStatus: 'VU',
    tag: 'threatened',
    tagLabel: 'Vulnerable Apex Predator',
    summary: 'Deep-diving commercial tuna species vulnerable to longline overexploitation and juvenile purse-seine bycatch.',
    habitat: 'Pelagic open ocean to 500 m',
  },
  'Salpa fusiformis': {
    commonName: 'Fusiform Salp',
    iucnStatus: 'LC',
    tag: 'bioindicator',
    tagLabel: 'Rapid Carbon Pump',
    summary: 'Fast-growing thaliacean that forms extensive ocean swarms, sequestering immense organic carbon rapidly to the sea floor.',
    habitat: 'Pelagic waters worldwide',
  },
  'Oikopleura dioica': {
    commonName: 'Dioecious Appendicularian',
    iucnStatus: 'LC',
    tag: 'bioindicator',
    tagLabel: 'Planktonic Filter-feeder',
    summary: 'Solitary tunicate building complex gelatinous mucus houses that filter pico- and nanoplankton.',
    habitat: 'Coastal and oceanic surface waters',
  },
  'Homo sapiens': {
    commonName: 'Human (Handling DNA)',
    iucnStatus: 'LC',
    tag: 'pathogen',
    tagLabel: 'Laboratory / Sampling Contaminant',
    summary: 'Human handling contaminant sequence; standard negative-control decontamination flag.',
    habitat: 'Terrestrial / anthropogenic',
  },
  'Bos taurus': {
    commonName: 'Bovine (BSA / Reagent Artefact)',
    iucnStatus: 'LC',
    tag: 'pathogen',
    tagLabel: 'Reagent Contaminant',
    summary: 'Bovine serum albumin (BSA) or lab consumable reagent artefact sequence.',
    habitat: 'Reagent contaminant',
  },
  'Tomopteris helgolandica': {
    commonName: 'Helgoland Yellow-Glow Worm',
    iucnStatus: 'LC',
    tag: 'bioindicator',
    tagLabel: 'Planktonic Polychaete',
    summary: 'Bioluminescent holoplanktonic annelid worm flashing unique yellow-golden light pulses.',
    habitat: 'Pelagic oceanic waters',
  },
  'Flaccisagitta enflata': {
    commonName: 'Inflated Arrow Worm',
    iucnStatus: 'LC',
    tag: 'bioindicator',
    tagLabel: 'Chaetognath Predator',
    summary: 'Voracious transparent chaetognath grasping copepods with specialized chitinous head spines.',
    habitat: 'Warm pelagic oceanic waters',
  },
  'Bolinopsis infundibulum': {
    commonName: 'Northern Comb Jelly',
    iucnStatus: 'LC',
    tag: 'bioindicator',
    tagLabel: 'Fragile Lobate Ctenophore',
    summary: 'Delicate gelatinous predator with iridescent ctene rows; rapid indicator of warm water stratification.',
    habitat: 'Cold and temperate oceanic waters',
  },
  'Peniagone diaphana': {
    commonName: 'Diaphanous Sea Pig',
    iucnStatus: 'LC',
    tag: 'bioindicator',
    tagLabel: 'Abyssal Holothurian',
    summary: 'Swimming deep-sea sea cucumber utilizing modified water-vascular appendages in the benthic boundary layer.',
    habitat: 'Abyssal and bathyal plains (1,500–4,000 m)',
  },
  'Euplectella aspergillum': {
    commonName: 'Venus’ Flower Basket Glass Sponge',
    iucnStatus: 'LC',
    tag: 'keystone',
    tagLabel: 'Hexactinellid Structural Habitat',
    summary: 'Siliceous glass sponge creating complex micro-architecture that hosts symbiotic bioluminescent shrimp.',
    habitat: 'Deep-sea benthos (500–1,500 m)',
  },
  'Gymnodinium catenatum': {
    commonName: 'Chain-forming Paralytic Dinoflagellate',
    iucnStatus: 'NE',
    tag: 'invasive',
    tagLabel: 'Harmful Algal Bloom (HAB)',
    summary: 'Produces saxitoxins causing paralytic shellfish poisoning (PSP); high biosecurity monitoring priority.',
    habitat: 'Coastal waters & ballast water vectors',
  },
  'Navicula directa': {
    commonName: 'Marine Benthic Pennate Diatom',
    iucnStatus: 'NE',
    tag: 'bioindicator',
    tagLabel: 'Primary Producer',
    summary: 'Siliceous diatom contributing to the base of benthic food chains and sediment stabilization.',
    habitat: 'Marine sediments and biofilms',
  },
  'Corallina officinalis': {
    commonName: 'Coral Weed / Pink Coralline Alga',
    iucnStatus: 'LC',
    tag: 'keystone',
    tagLabel: 'Calcified Algae',
    summary: 'Articulated coralline rhodophyte producing biogenic calcium carbonate crusts in marine habitats.',
    habitat: 'Rocky reefs and intertidal zones',
  },

  // --- Soil & Terrestrial Restoration ---
  'Russula emetica': {
    commonName: 'The Sickener Brittlegill',
    iucnStatus: 'LC',
    tag: 'bioindicator',
    tagLabel: 'Ectomycorrhizal Indicator',
    summary: 'Vibrant red mushroom forming mutualistic root networks with coniferous trees; reflects soil fungal maturation.',
    habitat: 'Moist coniferous woodland soils',
  },
  'Boletus edulis': {
    commonName: 'Porcini / King Bolete',
    iucnStatus: 'LC',
    tag: 'commercial',
    tagLabel: 'Edible Mycorrhizal Fungus',
    summary: 'Globally prized culinary mushroom providing crucial symbiotic water and mineral exchange to host trees.',
    habitat: 'Mature deciduous and coniferous forest floors',
  },
  'Hygrocybe conica': {
    commonName: 'Blackening Waxcap',
    iucnStatus: 'NT',
    tag: 'threatened',
    tagLabel: 'Unimproved Grassland Indicator',
    summary: 'Sensitive to chemical fertilizer application; flagship species for pristine, ancient semi-natural grasslands.',
    habitat: 'Nutrient-poor unimproved pastures',
  },
  'Cantharellus cibarius': {
    commonName: 'Golden Chanterelle',
    iucnStatus: 'LC',
    tag: 'commercial',
    tagLabel: 'Symbiotic Forest Fungus',
    summary: 'Aromatic mycorrhizal basidiomycete sensitive to heavy soil compaction and nitrogen deposition.',
    habitat: 'Mossy woodland soils',
  },
  'Amanita muscaria': {
    commonName: 'Fly Agaric',
    iucnStatus: 'LC',
    tag: 'bioindicator',
    tagLabel: 'Pioneer Tree Mutualist',
    summary: 'Classic scarlet toadstool forming ectomycorrhizal associations with pioneer birch and pine seedlings.',
    habitat: 'Birch and pine woodlands on acidic soils',
  },
  'Fusarium oxysporum': {
    commonName: 'Fusarium Vascular Wilt Fungus',
    iucnStatus: 'NE',
    tag: 'pathogen',
    tagLabel: 'Agricultural Soil Pathogen',
    summary: 'Soil-borne ascomycete with complex host-specific pathogenic strains capable of devastating crop roots.',
    habitat: 'Agricultural and disturbed soils worldwide',
  },
  'Trichoderma harzianum': {
    commonName: 'Beneficial Soil Biocontrol Fungus',
    iucnStatus: 'NE',
    tag: 'mutualist',
    tagLabel: 'Biocontrol Agent',
    summary: 'Rapidly colonizing rhizospheric fungus that suppresses phytopathogens and stimulates plant systemic resistance.',
    habitat: 'Organic-rich topsoil and compost',
  },
  'Penicillium chrysogenum': {
    commonName: 'Penicillin-producing Soil Mold',
    iucnStatus: 'NE',
    tag: 'bioindicator',
    tagLabel: 'Decomposer Saprotroph',
    summary: 'Ubiquitous saprophytic fungus responsible for organic matter turnover and soil nutrient mineralization.',
    habitat: 'Humus layers and decaying biomass',
  },
  'Aspergillus niger': {
    commonName: 'Black Aspergill Mold',
    iucnStatus: 'NE',
    tag: 'bioindicator',
    tagLabel: 'Carbon Mineralizer',
    summary: 'High-temperature tolerant saprotrophic fungus releasing citric acid and enzymes into soil matrices.',
    habitat: 'Warm compost and organic soil',
  },
  'Alternaria alternata': {
    commonName: 'Opportunistic Leaf & Soil Dematiaceous Mold',
    iucnStatus: 'NE',
    tag: 'pathogen',
    tagLabel: 'Plant Pathogen / Allergen',
    summary: 'Dark-pigmented spore-forming dematiaceous fungus found in decaying leaf litter and topsoil.',
    habitat: 'Agricultural residues and topsoils',
  },
  'Mucor hiemalis': {
    commonName: 'Winter Mucor Pinmold',
    iucnStatus: 'NE',
    tag: 'bioindicator',
    tagLabel: 'Cold-tolerant Saprotroph',
    summary: 'Early colonizer of raw organic debris; active at low soil temperatures.',
    habitat: 'Cool temperate soil and forest litter',
  },
  'Mortierella alpina': {
    commonName: 'Alpine Zygomycetous Soil Fungus',
    iucnStatus: 'NE',
    tag: 'mutualist',
    tagLabel: 'PUFA Bio-synthesizer',
    summary: 'Soil zygomycete synthesizing arachidonic acid and phosphate-solubilizing compounds in mineral soil horizons.',
    habitat: 'Sub-alpine and post-industrial restoration soils',
  },
  'Rhizophagus irregularis': {
    commonName: 'Arbuscular Mycorrhizal Model (AMF)',
    iucnStatus: 'NE',
    tag: 'mutualist',
    tagLabel: 'Key Restoration Mutualist',
    summary: 'Essential obligate root endosymbiont increasing plant drought tolerance and phosphorus uptake by up to 80%.',
    habitat: 'Pioneer grassland and restored mine soils',
  },
  'Streptomyces griseus': {
    commonName: 'Grey Streptomycete Soil Actinobacterium',
    iucnStatus: 'NE',
    tag: 'bioindicator',
    tagLabel: 'Healthy Soil / Geosmin Producer',
    summary: 'Gram-positive filamentous bacterium producing streptomycin and geosmin (characteristic healthy earth odor).',
    habitat: 'Aerated neutral-to-alkaline soils',
  },
  'Pseudomonas fluorescens': {
    commonName: 'Plant Growth-Promoting Rhizobacterium',
    iucnStatus: 'NE',
    tag: 'mutualist',
    tagLabel: 'Rhizospheric Mutualist',
    summary: 'Produces fluorescent siderophores that chelate iron, promoting plant vigor in recovering soil soils.',
    habitat: 'Plant root zone and fresh water',
  },
  'Bradyrhizobium japonicum': {
    commonName: 'Soybean Nitrogen-Fixing Symbiont',
    iucnStatus: 'NE',
    tag: 'mutualist',
    tagLabel: 'Nitrogen-Fixing Symbiont',
    summary: 'Transforms atmospheric dinitrogen into bioavailable ammonia inside leguminous root nodules.',
    habitat: 'Symbiotic root nodules in reclamation plots',
  },
  'Rhizobium leguminosarum': {
    commonName: 'Clover & Vetch Nitrogen-Fixer',
    iucnStatus: 'NE',
    tag: 'mutualist',
    tagLabel: 'Soil Nitrogen Restorer',
    summary: 'Critical bio-fertilizing symbiont accelerating natural soil re-vegetation without chemical inputs.',
    habitat: 'Root nodules of Fabaceae in topsoil',
  },
  'Phytophthora cinnamomi': {
    commonName: 'Dieback Root Rot Water Mold',
    iucnStatus: 'NE',
    tag: 'invasive',
    tagLabel: 'High-Risk Invasive Pathogen',
    summary: 'Devastating destructive plant pathogen ranked among the World’s 100 Worst Invasive Alien Species.',
    habitat: 'Moist infected soils and waterways',
  },
  'Lumbricus terrestris': {
    commonName: 'Common Deep-burrowing Earthworm',
    iucnStatus: 'LC',
    tag: 'bioindicator',
    tagLabel: 'Soil Ecosystem Engineer',
    summary: 'Anecic earthworm creating vertical burrows, mixing mineral and organic layers, and aerating the pedosphere.',
    habitat: 'Temperate agricultural and woodland topsoils',
  },
  'Aporrectodea caliginosa': {
    commonName: 'Grey Worm / Endogeic Earthworm',
    iucnStatus: 'LC',
    tag: 'bioindicator',
    tagLabel: 'Soil Health Sentinel',
    summary: 'Endogeic worm consuming mineral soil, crucial for water infiltration and soil aggregate stability.',
    habitat: 'Pasture topsoil (0–20 cm)',
  },
  'Folsomia candida': {
    commonName: 'Blind White Springtail',
    iucnStatus: 'LC',
    tag: 'bioindicator',
    tagLabel: 'Soil Ecotoxicology Model',
    summary: 'Parthenogenetic collembolan sensitive to heavy metals and pesticide contamination in spoil piles.',
    habitat: 'Humus-rich soil fissures and leaf litter',
  },
  'Caenorhabditis elegans': {
    commonName: 'Soil Free-living Nematode',
    iucnStatus: 'LC',
    tag: 'bioindicator',
    tagLabel: 'Model Micro-fauna',
    summary: 'Bacterivorous roundworm indicating vibrant biological turnover in the micro-edaphic realm.',
    habitat: 'Decaying plant matter and rich loam',
  },
  'Trifolium repens': {
    commonName: 'White Clover',
    iucnStatus: 'LC',
    tag: 'bioindicator',
    tagLabel: 'Nitrogen-Fixing Forage',
    summary: 'Ground-covering perennial legume that prevents topsoil erosion and provides high-protein forage.',
    habitat: 'Pioneer seeded grassland on restoration heaps',
  },
  'Festuca rubra': {
    commonName: 'Red Fescue Grass',
    iucnStatus: 'LC',
    tag: 'bioindicator',
    tagLabel: 'Restoration Pioneer Grass',
    summary: 'Heavy metal-tolerant turfgrass frequently seeded to stabilize barren mining tailings.',
    habitat: 'Disturbed soils, coastal dunes, reclamation zones',
  },

  // --- Sediment & Benthic Estuary ---
  'Hediste diversicolor': {
    commonName: 'Estuarine Ragworm',
    iucnStatus: 'LC',
    tag: 'bioindicator',
    tagLabel: 'Benthic Sediment Sentinel',
    summary: 'Key estuarine bioturbator oxygenating muddy sediments and serving as essential prey for shorebirds.',
    habitat: 'Intertidal mudflats and shallow estuaries',
  },
  'Pygospio elegans': {
    commonName: 'Elegant Tube-building Spionid',
    iucnStatus: 'LC',
    tag: 'bioindicator',
    tagLabel: 'Opportunistic Colonizer',
    summary: 'Small tube-dwelling polychaete that rapidly colonizes dredged sediments and mudflats.',
    habitat: 'Shallow marine and estuarine sands',
  },
  'Capitella capitata': {
    commonName: 'Capitellid Pollution Indicator Worm',
    iucnStatus: 'LC',
    tag: 'bioindicator',
    tagLabel: 'Organic Pollution Indicator',
    summary: 'Classic marine ecological sentinel; population explosions signal severe organic enrichment and hypoxia.',
    habitat: 'Disturbed harbour basins and dredging channels',
  },
  'Macoma balthica': {
    commonName: 'Baltic Tellin / Mud Clam',
    iucnStatus: 'LC',
    tag: 'bioindicator',
    tagLabel: 'Benthic Suspension/Deposit Feeder',
    summary: 'Long-lived bivalve filtering pelagic phytoplankton and vacuuming benthic diatom deposits.',
    habitat: 'Soft coastal muds and silts',
  },
  'Mytilus edulis': {
    commonName: 'Blue Mussel',
    iucnStatus: 'LC',
    tag: 'commercial',
    tagLabel: 'Commercial / Bio-monitor',
    summary: 'Reef-forming bivalve widely used globally as a sentinel bio-monitor for heavy metals and microplastics.',
    habitat: 'Intertidal and shallow subtidal hard substrate',
  },
  'Peringia ulvae': {
    commonName: 'Laver Spire Snail / Mud Snail',
    iucnStatus: 'LC',
    tag: 'bioindicator',
    tagLabel: 'Mudflat Grazer',
    summary: 'Tiny prosobranch snail reaching densities of 50,000 / m², grazing epipelic diatoms.',
    habitat: 'Estuarine mud and saltmarshes',
  },
  'Corophium volutator': {
    commonName: 'Mud Shrimp / Scud',
    iucnStatus: 'LC',
    tag: 'bioindicator',
    tagLabel: 'Sediment Bio-engineer',
    summary: 'Amphipod digging U-shaped sediment burrows; keystone nutritional food source for migratory waders.',
    habitat: 'Intertidal mud banks and tidal creeks',
  },
  'Zostera marina': {
    commonName: 'Common Eelgrass / Seagrass',
    iucnStatus: 'NT',
    tag: 'threatened',
    tagLabel: 'Blue Carbon Keystone Habitat',
    summary: 'Marine angiosperm providing high-capacity carbon sequestration and essential nursery habitat for commercial fish.',
    habitat: 'Sheltered shallow bays and estuaries (0–4 m)',
  },
  'Skeletonema costatum': {
    commonName: 'Chain-forming Glass Diatom',
    iucnStatus: 'NE',
    tag: 'bioindicator',
    tagLabel: 'Spring Bloom Diatom',
    summary: 'Dominant coastal phytoplankton forming delicate cylindrical silica chains.',
    habitat: 'Coastal waters and estuarine plumes',
  },
  'Ulva lactuca': {
    commonName: 'Sea Lettuce',
    iucnStatus: 'LC',
    tag: 'bioindicator',
    tagLabel: 'Eutrophication Indicator',
    summary: 'Green macroalga; excessive green tides indicate excess anthropogenic nitrogen and phosphate runoff.',
    habitat: 'Nutrient-rich shallow waters and harbours',
  },
};

/**
 * Helper to fetch ecological annotations for any taxon name.
 * Checks exact binomial species first, then genus, and provides sensible defaults.
 */
export function getTaxonEcology(name: string): TaxonEcoInfo | null {
  if (!name || name === 'Unresolved' || name === 'Unassigned at this rank') return null;

  // Direct match
  if (TAXA_ECOLOGY[name]) return TAXA_ECOLOGY[name];

  // Try matching genus (first word)
  const genus = name.split(' ')[0];
  if (genus && TAXA_ECOLOGY[genus]) return TAXA_ECOLOGY[genus];

  return null;
}

