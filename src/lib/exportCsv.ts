import { unparse } from 'papaparse';
import type { MatchResult } from '../types';
import { t } from './i18n';

export function buildCsvContent(results: MatchResult[]): string {
  const rows = results.map((result) => {
    const entry = result.commande ?? result.amalgame;
    return {
      statut: mapStatusLabel(result.status),
      prenom: entry?.prenom ?? '',
      nom: entry?.nom ?? '',
      passion: entry?.passion ?? '',
      suggestion: result.suggestion ?? '',
      score: result.score.toFixed(2),
      source: entry?.source ?? ''
    };
  });

  return unparse(rows, {
    delimiter: ';'
  });
}

export function exportCsv(results: MatchResult[]): Blob {
  const csv = buildCsvContent(results);
  return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
}

function mapStatusLabel(status: MatchResult['status']): string {
  switch (status) {
    case 'match':
      return t('status.match', '✅ Correspondant');
    case 'missing':
      return t('status.missing', '❌ Manquant');
    case 'extra':
      return t('status.extra', '⚠ En trop');
    case 'typo':
      return t('status.typo', '✏ Coquille');
    case 'inversion':
      return t('status.inversion', '🔄 Inversion');
    default:
      return status;
  }
}
