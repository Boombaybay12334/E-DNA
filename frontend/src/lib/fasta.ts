export interface ParsedSequence {
  id: string;
  header: string;
  sequence: string;
  length: number;
  isValid: boolean;
  warnings: string[];
  errors: string[];
}

export interface FastaValidationResult {
  sequences: ParsedSequence[];
  totalCount: number;
  validCount: number;
  warningCount: number;
  invalidCount: number;
  globalErrors: string[];
}

/**
 * Parses raw FASTA text into sequence items.
 */
export function parseFasta(fastaText: string): Array<{ id: string; header: string; sequence: string; length: number }> {
  const lines = fastaText.split(/\r?\n/);
  const items: Array<{ id: string; header: string; sequence: string; length: number }> = [];

  let currentId: string | null = null;
  let currentHeader = '';
  let currentSeqParts: string[] = [];

  const flush = () => {
    if (!currentId) return;
    const seq = currentSeqParts.join('').toUpperCase().replace(/U/g, 'T');
    items.push({
      id: currentId,
      header: currentHeader,
      sequence: seq,
      length: seq.length,
    });
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith('>')) {
      flush();
      currentHeader = line.substring(1).trim();
      const rawId = currentHeader.split(/\s+/)[0]?.split(';')[0] || `SEQ_${items.length + 1}`;
      currentId = rawId;
      currentSeqParts = [];
    } else {
      if (currentId) {
        currentSeqParts.push(line);
      }
    }
  }
  flush();
  return items;
}

/**
 * Validates parsed FASTA items against 18S V4 amplicon requirements.
 */
export function validateFastaSequences(
  items: Array<{ id: string; header: string; sequence: string; length: number }>,
  minLength: number = 200
): ParsedSequence[] {
  const seenIds = new Set<string>();

  return items.map((item) => {
    const warnings: string[] = [];
    const errors: string[] = [];

    if (/\s/.test(item.id)) {
      warnings.push('id_contains_whitespace');
    }
    if (item.id.includes(';')) {
      warnings.push('id_contains_semicolon');
    }

    if (seenIds.has(item.id)) {
      errors.push('duplicate_sequence_id');
    } else {
      seenIds.add(item.id);
    }

    if (item.length < minLength) {
      warnings.push(`length_below_${minLength}`);
    }

    if (!/^[ACGT]+$/.test(item.sequence)) {
      warnings.push('non_acgt_characters');
    }

    return {
      ...item,
      isValid: errors.length === 0,
      warnings,
      errors,
    };
  });
}

/**
 * Parses and validates raw FASTA text against 18S V4 classification requirements.
 */
export function parseAndValidateFasta(fastaText: string, minLength: number = 200): FastaValidationResult {
  const parsed = parseFasta(fastaText);
  const validated = validateFastaSequences(parsed, minLength);

  const globalErrors: string[] = [];
  if (validated.length === 0) {
    globalErrors.push('No valid FASTA headers found. Ensure headers start with ">".');
  }

  return {
    sequences: validated,
    totalCount: validated.length,
    validCount: validated.filter(s => s.isValid && s.warnings.length === 0).length,
    warningCount: validated.filter(s => s.isValid && s.warnings.length > 0).length,
    invalidCount: validated.filter(s => !s.isValid).length,
    globalErrors,
  };
}

/**
 * Calculates GC content percentage of a DNA sequence.
 */
export function calculateGcContent(seq: string): number {
  if (!seq || seq.length === 0) return 0;
  const gcCount = (seq.match(/[GC]/gi) || []).length;
  return Number(((gcCount / seq.length) * 100).toFixed(1));
}

/**
 * Canonical sample 18S V4 FASTA dataset for instant 1-click testing
 */
