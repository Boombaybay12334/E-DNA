import { useState } from 'react';
import { IconCheck, IconDna, IconInfo, IconSample, IconShield } from './icons';

export function DocumentationView() {
  const [activeTab, setActiveTab] = useState<'sop' | 'markers' | 'regulatory' | 'qaqc'>('sop');

  return (
    <div className="doc-page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="platform-tag">
            <span>Methodology &amp; Standards</span>
          </div>
          <h1>Technical Documentation &amp; Sampling SOPs</h1>
          <p className="subtitle">
            Scientific guidelines, marker selection references, regulatory compliance frameworks, and clean-room quality protocols.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="doc-tabs-bar">
        <button
          type="button"
          className={`doc-tab-btn ${activeTab === 'sop' ? 'active' : ''}`}
          onClick={() => setActiveTab('sop')}
        >
          <IconSample size={15} /> Field Sampling SOPs
        </button>
        <button
          type="button"
          className={`doc-tab-btn ${activeTab === 'markers' ? 'active' : ''}`}
          onClick={() => setActiveTab('markers')}
        >
          <IconDna size={15} /> Primer &amp; Marker Guide
        </button>
        <button
          type="button"
          className={`doc-tab-btn ${activeTab === 'regulatory' ? 'active' : ''}`}
          onClick={() => setActiveTab('regulatory')}
        >
          <IconShield size={15} /> Regulatory Frameworks (EIA/CRZ/TNFD)
        </button>
        <button
          type="button"
          className={`doc-tab-btn ${activeTab === 'qaqc' ? 'active' : ''}`}
          onClick={() => setActiveTab('qaqc')}
        >
          <IconCheck size={15} /> Quality Assurance &amp; Blanks
        </button>
      </div>

      {/* Tab 1: Field SOPs */}
      {activeTab === 'sop' && (
        <div className="doc-content-card">
          <h2>Standard Operating Procedures: Environmental Sample Collection</h2>

          <div className="sop-block">
            <h3>A. Marine &amp; Estuarine Water Sampling (Sterivex Filtration)</h3>
            <ol>
              <li>
                <strong>Sterile Apparatus:</strong> Use a sterile 5.0 L Niskin bottle or peristaltic tubing. Decontaminate sampling equipment between stations using 10% bleach followed by DNA-free water rinse.
              </li>
              <li>
                <strong>Volume &amp; Filtration:</strong> Filter 1.0 to 5.0 L of seawater through a 0.22 µm Sterivex-GP polyethersulfone filter unit. Record exact volume and filtration duration.
              </li>
              <li>
                <strong>Preservation:</strong> Expel residual water with a sterile syringe. Fill the capsule with 2.0 mL of lysis buffer (Longmire’s or absolute ethanol) and cap both ends with sterile Luer locks. Store at −20 °C or ambient during field transit.
              </li>
              <li>
                <strong>Field Negative Control:</strong> Process 1.0 L of molecular-grade ultrapure water through the same filtration apparatus at every 10th station.
              </li>
            </ol>
          </div>

          <div className="sop-block">
            <h3>B. Coastal &amp; Port Sediment Core Sampling</h3>
            <ol>
              <li>
                <strong>Subsurface Coring:</strong> Collect surface sediment (top 0–2 cm) using a van Veen grab or sterile push corer.
              </li>
              <li>
                <strong>Homogenization:</strong> Using sterile nitrile gloves, transfer 50 g from the center of the grab (avoiding walls) into a sterile DNA-free Falcon tube.
              </li>
              <li>
                <strong>Chain of Custody:</strong> Flash freeze on dry ice immediately to prevent microbial degradation of extracellular eDNA.
              </li>
            </ol>
          </div>

          <div className="sop-block">
            <h3>C. Terrestrial &amp; Mine Overburden Soil Sampling</h3>
            <ol>
              <li>
                <strong>Core Composite:</strong> Take 5 sub-cores (0–10 cm depth) across a 5×5 m plot and pool into a composite sample.
              </li>
              <li>
                <strong>Root Removal:</strong> Coarse root fragments (&gt;2 mm) and gravel are sieved using ethanol-flamed stainless steel mesh.
              </li>
              <li>
                <strong>Storage:</strong> Freeze at −20 °C until bead-beating extraction with high-yield inhibitor removal columns.
              </li>
            </ol>
          </div>
        </div>
      )}

      {/* Tab 2: Markers */}
      {activeTab === 'markers' && (
        <div className="doc-content-card">
          <h2>Metabarcoding Markers &amp; Target Taxonomic Groups</h2>
          <table className="modern-table">
            <thead>
              <tr>
                <th>Marker Gene</th>
                <th>Target Phyla</th>
                <th>Primer Pair</th>
                <th>Amplicon Length</th>
                <th>Curated Reference DB</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>COI (Mitochondrial)</strong></td>
                <td>Marine fauna, crustaceans, molluscs, cnidarians</td>
                <td className="mono">mlCOIintF / jgHCO2198</td>
                <td className="mono">~313 bp</td>
                <td>MIDORI2 + BOLD Systems</td>
              </tr>
              <tr>
                <td><strong>12S rRNA (Mitochondrial)</strong></td>
                <td>Teleost fishes, marine mammals, elasmobranchs</td>
                <td className="mono">MiFish-U-F / MiFish-U-R</td>
                <td className="mono">~170 bp</td>
                <td>MitoFish + NCBI Taxonomy</td>
              </tr>
              <tr>
                <td><strong>18S rRNA V9</strong></td>
                <td>Benthic micro-eukaryotes, meiofauna, protists</td>
                <td className="mono">1389F / 1510R</td>
                <td className="mono">~130 bp</td>
                <td>PR2 v5.0 (Protist Reference)</td>
              </tr>
              <tr>
                <td><strong>16S rRNA V4</strong></td>
                <td>Prokaryotes (Bacteria &amp; Archaea)</td>
                <td className="mono">515F / 806R</td>
                <td className="mono">~290 bp</td>
                <td>SILVA 138.1 SSU</td>
              </tr>
              <tr>
                <td><strong>ITS2 (Nuclear)</strong></td>
                <td>Fungi, arbuscular mycorrhizae, soil pathogens</td>
                <td className="mono">ITS3_KYO2 / ITS4</td>
                <td className="mono">~350 bp</td>
                <td>UNITE v9 Fungal Reference</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Regulatory Frameworks */}
      {activeTab === 'regulatory' && (
        <div className="doc-content-card">
          <h2>Regulatory &amp; Statutory Compliance Guidance</h2>
          <div className="regulatory-cards">
            <div className="reg-card">
              <h3>MoEFCC EIA Notification (2006 &amp; Amendments)</h3>
              <p>
                eDNA surveys provide non-invasive, high-resolution species inventories required for Environmental Management Plans (EMP)
                and baseline seasonal data in port developments, coastal mining leases, and dredging approvals.
              </p>
            </div>
            <div className="reg-card">
              <h3>Coastal Regulation Zone (CRZ) Notification 2019</h3>
              <p>
                In ecologically sensitive zones (CRZ-I A: mangroves, corals, turtle nesting grounds), eDNA establishes presence of endangered
                taxa without destructive net trawling or bottom dredging.
              </p>
            </div>
            <div className="reg-card">
              <h3>IFC Performance Standard 6 (PS6)</h3>
              <p>
                Required by international lenders to evaluate Net Positive Impact (NPI) on biodiversity, Critical Habitat determinations,
                and priority conservation species monitoring.
              </p>
            </div>
            <div className="reg-card">
              <h3>Taskforce on Nature-related Financial Disclosures (TNFD)</h3>
              <p>
                Aligns corporate natural capital disclosures with quantitative, verifiable eDNA biodiversity metrics (Species Richness, Shannon Evenness, and Threatened Taxa detection).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: QA/QC */}
      {activeTab === 'qaqc' && (
        <div className="doc-content-card">
          <h2>Quality Assurance &amp; Negative Control Thresholds</h2>
          <p>
            To prevent false positives and audit cross-contamination, the platform tracks 3 categories of negative controls:
          </p>
          <ul className="qaqc-list">
            <li>
              <strong>Field Negative Blanks:</strong> Deionized water filtered in the field to identify environmental handling or aerosol cross-contamination.
            </li>
            <li>
              <strong>Extraction Blanks:</strong> Extraction buffers processed without sample input to monitor kit reagent sterility.
            </li>
            <li>
              <strong>PCR Negative Blanks:</strong> Molecular biology grade water added in place of DNA template during PCR amplification to verify master mix purity.
            </li>
          </ul>
          <p className="caveat">
            <IconInfo size={13} /> Any taxon detected in negative controls with reads exceeding 0.1% of sample depth is automatically flagged with the <span className="flag flag-IN_NEGATIVE_CONTROL">CTRL</span> indicator in results tables.
          </p>
        </div>
      )}
    </div>
  );
}

