# Technical Specification: Downstream Biodiversity Analytics & Evaluation Engine

## 1. Why Traditional Pipelines Fail & How We Improve Them

### Current Limitations of Traditional Pipelines

* **Uncalibrated Overconfidence & Closed-World Forcing:**
  Traditional taxonomic classifiers (such as naive top-hit BLAST, basic RDP, and closed-set flat multiclass classifiers) operate under an implicit closed-world assumption. They assume that every environmental query sequence originated from an organism that already exists within their reference database. When presented with an eDNA read from an unsequenced, rare, or previously undiscovered species (prevalent in understudied habitats like the deep sea or complex soils), these classifiers compute nearest-neighbor similarity across existing entries and force an assignment to the closest cataloged taxon. This produces high confidence scores for biologically incorrect species, introducing severe over-classification errors into biodiversity audits.

* **Binary "All-or-Nothing" Classification Bottleneck:**
  Existing bioinformatic pipelines typically handle taxonomic resolution in a binary fashion:
  1. If sequence similarity exceeds an arbitrary hard threshold (e.g., 97% identity), the pipeline outputs a species-level label.
  2. If it falls below the threshold, the read is discarded or labeled as generic "unassigned" or "unclassified".
  
  These systems fail to distinguish between total lack of information and partial information. A sequence may contain enough evolutionary conservation to assign it with high certainty to an established genus or family, even if the exact species is unknown. By defaulting to an all-or-nothing assignment, standard tools discard valuable higher-level biological data.

* **Absence of Ecological Community Synthesis:**
  Traditional classifier workflows terminate once a flat table of labeled sequences is produced (e.g., read ID mapped to a taxon string). They do not compute ecological community structure. A list of identified species does not communicate whether an ecosystem is balanced, undergoing ecological stress, dominated by a single monoculture bloom, or sustaining high functional diversity. Downstream practitioners must manually write independent scripts or move data into secondary software (e.g., R packages like vegan or phyloseq) to extract basic ecological indicators.

* **Conflating Amplicon Read Counts with True Physical Biomass:**
  Raw read counts generated from high-throughput sequencing instruments do not translate directly to absolute organism abundance or biomass. Variations in mitochondrial or ribosomal gene copy numbers per cell, tissue shedding rates across different organism sizes, and preferential primer binding during PCR introduce amplification distortions. Traditional pipelines often present raw sequence read counts without relative abundance transformation or noise-floor thresholding, leading practitioners to mistake high read counts for high organism populations.

### Our Improved Approach

* **Graceful Hierarchical Back-Off:**
  Instead of forcing a species-level prediction, the engine evaluates confidence across every level of the Linnaean hierarchy (Domain -> Phylum -> Class -> Order -> Family -> Genus -> Species). If statistical confidence drops below a validated threshold at the species level, the system dynamically steps back to assign the read to the deepest ancestral rank (genus or family) that the underlying sequence evidence reliably supports.

* **Calibrated Novelty & "Dark Taxa" Isolation:**
  Rather than forcing unrepresented sequences into cataloged database bins, the system isolates reads that exhibit high uncertainty or fall outside known reference clusters in sequence embedding space. These reads are flagged as "Candidate Novel Lineages", allowing researchers to detect potential biological discoveries without skewing known biodiversity indices.

* **Automated Ecological Diversity Engine:**
  The downstream pipeline takes the classified Amplicon Sequence Variant (ASV) counts, applies noise filtering, normalizes the data into relative abundance proportions, and computes standard ecological diversity metrics (alpha-diversity and beta-diversity).

* **Substrate-Aware Ecological Guardrails:**
  The analytics engine factors in the physical source of the sample:
  * Aquatic Systems: Flags hydrodynamic transport considerations, reminding practitioners that water eDNA drifts with tides, river discharge, and marine currents, reflecting upstream or regional presence rather than a single pinpoint coordinate.
  * Soil Systems: Integrates legacy/relic DNA warnings, accounting for the fact that extracellular DNA binds to clay minerals and humic matter, persisting significantly longer than aquatic eDNA.

---

## 2. Mathematical Formulations & Algorithms


