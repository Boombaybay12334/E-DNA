import React, { useState, useRef, useMemo } from 'react';
import type { ClassificationResult, SequenceRecord, LineageEntry, ClassificationStatus } from '../../types/contract';
import { parseFasta, validateFastaSequences, SAMPLE_18S_V4_FASTA, type ParsedSequence } from '../../lib/fasta';
import { calculateAssignedDepth } from '../../lib/threshold';
import {
  IconUploadCloud,
  IconFileText,
  IconAlertTriangle,
  IconPlay,
  IconSliders,
  IconDna,
  IconSparkles,
  IconRefresh,
  IconInfo,
} from '../common/icons';

interface UploadViewProps {
  onRunCreated: (newRun: ClassificationResult) => void;
  defaultTau: number;
}

export const UploadView: React.FC<UploadViewProps> = ({ onRunCreated, defaultTau }) => {
  const [fastaContent, setFastaContent] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [tau, setTau] = useState(defaultTau);
  const [selectedMarker, setSelectedMarker] = useState('18S_V4');
  const [isDragging, setIsDragging] = useState(false);

  // Analysis simulation state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse and validate currently loaded FASTA
  const parsedSequences = useMemo(() => {
    if (!fastaContent.trim()) return [];
    return parseFasta(fastaContent);
  }, [fastaContent]);

  const validationResults: ParsedSequence[] = useMemo(() => {
    if (parsedSequences.length === 0) return [];
    return validateFastaSequences(parsedSequences);
  }, [parsedSequences]);

  // Summary stats
  const totalParsed = parsedSequences.length;
  const warningsCount = validationResults.reduce((acc: number, v: ParsedSequence) => acc + v.warnings.length, 0);
  const errorsCount = validationResults.reduce((acc: number, v: ParsedSequence) => acc + v.errors.length, 0);
  const avgLength = totalParsed > 0
    ? Math.round(parsedSequences.reduce((acc: number, s: { length: number }) => acc + s.length, 0) / totalParsed)
    : 0;

  const avgGc = totalParsed > 0
    ? (
        parsedSequences.reduce((acc: number, s: { sequence: string; length: number }) => {
          const gc = (s.sequence.match(/[GCgc]/g) || []).length;
          return acc + (gc / s.length);
        }, 0) / totalParsed * 100
      ).toFixed(1)
    : '0';

  const handleFileSelect = (file: File) => {
    setFileName(file.name);
    setFileSize((file.size / 1024).toFixed(1) + ' KB');
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = (e.target?.result as string) || '';
      setFastaContent(content);
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleLoadSampleData = () => {
    setFileName('sample_18S_V4_eukaryotes.fasta (DEMO DATA)');
    setFileSize('14.2 KB');
    setFastaContent(SAMPLE_18S_V4_FASTA);
  };

  // Pipeline simulation stages
  const pipelineSteps = [
    'Validating FASTA headers & sequence chemistry...',
    'Extracting 18S V4 neural embeddings (Model A ensemble)...',
    'Calibrating against PR2 v5.0.0 reference database...',
    `Applying consecutive assignment rule at cutoff \u03c4 = ${tau.toFixed(2)}...`,
    'Synthesizing Contract JSON v1.0 payload...',
  ];

  const handleStartAnalysis = () => {
    if (totalParsed === 0 || errorsCount > 0) return;

    setIsProcessing(true);
    setProcessStep(0);

    const stepInterval = setInterval(() => {
      setProcessStep((prev) => {
        if (prev < pipelineSteps.length - 1) {
          return prev + 1;
        } else {
          clearInterval(stepInterval);
          setTimeout(() => {
            finishAnalysis();
          }, 600);
          return prev;
        }
      });
    }, 550);
  };

  const finishAnalysis = () => {
    const ranks = [
      'domain',
      'supergroup',
      'division',
      'subdivision',
      'class',
      'order',
      'family',
      'genus',
    ];

    // Build realistic taxonomic records based on validation
    const sequences: SequenceRecord[] = validationResults.map((v: ParsedSequence, i: number) => {
      const hasLengthError = v.warnings.includes('length_below_200');
      const hasNonAcgt = v.warnings.some((w: string) => w.includes('non_acgt'));

      if (hasLengthError || hasNonAcgt) {
        return {
          id: v.id,
          length: v.length,
          status: 'invalid_input' as ClassificationStatus,
          assigned_depth: 0,
          deepest_rank: null,
          deepest_taxon: null,
          lineage: ranks.map(r => ({ rank: r, taxon: null, confidence: null, assigned: false })),
          warnings: v.warnings,
          sequence_str: parsedSequences[i]?.sequence,
        };
      }

      // Assign varying depths for realistic demo simulation
      let depth = 8;
      if (i % 5 === 0) depth = 8; // genus
      else if (i % 5 === 1) depth = 7; // family
      else if (i % 5 === 2) depth = 6; // order
      else if (i % 5 === 3) depth = 4; // subdivision
      else if (i % 5 === 4) depth = 0; // unassigned

      // Confidences descending
      const confidences = [1.0, 0.99, 0.97, 0.94, 0.88, 0.82, 0.74, 0.65];
      if (depth < 8) {
        confidences[depth] = Math.max(0.15, tau - 0.08);
        for (let k = depth + 1; k < 8; k++) {
          confidences[k] = 0.2 + (k * 0.05); // higher but invalidated by rule!
        }
      }

      const mockTaxa = [
        'Eukaryota',
        i % 2 === 0 ? 'TSAR' : 'Amorphea',
        i % 2 === 0 ? 'Alveolata' : 'Opisthokonta',
        i % 2 === 0 ? 'Dinoflagellata' : 'Fungi',
        i % 2 === 0 ? 'Dinophyceae' : 'Ascomycota',
        i % 2 === 0 ? 'Gymnodiniales' : 'Saccharomycetales',
        i % 2 === 0 ? 'Gymnodiniaceae' : 'Saccharomycetaceae',
        i % 2 === 0 ? 'Gyrodinium' : 'Candida',
      ];

      const lineage: LineageEntry[] = ranks.map((r, rIdx) => {
        const conf = depth === 0 && rIdx === 0 ? Math.max(0.1, tau - 0.15) : confidences[rIdx];
        return {
          rank: r,
          taxon: mockTaxa[rIdx],
          confidence: conf,
          assigned: false,
        };
      });

      const actualDepth = calculateAssignedDepth(lineage, tau);
      const updatedLineage = lineage.map((l, lIdx) => ({
        ...l,
        assigned: lIdx < actualDepth,
      }));

      const status: ClassificationStatus =
        actualDepth === 8 ? 'assigned_full' : actualDepth > 0 ? 'assigned_partial' : 'unassigned';

      return {
        id: v.id,
        length: v.length,
        status,
        assigned_depth: actualDepth,
        deepest_rank: actualDepth > 0 ? ranks[actualDepth - 1] : null,
        deepest_taxon: actualDepth > 0 ? updatedLineage[actualDepth - 1].taxon : null,
        lineage: updatedLineage,
        warnings: v.warnings,
        sequence_str: parsedSequences[i]?.sequence,
      };
    });

    const runId = `user-analysis-${new Date().toISOString().slice(0, 10)}-${Math.floor(Math.random() * 900 + 100)}`;

    const n_by_status: Record<string, number> = {
      assigned_full: sequences.filter(s => s.status === 'assigned_full').length,
      assigned_partial: sequences.filter(s => s.status === 'assigned_partial').length,
      unassigned: sequences.filter(s => s.status === 'unassigned').length,
      invalid_input: sequences.filter(s => s.status === 'invalid_input').length,
    };

    const n_by_deepest_rank: Record<string, number> = {};
    for (const r of [...ranks, 'unassigned']) {
      n_by_deepest_rank[r] = sequences.filter(s => (s.deepest_rank === r) || (r === 'unassigned' && s.status === 'unassigned')).length;
    }

    const newRun: ClassificationResult = {
      contract_version: '1.0',
      run: {
        run_id: runId,
        created_utc: new Date().toISOString(),
        model: {
          name: 'modelA_reg_ens5',
          version: '0.1-calibrated',
          code_commit: 'b82e14a',
        },
        reference: {
          name: 'PR2',
          version: '5.0.0',
          subset: '18S V4, 99% clustered',
        },
        marker: {
          gene: '18S rRNA',
          region: 'V4',
        },
        ranks,
        threshold: {
          tau,
          rule: 'assigned_depth = number of leading ranks (from the root) whose confidence >= tau',
        },
        confidence_semantics: 'calibrated estimate of accuracy learned on simulated PR2 clade holdouts; not comparable across models',
      },
      sequences,
      summary: {
        n_sequences: sequences.length,
        n_by_status,
        n_by_deepest_rank,
      },
    };

    setIsProcessing(false);
    onRunCreated(newRun);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Workflow Step Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-white p-2 rounded-2xl border border-slate-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.03)] text-xs">
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 font-semibold">
          <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center font-mono text-[10px]">1</span>
          <span>Upload FASTA</span>
        </div>
        <div className={`flex items-center gap-2.5 p-3 rounded-xl transition-colors ${
          totalParsed > 0 ? 'bg-teal-50/60 border border-teal-200 text-teal-900 font-semibold' : 'bg-slate-50 text-slate-400'
        }`}>
          <span className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] ${
            totalParsed > 0 ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-500'
          }`}>2</span>
          <span>Client Validation</span>
        </div>
        <div className={`flex items-center gap-2.5 p-3 rounded-xl transition-colors ${
          totalParsed > 0 && errorsCount === 0 ? 'bg-teal-50/60 border border-teal-200 text-teal-900 font-semibold' : 'bg-slate-50 text-slate-400'
        }`}>
          <span className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] ${
            totalParsed > 0 && errorsCount === 0 ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-500'
          }`}>3</span>
          <span>Run 18S Classifier</span>
        </div>
      </div>

      {/* Main Upload Dropzone Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <IconUploadCloud className="w-5 h-5 text-teal-600" />
              <span>Select or Drop 18S FASTA File</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Strictly for eukaryotic 18S V4 representative sequences (ASVs/OTUs) with primers trimmed
            </p>
          </div>

          <button
            onClick={handleLoadSampleData}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-teal-900 bg-teal-50 border border-teal-200/90 rounded-xl hover:bg-teal-100 transition-colors shadow-2xs"
            title="Load standard 18S V4 test sequence library (DEMO DATA)"
          >
            <IconSparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>Load Sample 18S V4 FASTA (DEMO DATA)</span>
          </button>
        </div>

        {/* Dropzone Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-teal-500 bg-teal-50/60 shadow-inner'
              : 'border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".fasta,.fa,.fna"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileSelect(e.target.files[0]);
              }
            }}
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center gap-2.5">
            <div className="p-3 bg-white rounded-2xl shadow-xs border border-slate-200 text-teal-600">
              <IconUploadCloud className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">
                Drag and drop your FASTA file here, or{' '}
                <span className="text-teal-600 underline">browse files</span>
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Supported formats: <span className="font-mono">.fasta</span>, <span className="font-mono">.fa</span>, <span className="font-mono">.fna</span> (header tokens parsed per Contract schema)
              </p>
            </div>
          </div>
        </div>

        {/* File Loaded Pill */}
        {fileName && (
          <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <div className="flex items-center gap-2.5">
              <IconFileText className="w-4 h-4 text-teal-600" />
              <div>
                <span className="font-bold text-slate-800 font-mono">{fileName}</span>
                <span className="text-slate-400 ml-2 font-mono">({fileSize})</span>
                <span className="text-teal-700 ml-2 font-semibold">[{totalParsed} sequences parsed]</span>
              </div>
            </div>
            <button
              onClick={() => {
                setFastaContent('');
                setFileName(null);
                setFileSize(null);
              }}
              className="text-xs font-semibold text-rose-600 hover:text-rose-800 transition-colors"
            >
              Clear file
            </button>
          </div>
        )}
      </div>

      {/* QC & Validation Summary Card */}
      {totalParsed > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <IconDna className="w-4 h-4 text-teal-600" />
              <span>Client-Side Sequence Validation Summary</span>
            </h3>
            <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg">
              {totalParsed} Records Detected
            </span>
          </div>

          {/* Metric cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-400 block text-[11px] uppercase font-mono">Valid Pass</span>
              <span className="text-xl font-bold text-emerald-700 font-mono">
                {validationResults.filter((v: ParsedSequence) => v.isValid && v.warnings.length === 0).length}
              </span>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-400 block text-[11px] uppercase font-mono">QC Flags</span>
              <span className="text-xl font-bold text-amber-700 font-mono">{warningsCount}</span>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-400 block text-[11px] uppercase font-mono">Mean Length</span>
              <span className="text-xl font-bold text-slate-800 font-mono">{avgLength} bp</span>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-400 block text-[11px] uppercase font-mono">Mean GC%</span>
              <span className="text-xl font-bold text-teal-800 font-mono">{avgGc}%</span>
            </div>
          </div>

          {/* Validation Observations */}
          {warningsCount > 0 && (
            <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-amber-950">
                <IconAlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Pre-Inference Quality Observations</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-amber-900">
                {validationResults
                  .filter((v: ParsedSequence) => v.warnings.length > 0)
                  .slice(0, 5)
                  .map((v: ParsedSequence) => (
                    <li key={v.id}>
                      <span className="font-mono font-bold text-amber-950">{v.id}:</span>{' '}
                      {v.warnings.join(', ')}
                    </li>
                  ))}
                {validationResults.filter((v: ParsedSequence) => v.warnings.length > 0).length > 5 && (
                  <li className="text-amber-700 italic">
                    ...and {validationResults.filter((v: ParsedSequence) => v.warnings.length > 0).length - 5} additional flagged sequences.
                  </li>
                )}
              </ul>
            </div>
          )}

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 flex items-start gap-2">
            <IconInfo className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <p>
              <strong>Note:</strong> Frontend validation verifies syntax formatting, character legality, and basic length constraints. Full biological verification and taxonomic classification occur during neural inference.
            </p>
          </div>
        </div>
      )}

      {/* Model & Classification Parameters Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-5">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <IconSliders className="w-4 h-4 text-teal-600" />
          <span>Classification Pipeline Parameters</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Marker Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Marker & Region Specification
            </label>
            <select
              value={selectedMarker}
              onChange={(e) => setSelectedMarker(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-medium focus:outline-none cursor-pointer"
            >
              <option value="18S_V4">18S rRNA — V4 Region (Eukaryotes) [Supported]</option>
              <option value="16S" disabled>16S rRNA (Prokaryotes) — [Unsupported Marker]</option>
              <option value="COI" disabled>COI (Metazoa) — [Unsupported Marker]</option>
              <option value="ITS" disabled>ITS (Fungi) — [Unsupported Marker]</option>
              <option value="12S" disabled>12S (Fish/Vertebrates) — [Unsupported Marker]</option>
            </select>
            <p className="text-[11px] text-slate-400">
              Only eukaryotic 18S V4 amplicons are evaluated by Model A. Other markers are not supported.
            </p>
          </div>

          {/* Reference Database */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Reference Taxonomy Database
            </label>
            <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <IconDna className="w-4 h-4 text-indigo-600" />
              <div className="font-semibold text-slate-800">PR2 (Protist Ribosomal Reference) v5.0.0</div>
            </div>
            <p className="text-[11px] text-slate-400">
              Curated eukaryotic reference taxonomy clustered at 99% similarity.
            </p>
          </div>
        </div>

        {/* Operating Threshold Tau */}
        <div className="pt-4 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <span>Operating Confidence Threshold (&tau;):</span>
              <span className="font-mono text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 font-bold">
                {tau.toFixed(2)}
              </span>
            </label>
            <span className="text-[11px] text-slate-400">Can be dynamically adjusted on Results & Insights views</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-400">0.10</span>
            <input
              type="range"
              min="0.10"
              max="0.99"
              step="0.01"
              value={tau}
              onChange={(e) => setTau(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
            />
            <span className="text-xs font-mono text-slate-400">0.99</span>
          </div>

          <p className="text-[11px] text-slate-500">
            Controls how confident a classification must be before it is accepted. Higher values are more strict and may result in classifications stopping at higher taxonomic ranks. Default baseline is 0.60.
          </p>
        </div>
      </div>

      {/* Execution Action & Progress Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-4">
        {isProcessing ? (
          <div className="py-6 space-y-4 text-center">
            <div className="flex items-center justify-center">
              <IconRefresh className="w-8 h-8 text-teal-600 animate-spin" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">Running 18S Classifier Pipeline...</h4>
              <p className="text-xs text-teal-700 font-mono mt-1">
                {pipelineSteps[processStep]}
              </p>
            </div>
            <div className="max-w-md mx-auto w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-600 transition-all duration-300"
                style={{ width: `${((processStep + 1) / pipelineSteps.length) * 100}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="text-xs text-slate-500">
              {totalParsed === 0 ? (
                <span>Please upload or load a sample FASTA file to begin classification.</span>
              ) : (
                <span>Ready to classify {totalParsed} sequence records at &tau; = {tau.toFixed(2)}.</span>
              )}
            </div>

            <button
              onClick={handleStartAnalysis}
              disabled={totalParsed === 0 || errorsCount > 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-teal-600 rounded-xl hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs hover:shadow-sm"
            >
              <IconPlay className="w-4 h-4 fill-current" />
              <span>Run 18S Classification</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
