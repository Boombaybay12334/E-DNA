# eDNA Explorer — Backend API

Backend foundation, persistent analysis run management, Contract v1.0 Result Architecture, and **Taxonomic Assignment & Threshold ($\tau$) Logic** for **eDNA Explorer**, a scientific web platform designed for 18S rRNA V4 environmental DNA amplicon validation, run tracking, and taxonomic classification.

---

## 1. Overview

The backend is built with **Python 3.12**, **FastAPI**, **Pydantic v2**, and **SQLAlchemy 2.0** with **SQLite**. It handles:
- **FASTA Ingestion:** Multipart file uploads (`.fasta`, `.fa`, `.fna`) with multiline parsing and CRLF normalization.
- **Sequence Validation:** IUPAC nucleotide compliance, ambiguous base detection, amplicon length checks (<200 bp warning for 18S V4), and duplicate ID detection.
- **Run Management & Persistence:** Persistent analysis run tracking in SQLite (`edna_explorer.db`), preserving sequence ordering via `order_index`.
- **Relational Integrity:** Foreign keys with cascade deletion (`ON DELETE CASCADE`) across runs, sequence records, errors, warnings, and classification results.
- **Contract v1.0 Result Architecture:** Full support for model-agnostic classification result payloads adhering strictly to `contract/result_schema.json`.
- **Taxonomic Assignment & Threshold ($\tau$) Logic (Phase 4):** Deterministic, pure service applying consecutive leading prefix assignment rules across dynamic rank lists under user-configured confidence thresholds $\tau \in [0.0, 1.0]$.
- **Dynamic Taxonomic Ranks:** Never hardcodes taxonomic ladders; respects the ordered root->leaf rank array supplied by the reference/model (e.g., PR2 eight-rank hierarchy).
- **Prefix Assignment Semantics:** Enforces monotonic taxonomic assignment prefixes, assigned depth matching, and status constraints (`assigned_full`, `assigned_partial`, `unassigned`, `invalid_input`).
- **Fixture Support with Scientific Disclaimers:** Serves `contract/example_result.json` explicitly flagged as synthetic illustrative data.
- **Safe Test Isolation:** In-memory SQLite with static connection pooling for tests, leaving local development databases untouched.
- **Interactive Documentation:** Swagger UI at `/docs` and ReDoc at `/redoc`.

> [!NOTE]
> **Scientific Integrity & ML Status (Phase 4):**
> This phase implements the assignment and thresholding service that processes candidate confidence scores. The machine learning classification model itself (Model A neural ensemble against PR2) has not yet been executed; this service operates on candidate predictions supplied as input and does not invent or hallucinate confidence scores, taxa, or species discoveries.

---

## 2. Directory Structure

```text
backend/
├── app/
│   ├── __init__.py               # Application package
│   ├── config.py                 # Settings (DATABASE_URL, CORS, upload limits)
│   ├── main.py                   # FastAPI app, lifespan DB init, CORS, routers
│   ├── database/
│   │   ├── __init__.py           # Database package exports
│   │   ├── connection.py         # SQLAlchemy engine, SessionLocal, get_db, init_db
│   │   ├── models.py             # ORM models: Run, SequenceRecord, RunError, RunWarning, ClassificationResult
│   │   └── repositories.py       # RunRepository with clean data access methods
│   ├── routes/
│   │   ├── __init__.py           # Router exports
│   │   ├── health.py             # GET /api/health and GET / probes
│   │   ├── upload.py             # POST /api/validate-fasta (stateless validation)
│   │   ├── runs.py               # REST endpoints for analysis runs
│   │   ├── results.py            # Contract v1.0 validation, fixture, and attachment
│   │   └── assignment.py         # [NEW Phase 4] Assignment & thresholding endpoints
│   ├── schemas/
│   │   ├── __init__.py           # Schema package exports
│   │   ├── sequence.py           # Biological sequence & QC schemas
│   │   ├── response.py           # Validation response models
│   │   ├── run.py                # Analysis run, sequence pagination, insights schemas
│   │   ├── result.py             # Contract v1.0 Pydantic result & validation schemas
│   │   └── assignment.py         # [NEW Phase 4] Candidate predictions and assignment schemas
│   └── services/
│       ├── __init__.py
│       ├── fasta_parser.py       # Robust streaming FASTA parser
│       ├── validation.py         # IUPAC & 18S V4 amplicon QC validator
│       ├── run_service.py        # Business logic coordinating validation & run persistence
│       ├── result_validator.py   # Semantic validator for Contract v1.0
│       ├── result_service.py     # Service handling result validation & fixtures
│       └── assignment_service.py # [NEW Phase 4] Consecutive prefix assignment & threshold logic
├── tests/
│   ├── __init__.py
│   ├── conftest.py               # In-memory SQLite DB fixtures & TestClient
│   ├── test_health.py            # Health & root route tests (2 tests)
│   ├── test_fasta_parser.py      # Unit tests for multiline & CRLF parsing (6 tests)
│   ├── test_validation.py        # Unit tests for IUPAC and QC flags (7 tests)
│   ├── test_upload_endpoint.py   # Integration tests for /api/validate-fasta (6 tests)
│   ├── test_runs_endpoints.py    # Integration tests for /api/runs and lifecycle (9 tests)
│   ├── test_results.py           # Contract v1.0 semantic & persistence tests (13 tests)
│   └── test_assignment.py        # [NEW Phase 4] Assignment algorithm & threshold tests (14 tests)
├── .env                          # Local environment configuration
├── .env.example                  # Template environment variables
├── edna_explorer.db              # SQLite database (auto-created on startup, git-ignored)
├── requirements.txt              # Python dependencies (FastAPI, SQLAlchemy, etc.)
└── README.md                     # Complete backend documentation
```

