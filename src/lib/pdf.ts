import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker?url';
import type { ParsedDocument, PersonEntry } from '../types';
import { computeEntryHash } from './normalize';
import { detectNovotelFormat } from './novotel';
import { recognizeFromDataUrl } from './ocr';

GlobalWorkerOptions.workerSrc = pdfWorker;

interface PdfParseOptions {
  onProgress?: (progress: number) => void;
  fallbackToOcr?: boolean;
  sourceLabel?: string;
}

interface PageExtractionResult {
  text: string;
  confidence?: number;
}

function splitLines(text: string): string[] {
  return text
    .split(/\r?\n|\s{2,}/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function shouldIgnoreLine(line: string, index: number, total: number): boolean {
  const lower = line.toLowerCase();
  if (/(cartouche|graphiste|design|studio)/i.test(line) && /leeroy|jordan/i.test(line)) {
    return true;
  }
  if (/leeroy|jordan/i.test(line) && (index < 3 || index > total - 3)) {
    return true;
  }
  if (/^page \d+/i.test(lower)) {
    return true;
  }
  return false;
}

function parseStandardLine(
  line: string,
  source: string,
  page: number,
  index: number
): PersonEntry | null {
  const cleaned = line.trim();
  if (!cleaned) return null;

  const parts = cleaned
    .split(/[;\t\|]/)
    .map((part) => part.trim())
    .filter(Boolean);

  let prenom = '';
  let nom = '';
  let passion: string | undefined;

  if (parts.length >= 2) {
    [prenom, nom] = parts;
    passion = parts[2];
  } else {
    const tokens = cleaned.split(/\s+/);
    if (tokens.length >= 2) {
      prenom = tokens[0];
      nom = tokens.slice(1, 2).join(' ');
      passion = tokens.slice(2).join(' ') || undefined;
    }
  }

  if (!prenom || !nom) {
    return null;
  }

  const entry: PersonEntry = {
    prenom,
    nom,
    passion,
    source,
    page,
    ligne: index + 1,
    hash: computeEntryHash(prenom, nom, passion),
    raw: cleaned
  };
  return entry;
}

function parseNovotelLines(
  lines: string[],
  format: 'prenoms' | 'noms' | 'passions',
  source: string
): PersonEntry[] {
  return lines.map((line, index) => {
    const entry: PersonEntry = {
      prenom: format === 'prenoms' ? line : '',
      nom: format === 'noms' ? line : '',
      passion: format === 'passions' ? line : undefined,
      source,
      ligne: index + 1,
      hash: computeEntryHash(
        format === 'prenoms' ? line : '',
        format === 'noms' ? line : '',
        format === 'passions' ? line : undefined
      ),
      raw: line
    };
    return entry;
  });
}

async function renderPageToDataUrl(page: any): Promise<string> {
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Impossible de créer un contexte canvas pour OCR');
  }
  canvas.height = viewport.height;
  canvas.width = viewport.width;
  await page.render({ canvasContext: context, viewport }).promise;
  return canvas.toDataURL('image/png');
}

async function extractPageText(
  page: any,
  options: PdfParseOptions
): Promise<PageExtractionResult> {
  const textContent = await page.getTextContent();
  const text = textContent.items.map((item: any) => item.str).join(' ');
  if (text.trim().length > 10) {
    return { text };
  }

  if (options.fallbackToOcr !== false) {
    const dataUrl = await renderPageToDataUrl(page);
    const { text: ocrText, confidence } = await recognizeFromDataUrl(
      dataUrl,
      options.onProgress
    );
    return { text: ocrText, confidence };
  }

  return { text: '', confidence: 0 };
}

export async function parsePdf(
  file: File,
  options: PdfParseOptions = {}
): Promise<ParsedDocument> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = getDocument({ data: arrayBuffer });
  const logs: string[] = [`Lecture du PDF ${file.name}`];
  const warnings: string[] = [];
  let accumulatedConfidence = 0;
  let ocrPages = 0;
  let totalLineCount = 0;

  if (options.onProgress) {
    loadingTask.onProgress = (progressData: { loaded: number; total?: number }) => {
      if (progressData.total) {
        options.onProgress!(progressData.loaded / progressData.total);
      }
    };
  }

  const pdf = await loadingTask.promise;
  const allLines: string[] = [];

  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const result = await extractPageText(page, options);
    if (result.confidence) {
      accumulatedConfidence += result.confidence;
      ocrPages += 1;
    }
    const pageLines = splitLines(result.text);
    totalLineCount += pageLines.length;
    pageLines.forEach((line, index) => {
      if (!shouldIgnoreLine(line, index, pageLines.length)) {
        allLines.push(line);
      }
    });
  }

  const format = detectNovotelFormat(allLines);
  let entries: PersonEntry[] = [];

  if (format && format !== null) {
    logs.push(`Format Novotel détecté: ${format}`);
    entries = parseNovotelLines(allLines, format, options.sourceLabel ?? file.name);
  } else {
    const sourceLabel = options.sourceLabel ?? file.name;
    entries = allLines
      .map((line, index) =>
        parseStandardLine(line, sourceLabel, Math.floor(index / 100) + 1, index)
      )
      .filter((entry): entry is PersonEntry => Boolean(entry));
  }

  if (!entries.length) {
    warnings.push('Aucune entrée détectée dans le PDF.');
  }

  const uniqueEntries = new Map<string, PersonEntry>();
  entries.forEach((entry) => {
    if (!uniqueEntries.has(entry.hash)) {
      uniqueEntries.set(entry.hash, entry);
    }
  });

  const ocrConfidence = ocrPages ? accumulatedConfidence / ocrPages : undefined;
  if (ocrConfidence !== undefined) {
    logs.push(`Confiance OCR moyenne: ${ocrConfidence.toFixed(2)}`);
  }

  return {
    entries: Array.from(uniqueEntries.values()),
    warnings,
    logs,
    novotelFormat: format,
    ocrConfidence,
    lineCount: totalLineCount
  };
}
