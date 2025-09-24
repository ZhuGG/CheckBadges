import { jsPDF } from 'jspdf';
import type { MatchResult, MatchThresholds } from '../types';
import { t } from './i18n';

interface PdfOptions {
  thresholds: MatchThresholds;
  lineCount?: number;
  warnings?: string[];
  logs?: string[];
  ocrConfidence?: number;
}

interface Column {
  key: keyof Row;
  label: string;
  width: number;
}

interface Row {
  prenom: string;
  nom: string;
  passion: string;
  source: string;
  suggestion: string;
  score: string;
}

const COLUMNS: Column[] = [
  { key: 'prenom', label: 'Prénom', width: 30 },
  { key: 'nom', label: 'Nom', width: 35 },
  { key: 'passion', label: 'Passion', width: 35 },
  { key: 'source', label: 'Source', width: 35 },
  { key: 'suggestion', label: 'Suggestion', width: 35 },
  { key: 'score', label: 'Score', width: 20 }
];

const STATUS_LABELS: Record<MatchResult['status'], string> = {
  match: t('status.matchPlural', '✅ Correspondants'),
  missing: t('status.missingPlural', '❌ Manquants'),
  extra: t('status.extraPlural', '⚠ En trop'),
  typo: t('status.typoPlural', '✏ Coquilles'),
  inversion: t('status.inversionPlural', '🔄 Inversions')
};

function groupByStatus(results: MatchResult[]): Record<MatchResult['status'], MatchResult[]> {
  return results.reduce((acc, result) => {
    if (!acc[result.status]) {
      acc[result.status] = [];
    }
    acc[result.status].push(result);
    return acc;
  }, {} as Record<MatchResult['status'], MatchResult[]>);
}

function resultToRow(result: MatchResult): Row {
  const entry = result.commande ?? result.amalgame;
  return {
    prenom: entry?.prenom ?? '',
    nom: entry?.nom ?? '',
    passion: entry?.passion ?? '',
    source: entry?.source ?? '',
    suggestion: result.suggestion ?? '',
    score: result.score.toFixed(2)
  };
}

function addTable(
  doc: jsPDF,
  title: string,
  rows: Row[],
  startY: number
): number {
  if (!rows.length) {
    return startY;
  }
  let y = startY;
  doc.setFontSize(14);
  doc.text(title, 14, y);
  y += 6;

  doc.setFontSize(10);
  let x = 14;
  COLUMNS.forEach((column) => {
    doc.text(column.label, x, y);
    x += column.width;
  });
  y += 4;

  rows.forEach((row) => {
    const splittedByColumn = COLUMNS.map((column) =>
      doc.splitTextToSize(row[column.key], column.width - 2)
    );
    const rowHeight = Math.max(
      4,
      ...splittedByColumn.map((lines) => Math.max(lines.length, 1) * 4)
    );
    if (y + rowHeight > 270) {
      doc.addPage();
      y = 20;
    }
    x = 14;
    splittedByColumn.forEach((lines, columnIndex) => {
      lines.forEach((line, lineIndex) => {
        doc.text(line, x, y + lineIndex * 4);
      });
      x += COLUMNS[columnIndex].width;
    });
    y += rowHeight + 2;
  });

  return y + 4;
}

function addSummary(
  doc: jsPDF,
  grouped: Record<MatchResult['status'], MatchResult[]>,
  options: PdfOptions
): number {
  const now = new Date();
  doc.setFontSize(20);
  doc.text(t('app.title', 'CheckBadges OCR'), 14, 20);
  doc.setFontSize(12);
  doc.text(`Généré le ${now.toLocaleString('fr-FR')}`, 14, 28);
  doc.text(
    `Seuils - Prénom: ${options.thresholds.prenom.toFixed(2)} | Nom: ${options.thresholds.nom.toFixed(2)} | Passion: ${options.thresholds.passion.toFixed(2)}`,
    14,
    34
  );
  if (options.lineCount) {
    doc.text(`Lignes analysées: ${options.lineCount}`, 14, 40);
  }
  if (options.ocrConfidence) {
    doc.text(`Confiance OCR moyenne: ${options.ocrConfidence.toFixed(2)}`, 14, 46);
  }

  const statuses: MatchResult['status'][] = ['match', 'missing', 'extra', 'typo', 'inversion'];
  let y = 54;
  doc.setFontSize(11);
  statuses.forEach((status) => {
    const count = grouped[status]?.length ?? 0;
    doc.text(`${STATUS_LABELS[status]}: ${count}`, 14, y);
    y += 6;
  });

  if (options.warnings?.length) {
    doc.text(`⚠️ ${t('summary.warnings', 'Avertissements')} :`, 14, y);
    y += 6;
    options.warnings.forEach((warning) => {
      const lines = doc.splitTextToSize(`- ${warning}`, 180);
      lines.forEach((line) => {
        doc.text(line, 18, y);
        y += 4;
      });
    });
  }

  return y + 6;
}

function addLogs(doc: jsPDF, logs: string[], startY: number): void {
  if (!logs.length) return;
  let y = startY;
  if (y > 250) {
    doc.addPage();
    y = 20;
  }
  doc.setFontSize(12);
  doc.text(`Annexe - ${t('summary.logs', 'Logs de parsing')}`, 14, y);
  y += 6;
  doc.setFontSize(10);
  logs.forEach((log) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    const lines = doc.splitTextToSize(`- ${log}`, 180);
    lines.forEach((line) => {
      doc.text(line, 18, y);
      y += 4;
    });
  });
}

export function exportPdf(
  results: MatchResult[],
  options: PdfOptions
): Blob {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const grouped = groupByStatus(results);

  let cursor = addSummary(doc, grouped, options);

  (['match', 'missing', 'extra', 'typo', 'inversion'] as MatchResult['status'][]).forEach(
    (status) => {
      const rows = (grouped[status] ?? []).map(resultToRow);
      cursor = addTable(doc, STATUS_LABELS[status], rows, cursor);
    }
  );

  if (options.logs?.length) {
    addLogs(doc, options.logs, cursor);
  }

  return doc.output('blob');
}