---

## 3. The Taxonomic Assignment Algorithm

The assignment logic is implemented in `TaxonomicAssignmentService` (`app/services/assignment_service.py`). It adheres strictly to the scientific rules established in the handoff document and Contract v1.0.

### 3.1 Consecutive Leading Prefix Rule
Taxonomic classification is tree-structured: assigning a deeper rank (e.g., *Genus*) is scientifically meaningless if an ancestral rank (e.g., *Division* or *Class*) cannot be assigned with high confidence.

1. **Root-to-Leaf Traversal:**
   The algorithm evaluates ranks in exact root-to-leaf order: $r_0, r_1, \dots, r_{k-1}$.
2. **Assignment Condition:**
   A rank $r_i$ is assigned (`assigned = true`) if and only if:
   - All predecessor ranks $r_0, \dots, r_{i-1}$ were successfully assigned.
   - The candidate taxon name is present and non-empty.
   - The candidate confidence score is present and $c_i \ge \tau$.
3. **Monotonic Stop:**
   The moment any rank fails the threshold, has a null taxon, or lacks confidence, **assignment immediately halts**.
   - No deeper rank may be assigned after an earlier failure, **even if its confidence is 1.0 or higher than tau**.
   - All subsequent ranks are marked `assigned = false`.

### 3.2 Resolution Status Definitions

| Status | Condition | Meaning |
| :--- | :--- | :--- |
| `assigned_full` | $\text{assigned\_depth} == \text{len}(ranks)$ | The query sequence was resolved with confidence $\ge \tau$ across every rank from root to leaf. |
| `assigned_partial` | $0 < \text{assigned\_depth} < \text{len}(ranks)$ | The sequence was resolved through an intermediate rank. Deeper calls failed $\tau$ or were unavailable. *(Never interpreted as novel species or discovery)*. |
| `unassigned` | $\text{assigned\_depth} == 0$ | Valid sequence input, but root rank confidence failed $\tau$ or no prediction was available. |
| `invalid_input` | $\text{assigned\_depth} == 0$ | Sequence failed input validation (e.g. non-nucleotide characters, truncated amplicon). |

### 3.3 Confidence Threshold ($\tau$) Handling
- $\tau$ is strictly constrained to the range $[0.0, 1.0]$.
- The value $\tau=0.60$ in the example fixture is **illustrative only** and is not scientifically finalized.
- $\tau$ can be dynamically supplied per batch or reapplied to existing datasets without re-running model inference.

---

## 4. API Reference & Endpoints

### 4.1 Taxonomic Assignment Endpoints (Phase 4)

#### 1. Apply Threshold to Candidate Predictions
- **Endpoint:** `POST /api/assignment/apply-threshold`
- **Content-Type:** `application/json`
- **Status Codes:** `200 OK`, `400 Bad Request`
- **Example cURL:**
  ```bash
  curl -X POST "http://127.0.0.1:8000/api/assignment/apply-threshold" \
    -H "Content-Type: application/json" \
    -d '{
      "threshold_tau": 0.70,
      "ranks": ["domain", "supergroup", "division", "subdivision", "class", "order", "family", "genus"],
      "sequences": [
        {
          "id": "ASV_0001",
          "length": 380,
          "predictions": [
            {"rank": "domain", "taxon": "Eukaryota", "confidence": 1.0},
            {"rank": "supergroup", "taxon": "TSAR", "confidence": 0.99},
            {"rank": "division", "taxon": "Alveolata", "confidence": 0.96},
            {"rank": "subdivision", "taxon": "Ciliophora", "confidence": 0.90},
            {"rank": "class", "taxon": "Oligohymenophorea", "confidence": 0.65},
            {"rank": "order", "taxon": "Peniculida", "confidence": 0.40},
            {"rank": "family", "taxon": "Parameciidae", "confidence": 0.20},
            {"rank": "genus", "taxon": "Paramecium", "confidence": 0.10}
          ]
        }
      ]
    }'
  ```
