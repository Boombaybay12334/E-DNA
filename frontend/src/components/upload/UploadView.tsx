import React, { useState, useRef } from 'react';
import type { ClassificationResult } from '../../types/contract';
import { SAMPLE_18S_V4_FASTA } from '../../lib/fasta';
import {
  validateFastaFile,
  createAnalysisRun,
  fetchRunSequences,
  createUnclassifiedResultFromRun,
  type ValidateFastaResponse,
} from '../../lib/api';
import {
  IconUploadCloud,
  IconFileText,
  IconAlertTriangle,
  IconSliders,
  IconDna,
  IconSparkles,
  IconRefresh,
  IconRefreshCw,
  IconInfo,
  IconCheckCircle,
  IconXCircle,
  IconCheck,
} from '../common/icons';

interface UploadViewProps {
  onRunCreated?: (newRun: ClassificationResult) => void;
  defaultTau: number;
}

export const UploadView: React.FC<UploadViewProps> = ({ onRunCreated, defaultTau }) => {
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [tau, setTau] = useState(defaultTau);
  const [selectedMarker, setSelectedMarker] = useState('18S_V4');
  const [isDragging, setIsDragging] = useState(false);

  // API communication and validation states
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [isCreatingRun, setIsCreatingRun] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [validationResponse, setValidationResponse] = useState<ValidateFastaResponse | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validate file with FastAPI backend
  const handleFileProcess = async (file: File) => {
    // Validate extension client-side first
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.fasta', '.fa', '.fna'].includes(ext)) {
      setApiError(
        `Unsupported file extension '${ext}'. Allowed FASTA extensions are: .fasta, .fa, .fna.`
      );
      setValidationResponse(null);
      setCurrentFile(null);
      setFileName(file.name);
      setFileSize((file.size / 1024).toFixed(1) + ' KB');
      return;
    }

    setCurrentFile(file);
    setFileName(file.name);
    setFileSize((file.size / 1024).toFixed(1) + ' KB');
    setApiError(null);
    setIsValidating(true);
    setValidationResponse(null);

    try {
      const response = await validateFastaFile(file);
      setValidationResponse(response);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to connect to the validation backend.';
      setApiError(msg);
      setValidationResponse(null);
    } finally {
      setIsValidating(false);
    }
  };

  const handleCreateRun = async () => {
    if (!currentFile || !validationResponse || validationResponse.validation_status !== 'valid') {
      return;
    }

    setIsCreatingRun(true);
    setApiError(null);

    try {
      // 1. Create persistent run in SQLite database via POST /api/runs
      const runDetail = await createAnalysisRun(currentFile, {
        threshold_tau: tau,
        reference_database: 'PR2 v5.0.0',
        marker_gene: '18S rRNA',
        marker_region: 'V4',
        target_group: 'eukaryotes',
      });

      // 2. Query persistent sequence records from GET /api/runs/{run_id}/sequences
      const seqsResponse = await fetchRunSequences(runDetail.run_id, 200, 0);
      const seqItems = seqsResponse.sequences || seqsResponse.items || [];

      // 3. Construct contract-compliant unclassified result representation
      const newResult = createUnclassifiedResultFromRun(runDetail, seqItems);

      if (onRunCreated) {
        onRunCreated(newResult);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to persist analysis run.';
      setApiError(msg);
    } finally {
      setIsCreatingRun(false);
    }
  };

  const handleClearFile = () => {
    setCurrentFile(null);
    setFileName(null);
    setFileSize(null);
    setValidationResponse(null);
    setApiError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isValidating) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isValidating) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleLoadSampleData = () => {
    if (isValidating) return;
    const blob = new Blob([SAMPLE_18S_V4_FASTA], { type: 'text/plain' });
    const sampleFile = new File([blob], 'sample_18S_V4_eukaryotes.fasta', { type: 'text/plain' });
    handleFileProcess(sampleFile);
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
          validationResponse
            ? validationResponse.validation_status === 'valid'
              ? 'bg-teal-50 border border-teal-200 text-teal-900 font-semibold'
              : 'bg-rose-50 border border-rose-200 text-rose-900 font-semibold'
            : isValidating
            ? 'bg-amber-50 border border-amber-200 text-amber-900 font-semibold animate-pulse'
            : 'bg-slate-50 text-slate-400'
        }`}>
          <span className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] ${
            validationResponse
              ? validationResponse.validation_status === 'valid'
                ? 'bg-teal-600 text-white'
                : 'bg-rose-600 text-white'
              : isValidating
              ? 'bg-amber-600 text-white'
              : 'bg-slate-200 text-slate-500'
          }`}>2</span>
          <span>
            {isValidating
              ? 'Validating with FastAPI...'
              : validationResponse
              ? validationResponse.validation_status === 'valid'
                ? 'Backend Validated'
                : 'Validation Rejected'
              : 'Backend Validation'}
          </span>
        </div>
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 text-slate-400">
          <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-mono text-[10px]">3</span>
          <span>Run 18S Classifier (Pending)</span>
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
            disabled={isValidating}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-teal-900 bg-teal-50 border border-teal-200/90 rounded-xl hover:bg-teal-100 disabled:opacity-50 transition-colors shadow-2xs"
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
          onClick={() => {
            if (!isValidating) {
              fileInputRef.current?.click();
            }
          }}
          className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
            isValidating
              ? 'border-amber-400 bg-amber-50/40 cursor-wait'
              : isDragging
              ? 'border-teal-500 bg-teal-50/60 shadow-inner cursor-pointer'
              : 'border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50 cursor-pointer'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".fasta,.fa,.fna"
            disabled={isValidating}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileProcess(e.target.files[0]);
              }
            }}
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center gap-2.5">
            <div className={`p-3 rounded-2xl shadow-xs border ${
              isValidating
                ? 'bg-amber-100 text-amber-700 border-amber-200 animate-spin'
                : 'bg-white text-teal-600 border-slate-200'
            }`}>
              {isValidating ? <IconRefresh className="w-6 h-6" /> : <IconUploadCloud className="w-6 h-6" />}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">
                {isValidating ? (
                  <span className="text-amber-800">Sending to FastAPI backend (/api/validate-fasta)...</span>
                ) : (
                  <>
                    Drag and drop your FASTA file here, or{' '}
                    <span className="text-teal-600 underline">browse files</span>
                  </>
                )}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Supported formats: <span className="font-mono">.fasta</span>, <span className="font-mono">.fa</span>, <span className="font-mono">.fna</span> (sent via multipart/form-data)
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
                {validationResponse && (
                  <span className={`ml-2 font-semibold ${
                    validationResponse.validation_status === 'valid' ? 'text-teal-700' : 'text-rose-700'
                  }`}>
                    [{validationResponse.total_sequences} sequences parsed by backend]
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={handleClearFile}
              disabled={isValidating}
              className="text-xs font-semibold text-rose-600 hover:text-rose-800 disabled:opacity-50 transition-colors"
            >
              Clear file
            </button>
          </div>
        )}

        {/* Backend Error Alert Banner */}
        {apiError && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1 text-rose-900 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 font-bold text-rose-950">
              <IconAlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Backend Communication / Validation Error</span>
            </div>
            <p className="leading-relaxed">{apiError}</p>
          </div>
        )}
      </div>

      {/* Backend Validation Summary Card */}
      {validationResponse && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <IconDna className="w-4 h-4 text-teal-600" />
              <span>FastAPI Backend Sequence Validation Summary</span>
            </h3>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-mono font-bold px-3 py-1 rounded-lg border ${
                validationResponse.validation_status === 'valid'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}>
                Status: {validationResponse.validation_status.toUpperCase()}
              </span>
              <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg">
                {validationResponse.total_sequences} Records Detected
              </span>
            </div>
          </div>

          {/* Metric cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-400 block text-[11px] uppercase font-mono">Valid Sequences</span>
              <span className="text-xl font-bold text-emerald-700 font-mono">
                {validationResponse.valid_sequences}
              </span>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-400 block text-[11px] uppercase font-mono">Invalid Sequences</span>
              <span className={`text-xl font-bold font-mono ${
                validationResponse.invalid_sequences > 0 ? 'text-rose-700' : 'text-slate-400'
              }`}>
                {validationResponse.invalid_sequences}
              </span>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-400 block text-[11px] uppercase font-mono">QC Warnings</span>
              <span className={`text-xl font-bold font-mono ${
                validationResponse.warnings.length > 0 ? 'text-amber-700' : 'text-slate-400'
              }`}>
                {validationResponse.warnings.length}
              </span>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-400 block text-[11px] uppercase font-mono">File Size</span>
              <span className="text-xl font-bold text-slate-800 font-mono">
                {(validationResponse.file_size_bytes / 1024).toFixed(1)} KB
              </span>
            </div>
          </div>

          {/* Validation Errors from Backend */}
          {validationResponse.errors.length > 0 && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-2 text-rose-900">
              <div className="flex items-center gap-1.5 font-bold text-rose-950">
                <IconXCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Validation Errors ({validationResponse.errors.length})</span>
              </div>
              <ul className="list-disc list-inside space-y-1">
                {validationResponse.errors.map((err, idx) => (
                  <li key={idx}>
                    {err.sequence_id && <span className="font-mono font-bold mr-1">{err.sequence_id}:</span>}
                    {err.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Validation Warnings / Observations from Backend */}
          {validationResponse.warnings.length > 0 && (
            <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-amber-950">
                <IconAlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Pre-Inference Quality Observations ({validationResponse.warnings.length})</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-amber-900">
                {validationResponse.warnings.slice(0, 6).map((w, idx) => (
                  <li key={idx}>
                    <span className="font-mono font-bold text-amber-950">{w.sequence_id}:</span>{' '}
                    {w.message}
                  </li>
                ))}
                {validationResponse.warnings.length > 6 && (
                  <li className="text-amber-700 italic">
                    ...and {validationResponse.warnings.length - 6} additional flagged sequences.
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Sequence Preview Table */}
          {validationResponse.sequences.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Validated Sequence Records ({validationResponse.sequences.length})
                </span>
                <span className="text-[11px] text-slate-400">Verified by FastAPI backend parser</span>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 sticky top-0">
                    <tr>
                      <th className="py-2 px-3 font-semibold">Sequence ID</th>
                      <th className="py-2 px-3 font-semibold">Length</th>
                      <th className="py-2 px-3 font-semibold">Validation Status</th>
                      <th className="py-2 px-3 font-semibold">QC Flags</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                    {validationResponse.sequences.map((seq) => (
                      <tr key={seq.sequence_id} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 font-bold text-slate-900">{seq.sequence_id}</td>
                        <td className="py-2 px-3 text-slate-600">{seq.length} bp</td>
                        <td className="py-2 px-3">
                          {seq.valid ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-sans font-semibold">
                              <IconCheck className="w-3 h-3 text-emerald-600" /> Pass
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-rose-700 font-sans font-semibold">
                              <IconXCircle className="w-3 h-3 text-rose-600" /> Invalid
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-[11px]">
                          {seq.qc_flags.length > 0 ? (
                            <span className="text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                              {seq.qc_flags.join(', ')}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-sans">None</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 flex items-start gap-2">
            <IconInfo className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <p>
              <strong>Backend Response Verified:</strong> FASTA syntax, IUPAC chemistry, and length thresholds were computed by the Python backend without transferring raw DNA strings to preserve network performance.
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

      {/* Execution Action & Classifier Status Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="text-xs text-slate-500 space-y-1">
            {!validationResponse ? (
              <span>Please upload or load a sample FASTA file to begin backend sequence validation.</span>
            ) : validationResponse.validation_status === 'valid' ? (
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                  <IconCheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Backend Validation Passed ({validationResponse.valid_sequences} sequences verified).
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Ready to persist Analysis Run in SQLite database. (ML classifier pending integration)
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-rose-700 font-semibold">
                <IconXCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Validation failed ({validationResponse.invalid_sequences} invalid sequences). Resolve errors to proceed.</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCreateRun}
              disabled={!validationResponse || validationResponse.validation_status !== 'valid' || isCreatingRun}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm cursor-pointer"
              title={
                !validationResponse
                  ? 'Upload and validate a FASTA file first'
                  : validationResponse.validation_status !== 'valid'
                  ? 'Resolve validation errors to create an Analysis Run'
                  : 'Saves analysis run and sequence records in SQLite'
              }
            >
              {isCreatingRun ? (
                <>
                  <IconRefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating Run in SQLite...</span>
                </>
              ) : (
                <>
                  <IconDna className="w-4 h-4" />
                  <span>Create Analysis Run</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