```

[Raw ASV Read Counts: n_i]
│
▼
┌────────────────────────────────────────────────────────┐
│  Phase 1: QC & Relative Abundance Transformation       │
│  p_i = n_i / N                                         │
└────────────────────────────────────────────────────────┘
│
▼
┌────────────────────────────────────────────────────────┐
│  Phase 2: Alpha-Diversity & Community Metrics          │
│  • Species Richness: S                                 │
│  • Shannon-Wiener Diversity: H' = -∑ p_i * ln(p_i)     │
│  • Simpson's Dominance: D = ∑ p_i^2                    │
│  • Gini-Simpson Index: 1 - D                           │
│  • Pielou's Evenness: J' = H' / ln(S)                  │
└────────────────────────────────────────────────────────┘
│
▼
┌────────────────────────────────────────────────────────┐
│  Phase 3: Beta-Diversity (Cross-Sample Dissimilarity)  │
│  • Bray-Curtis: BC_jk = (∑|n_ij - n_ik|) / (N_j + N_k) │
│  • Jaccard Dissimilarity: J_dissim = (b + c)/(a + b + c)│
└────────────────────────────────────────────────────────┘
│
▼
┌────────────────────────────────────────────────────────┐
│  Phase 4: ML Classifier Reliability & Novelty Metrics  │
│  • Expected Calibration Error (ECE)                    │
│  • Over-Classification Error Rate (E_over)             │
│  • Open-Set AUROC / Novelty Scoring                    │
└────────────────────────────────────────────────────────┘

```

### Phase 1: Data Filtering & Relative Abundance Transformation

Raw sequencing libraries contain low-abundance stochastic artifacts, primer dimers, and index misassignments. Before calculating community indices, read distributions must be filtered and converted to relative abundances.

#### 1. Low-Abundance Noise Thresholding
Reads that fall below an operational relative abundance threshold tau (typically set to tau = 0.001, or 0.1%) within a library are treated as PCR noise and set to zero:

$$\tilde{n}_i = \begin{cases} n_i & \text{if } \frac{n_i}{N} \ge \tau \\ 0 & \text{if } \frac{n_i}{N} < \tau \end{cases}$$

Where:
* n_i is the raw sequence read count assigned to taxon or ASV i.
* N = sum(n_k) is the total sequencing depth of the sample across all M raw assigned entities.
* tau is the noise-floor filter parameter (0.1%).

#### 2. Relative Abundance Calculation (p_i)
Following noise suppression, the retained reads are re-normalized into an abundance vector p:

$$p_i = \frac{\tilde{n}_i}{\sum_{k=1}^{S} \tilde{n}_k}$$

Where:
* p_i represents the proportion of sequencing reads attributed to taxon i.
* S is the total number of distinct taxa with non-zero counts remaining after filtering.
* The vector satisfies the probability simplex condition: sum(p_i) = 1.0, with p_i > 0 for all retained entities.

### Phase 2: Alpha-Diversity Formulations (Alpha-Diversity)

Alpha diversity measures the biological variety, dominance, and structural distribution within a single local sample site.

#### 1. Species Richness (S)
* **Mathematical Definition:**
  $$S = \sum_{i=1}^{M} \mathbb{I}(p_i > 0)$$
  (where I is the indicator function that outputs 1 if true, and 0 otherwise).
* **Technical Meaning:** The absolute count of distinct taxonomic entities detected in the sample with sequencing depth above the noise threshold.
* **Ecological Interpretation:** Provides a baseline measure of community composition. High richness points to a biologically populated habitat; depressed richness indicates degraded, chemically stressed, or highly disturbed environments.

#### 2. Shannon-Wiener Diversity Index (H')
* **Mathematical Definition:**
  $$H' = -\sum_{i=1}^{S} p_i \ln(p_i)$$
  (with the convention that p_i * ln(p_i) -> 0 as p_i -> 0).
* **Technical Meaning:** An information-theoretic measure of entropy. It quantifies the level of uncertainty in predicting the taxonomic identity of an arbitrary read picked at random from the sample library.
* **Ecological Interpretation:**
  * Accounts for both the number of species and how evenly their reads are distributed.
  * Typical environmental values fall in the range of 1.5 to 3.5.
  * Values > 3.0 indicate high ecological complexity and a well-balanced community.
  * Values < 1.5 reflect an ecosystem under ecological pressure, experiencing low richness or severe single-species dominance.