- **Example Response (`200 OK`):**
  ```json
  {
    "threshold_tau": 0.7,
    "ranks": ["domain", "supergroup", "division", "subdivision", "class", "order", "family", "genus"],
    "sequence_count": 1,
    "sequences": [
      {
        "id": "ASV_0001",
        "length": 380,
        "status": "assigned_partial",
        "assigned_depth": 4,
        "deepest_rank": "subdivision",
        "deepest_taxon": "Ciliophora",
        "lineage": [
          {"rank": "domain", "taxon": "Eukaryota", "confidence": 1.0, "assigned": true},
          {"rank": "supergroup", "taxon": "TSAR", "confidence": 0.99, "assigned": true},
          {"rank": "division", "taxon": "Alveolata", "confidence": 0.96, "assigned": true},
          {"rank": "subdivision", "taxon": "Ciliophora", "confidence": 0.90, "assigned": true},
          {"rank": "class", "taxon": "Oligohymenophorea", "confidence": 0.65, "assigned": false},
          {"rank": "order", "taxon": "Peniculida", "confidence": 0.40, "assigned": false},
          {"rank": "family", "taxon": "Parameciidae", "confidence": 0.20, "assigned": false},
          {"rank": "genus", "taxon": "Paramecium", "confidence": 0.10, "assigned": false}
        ],
        "warnings": [],
        "extras": null
      }
    ],
    "summary": {
      "n_sequences": 1,
      "n_by_status": {"assigned_partial": 1},
      "n_by_deepest_rank": {"subdivision": 1}
    },
    "payload": { ... }
  }
  ```

#### 2. Reapply Threshold to Result Payload
- **Endpoint:** `POST /api/assignment/reapply-threshold`
- **Content-Type:** `application/json`
- **Body:** `{ "threshold_tau": 0.95, "payload": { ... } }`
- **Status Codes:** `200 OK`, `400 Bad Request`

#### 3. Reapply Threshold to Saved Analysis Run
- **Endpoint:** `POST /api/runs/{run_id}/reapply-threshold`
- **Content-Type:** `application/json`
- **Body:** `{ "threshold_tau": 0.85 }`
- **Status Codes:** `200 OK`, `404 Not Found`

---

### 4.2 Other Endpoints
- **Health:** `GET /api/health`
- **FASTA Validation:** `POST /api/validate-fasta`
- **Analysis Runs:** `POST /api/runs`, `GET /api/runs`, `GET /api/runs/{run_id}`, `GET /api/runs/{run_id}/sequences`, `GET /api/runs/{run_id}/insights`, `DELETE /api/runs/{run_id}`
- **Classification Results:** `POST /api/results/validate`, `GET /api/results/fixture`, `POST /api/runs/{run_id}/results`, `GET /api/runs/{run_id}/results`

---

## 5. Running the Test Suite

Run the full pytest suite:

```powershell
$env:PYTHONPATH="backend"
python -m pytest backend/tests -v
```

All 57 unit and integration tests pass:
- **`test_fasta_parser.py` (6 tests):** Validates single/multiline sequences, CRLF normalisation, header splitting.
- **`test_health.py` (2 tests):** Validates service probes.
- **`test_validation.py` (7 tests):** Validates IUPAC characters, length threshold warnings, and duplicate sequence headers.
- **`test_upload_endpoint.py` (6 tests):** Validates `/api/validate-fasta` response formats and error states.
- **`test_runs_endpoints.py` (9 tests):** Validates run creation, sequence order preservation, pagination, detail retrieval, insights generation, and cascading deletion.
- **`test_results.py` (13 tests):** Validates Contract v1.0 schemas, dynamic rank validation, monotonic assignments, status rules, confidence cutoffs, synthetic fixture retrieval, and run attachment lifecycle.
- **`test_assignment.py` (14 tests):** Validates $\tau$ boundary conditions ($0.0$, $1.0$), confidence strictly equal to / just below / above $\tau$, root rank failure, monotonic stop rule preventing deeper assignments, null taxa, missing confidences, dynamic custom rank ladders, invalid input flags, batch assignment contract verification, and threshold reapplication on payloads and SQLite runs.
