import { read, utils } from 'xlsx';
import type { ParsedDocument, PersonEntry } from '../types';
import { computeEntryHash } from './normalize';
import { detectNovotelFormat } from './novotel';

function sanitizeCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
}

function isHeaderRow(row: string[]): boolean {
  const lower = row.map((cell) => cell.toLowerCase());
  return lower.includes('prenom') || lower.includes('prénom');
}

function parseStandardRows(rows: string[][], source: string): PersonEntry[] {
  const entries: PersonEntry[] = [];
  rows.forEach((row, index) => {
    if (!row.length) {
      return;
    }
    if (isHeaderRow(row)) {
      return;
    }
    const [prenom, nom, passion] = row;
    if (prenom && nom) {
      entries.push({
        prenom,
        nom,
        passion,
        source,
        ligne: index + 1,
        hash: computeEntryHash(prenom, nom, passion),
        raw: row.join(' ')
      });
    }
  });
  return entries;
}

function parseNovotelRows(
  rows: string[][],
  format: 'prenoms' | 'noms' | 'passions',
  source: string
): PersonEntry[] {
  const entries: PersonEntry[] = [];
  rows.forEach((row, index) => {
    row.forEach((cell) => {
      if (!cell) return;
      entries.push({
        prenom: format === 'prenoms' ? cell : '',
        nom: format === 'noms' ? cell : '',
        passion: format === 'passions' ? cell : undefined,
        source,
        ligne: index + 1,
        hash: computeEntryHash(
          format === 'prenoms' ? cell : '',
          format === 'noms' ? cell : '',
          format === 'passions' ? cell : undefined
        ),
        raw: cell
      });
    });
  });
  return entries;
}

export async function parseSpreadsheet(file: File): Promise<ParsedDocument> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = read(arrayBuffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = (utils.sheet_to_json(sheet, { header: 1 }) as unknown[][])
    .map((row) => row.map(sanitizeCell))
    .filter((row) => row.some((cell) => cell));

  const logs: string[] = [`Lecture du fichier ${file.name} (${sheetName})`];
  const warnings: string[] = [];

  if (!rows.length) {
    warnings.push('Aucune ligne détectée dans le classeur.');
  }

  const flattened = rows.map((row) => row.join(' ').trim()).filter(Boolean);
  const format = detectNovotelFormat(flattened);

  let entries: PersonEntry[] = [];
  if (format && format !== null) {
    logs.push(`Format Novotel détecté: ${format}`);
    entries = parseNovotelRows(rows, format, file.name);
  } else {
    entries = parseStandardRows(rows, file.name);
  }

  const uniqueEntries = new Map<string, PersonEntry>();
  entries.forEach((entry) => {
    if (!uniqueEntries.has(entry.hash)) {
      uniqueEntries.set(entry.hash, entry);
    }
  });

  return {
    entries: Array.from(uniqueEntries.values()),
    warnings,
    logs,
    novotelFormat: format,
    lineCount: rows.length
  };
}