#### 3. Simpson’s Dominance Index (D) & Gini-Simpson Index (1 - D)
* **Mathematical Definitions:**
  $$\text{Simpson's Index: } D = \sum_{i=1}^{S} p_i^2$$
  $$\text{Gini-Simpson Index: } 1 - D = 1 - \sum_{i=1}^{S} p_i^2$$
* **Technical Meaning:** 
  * D calculates the probability that two randomly selected eDNA reads from the library belong to the exact same species.
  * 1 - D calculates the complementary probability that two randomly selected reads belong to two entirely different species.
* **Ecological Interpretation:**
  * D -> 1.0 (or 1 - D -> 0.0): High dominance. A small number of opportunistic, invasive, or blooming species account for the majority of the recovered eDNA pool.
  * 1 - D -> 1.0: High diversity. Read recovery is distributed across multiple taxa, indicating an ecosystem where no single organism dominates the molecular signal.

#### 4. Pielou’s Evenness Index (J')
* **Mathematical Definition:**
  $$J' = \frac{H'}{\ln(S)}$$
  (Defined for communities where S > 1. If S = 1, J' = 1.0).
* **Technical Meaning:** Constrains and normalizes observed Shannon diversity H' against theoretical maximum diversity (H'_max = ln(S)).
* **Ecological Interpretation:**
  * Strictly bounded on the interval: 0.0 <= J' <= 1.0.
  * J' approx 1.0: Complete equitability. The community is evenly balanced.
  * J' < 0.5: Severe community skew. A few dominant taxa monopolize the sequencing profile.

### Phase 3: Beta-Diversity Formulations (Beta-Diversity)

Beta diversity evaluates the degree of compositional turnover or dissimilarity between two distinct spatial sampling sites or along a temporal monitoring timeline (comparing Sample j to Sample k).

#### 1. Bray-Curtis Dissimilarity (BC_jk)
* **Mathematical Definition:**
  $$BC_{jk} = \frac{\sum_{i=1}^{S} |n_{ij} - n_{ik}|}{\sum_{i=1}^{S} (n_{ij} + n_{ik})}$$
* **Technical Meaning:** Non-Euclidean metric measuring quantitative dissimilarity in community composition based on relative read abundance profiles across shared and unique taxa.
* **Ecological Interpretation:**
  * Bounded between 0.0 and 1.0.
  * BC_jk = 0.0: Identical composition.
  * BC_jk = 1.0: Completely disjoint communities with zero shared species.

#### 2. Jaccard Dissimilarity (J_dissim)
* **Mathematical Definition:**
  $$J_{\text{dissim}} = \frac{b + c}{a + b + c}$$
  Where a is shared species, b is unique to Sample j, and c is unique to Sample k.
* **Technical Meaning:** Presence/absence dissimilarity metric calculated over species occupancy.
* **Ecological Interpretation:** Evaluates physical turnover of species identities between two habitats independent of amplification bias.

### Phase 4: Machine Learning Classifier Reliability & Novelty Metrics

Evaluates how reliably the taxonomic classifier handles unseen lineages and calibrates its prediction probabilities.

#### 1. Expected Calibration Error (ECE)
Evaluates whether the posterior probability output by the classifier accurately reflects real-world classification correctness:

$$\text{ECE} = \sum_{m=1}^{M} \frac{|B_m|}{N_{\text{eval}}} \left| \text{acc}(B_m) - \text{conf}(B_m) \right|$$

Where:
* Confidence range [0, 1] is partitioned into M bins B_1, ..., B_M.
* |B_m| is the count of predictions falling in bin B_m.
* N_eval is total evaluated test sequences.
* acc(B_m) is empirical accuracy of bin B_m.
* conf(B_m) is mean confidence score of bin B_m.
* Objective: ECE < 0.05.

#### 2. Over-Classification Error Rate (E_over)
Directly quantifies the rate at which the classifier forces an incorrect, specific assignment onto an uncharacterized sequence instead of backing off to an ancestral rank:

$$E_{\text{over}} = \frac{\sum_{i=1}^{N_{\text{novel}}} \mathbb{I}(\hat{y}_i \in \mathcal{Y}_{\text{known}})}{N_{\text{novel}}}$$

Where:
* N_novel is count of evaluated test sequences belonging to held-out clades.
* Y_known is the set of reference species labels in training data.
* y_hat_i is predicted label for sequence i.
* Objective: A calibrated classifier achieves E_over -> 0.0 by halting predictions at genus or family level when evaluating novel taxa.