export const SAMPLE_18S_V4_FASTA = `>ASV_0001 Marine dinoflagellate 18S V4 amplicon
CCGTAATGCCTTTCCCTAACAGAGTTTTTCGAACTCGTGTTGTCGAGCGACGGAATTAGATCAGTTAAATGGCAGAAAACTGGCAGGGCTTTTAGTCGTGGGATGATCAGTGGGTAAAGGTGGCGCGGGGTAACGCGCGCTAAGGCTCAGCTGCAACGCGGAGCTGGTGTGTTATCCATTCATGGCAGACAACTAATACGCATAAGCGTAGCCAACCGCATTAGCGTATGAACAAAATAATGCGAGTTGGGCGTACATACAGTTATAGTGTTTACCGATCTCAGGGATATAGAATCCTAAATCAGAAATGGAACAAAGCACCCTTGGTGTATCTCTTCTCCATTTCCGCCGCGTGCGAGTTCCGCGTCTTCTATATATCC
>ASV_0002 Ciliate oligohymenophorean 18S V4 amplicon
ACGCCGCCAGCAGCTAAAAGGAGTGAAGGTTTACTTCGAGATATGAGGTGGAGATGAGCCCGTAACGTGCTTGCAACTGAGGTACATGCGGTTAGTACGAAACCTTCCTCCCCGGGATTTGGTGTACAACTCTCCCATAGCCTAAAGCATAGGGGCAAAGCACTCTGAATACCTTTATCTGATTTTCTAGGGTGTCACGGCTCCCACTCACACTTCAATTGTAACTATTACCATTCCGAGAAGGTGTCGAGGGAATAAAAAACATACGCTGTGATGTAGCTATGTCTGCGTTCTTGGCTTACCATAAGCAATTGGAACTAGGATACCACCAACGCCTGCTCAAAAACGAATTCATGTTAGTTCAATGAGGCT
>ASV_0003 Unresolved deep-sea microeukaryote
AGTACCGAGCTTAGCGCCCTTGCTTTTAGACAACGATACCGTTAGTCGCATGTTACCTGTGCTGTTCGGGATGGGCAACCACAACTGGATCCAGTGAATGGCTTGGAATACCCTGCGACAATATTTGCGCACATGTTGGTGCGCATTCTGAGATCGGATAGATTCGGCTTGAGCAGGTGACTGTATCCAAAAGATGTTGGACCTCCCCTTACTACCGCCCACCTATTCAGACACGCTGACAGCTCAGTAGTAGTTTGTCTTCGCGCGGCCAATCAACATGGATTGCCGTGGGGGGGGCACGCGTGTCTGCTAATTGACTTCAGCATATTGAGGGTTGATCGCAGAACACGTGCAAGTGCTGATCT
>ASV_0004 Short amplicon (truncated length)
CGGCACATAGTATCTGCTCTGTGAAATGAAGTTAGTCGCTAAACACCTTGGTCCGGCGGGCTATGCTCCATATCGCAGTCTACTGTCCGGGGAGACCGTCCCTCCGCCTTCGTGAATTAC
>ASV_0005 Degenerate sequence with ambiguous base
GTTCTTGTTCATGCGAGCGTCTGTAGCAGGGTGATGTTGCCGCTAGCGTCTTCTGAATCCCAAATGTGATGGCGACATGTCGGCGCCCGGGAACACTGAGNCATGCGTTTTGGGTCAACTACCCGGAGCACCATTGCAGCGCAACAAATTTGCAAGTCAAGGGAACTATGCTTCAGCCCTTATGACGAATAGCCTGTCTGACTAGCTCGCCGGAATATCTAAATAATAAGGGTTGGCGATAACCACTCCAGATAGTATGTTTGAGGTGTGCGAGTTTCGACATCTCGACTGTTGTTAGTGTGCCCCATATTTTTCTTACACACTAAACGCTTCCCTTGTAGAGGTCAGCACTCCGCAGGCCTAGCCGAGGCGCGCCATTG
>ASV_0006 Mesopelagic chlorophyte prasinophyte
ATGGCTCGGAATTGCGAAACGGCCGAAGATGGATTTCTAACGTGTCTTTGGAGTTTATAGCCACCGGAGACGAATCATGTATTAAAACAGAGACATAACGTGGACACTCGTTTCGGACCGTTCGGGGCGGACTGTTTCAGAGTATGTTCGAATTTCCGCGACCCTAGGCAAGTGTAGGCTTGTGCACAGAGACATCGACGCTAACGCGCGGTCTTTATTAAGTGGAACATATTCATAGGCTGTACGCTGGGCCGACCTGCCTTCTGTTACTACGGGGTTCGAGGGCCTCCCGGTCAAATAGGGCCGCTTGCCTACGATATTATGTGGTATCAGTAGACGGCGTAAACCCACGCACTTAAGCTTCAAAAGCCTCAGATCCC
`;
