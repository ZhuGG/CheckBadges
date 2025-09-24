import { useMemo } from 'react';
import { exportCsv } from '../lib/exportCsv';
import { exportPdf } from '../lib/exportPdf';
import { useAppStore } from '../state/store';
import type { MatchResult } from '../types';
import { t } from '../lib/i18n';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function computeCounts(results: MatchResult[]) {
  return results.reduce(
    (acc, result) => {
      acc[result.status] = (acc[result.status] ?? 0) + 1;
      return acc;
    },
    {
      match: 0,
      missing: 0,
      extra: 0,
      typo: 0,
      inversion: 0
    } as Record<MatchResult['status'], number>
  );
}

export default function SummaryBar() {
  const {
    results,
    warnings,
    logs,
    thresholds,
    commandeLineCount,
    amalgameLineCount,
    ocrConfidence
  } = useAppStore((state) => ({
    results: state.results,
    warnings: state.warnings,
    logs: state.logs,
    thresholds: state.thresholds,
    commandeLineCount: state.commandeLineCount,
    amalgameLineCount: state.amalgameLineCount,
    ocrConfidence: state.ocrConfidence
  }));

  const counts = useMemo(() => computeCounts(results), [results]);
  const hasErrors = useMemo(
    () => results.some((result) => result.status !== 'match'),
    [results]
  );

  const totalEntries = results.length;
  const totalLines = commandeLineCount + amalgameLineCount;

  const handleExportCsv = () => {
    if (!results.length) return;
    const blob = exportCsv(results);
    downloadBlob(blob, 'checkbadges-resultats.csv');
  };

  const handleExportPdf = () => {
    if (!results.length) return;
    const blob = exportPdf(results, {
      thresholds,
      warnings,
      logs,
      lineCount: totalLines,
      ocrConfidence
    });
    downloadBlob(blob, 'checkbadges-rapport.pdf');
  };

  return (
    <aside className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-4 shadow-sm">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-lg font-semibold text-slate-800">
            {hasErrors ? t('summary.ko', '❌ Erreur détectée') : t('summary.ok', '✅ Tout est cohérent')}
          </p>
          <p className="text-sm text-slate-500">
            {totalEntries === 0
              ? t('summary.empty', 'Importez des fichiers pour commencer la comparaison.')
              : `${totalEntries} lignes comparées | ${counts.match} correspondances`}
          </p>
          {ocrConfidence ? (
            <p className="text-xs text-slate-400">
              Confiance OCR moyenne : {ocrConfidence.toFixed(2)}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={!results.length}
            className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
          >
            {t('summary.export.csv', 'Exporter CSV')}
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={!results.length}
            className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40"
          >
            {t('summary.export.pdf', 'Exporter PDF')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
        <SummaryCard label={t('status.matchPlural', '✅ Correspondants')} value={counts.match} tone="text-emerald-600" />
        <SummaryCard label={t('status.missingPlural', '❌ Manquants')} value={counts.missing} tone="text-red-600" />
        <SummaryCard label={t('status.extraPlural', '⚠ En trop')} value={counts.extra} tone="text-orange-500" />
        <SummaryCard label={t('status.typoPlural', '✏ Coquilles')} value={counts.typo} tone="text-amber-500" />
        <SummaryCard label={t('status.inversionPlural', '🔄 Inversions')} value={counts.inversion} tone="text-purple-500" />
      </div>

      {warnings.length ? (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
          <p className="font-semibold">{t('summary.warnings', 'Avertissements')}</p>
          <ul className="list-disc list-inside space-y-1">
            {warnings.map((warning, index) => (
              <li key={warning + index}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {logs.length ? (
        <details className="text-xs text-slate-500">
          <summary className="cursor-pointer select-none">{t('summary.logs', 'Afficher les logs de parsing')}</summary>
          <ul className="mt-2 space-y-1">
            {logs.map((log, index) => (
              <li key={index}>{log}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </aside>
  );
}

interface SummaryCardProps {
  label: string;
  value: number;
  tone: string;
}

function SummaryCard({ label, value, tone }: SummaryCardProps) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
      <p className={`text-2xl font-bold ${tone}`}>{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
