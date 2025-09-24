import { useMemo } from 'react';
import clsx from 'clsx';
import { useAppStore, type StatusFilter } from '../state/store';
import type { MatchResult } from '../types';
import { t } from '../lib/i18n';

const STATUS_LABELS: Record<MatchResult['status'], { label: string; tone: string }> = {
  match: { label: t('status.match', '✅ Correspondant'), tone: 'text-emerald-600' },
  missing: { label: t('status.missing', '❌ Manquant'), tone: 'text-red-600' },
  extra: { label: t('status.extra', '⚠ En trop'), tone: 'text-orange-500' },
  typo: { label: t('status.typo', '✏ Coquille'), tone: 'text-amber-500' },
  inversion: { label: t('status.inversion', '🔄 Inversion'), tone: 'text-purple-500' }
};

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: t('filter.all', 'Tous') },
  { value: 'match', label: t('filter.match', '✅ Correspondants') },
  { value: 'missing', label: t('filter.missing', '❌ Manquants') },
  { value: 'extra', label: t('filter.extra', '⚠ En trop') },
  { value: 'typo', label: t('filter.typo', '✏ Coquilles') },
  { value: 'inversion', label: t('filter.inversion', '🔄 Inversions') }
];

export default function ResultsTable() {
  const { results, statusFilter, setStatusFilter, searchTerm, setSearchTerm } = useAppStore(
    (state) => ({
      results: state.results,
      statusFilter: state.statusFilter,
      setStatusFilter: state.setStatusFilter,
      searchTerm: state.searchTerm,
      setSearchTerm: state.setSearchTerm
    })
  );

  const filteredResults = useMemo(() => {
    return results.filter((result) => {
      if (statusFilter !== 'all' && result.status !== statusFilter) {
        return false;
      }
      if (!searchTerm.trim()) {
        return true;
      }
      const haystack = [
        result.commande?.prenom,
        result.commande?.nom,
        result.amalgame?.prenom,
        result.amalgame?.nom,
        result.commande?.passion,
        result.amalgame?.passion,
        result.suggestion
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(searchTerm.trim().toLowerCase());
    });
  }, [results, searchTerm, statusFilter]);

  return (
    <section className="bg-white border border-slate-200 rounded-xl shadow-sm">
      <div className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setStatusFilter(filter.value)}
              className={clsx(
                'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                statusFilter === filter.value
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={t('table.search', 'Rechercher…')}
            className="pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-left text-slate-600">
            <tr>
              <th className="px-4 py-2 font-semibold">{t('table.headers.status', 'Statut')}</th>
              <th className="px-4 py-2 font-semibold">{t('table.headers.prenom', 'Prénom')}</th>
              <th className="px-4 py-2 font-semibold">{t('table.headers.nom', 'Nom')}</th>
              <th className="px-4 py-2 font-semibold">{t('table.headers.passion', 'Passion')}</th>
              <th className="px-4 py-2 font-semibold">{t('table.headers.suggestion', 'Suggestion')}</th>
              <th className="px-4 py-2 font-semibold">{t('table.headers.score', 'Score')}</th>
              <th className="px-4 py-2 font-semibold">{t('table.headers.source', 'Source')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredResults.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                  {t('table.empty', 'Aucun résultat à afficher pour le filtre sélectionné.')}
                </td>
              </tr>
            ) : (
              filteredResults.map((result) => {
                const entry = result.commande ?? result.amalgame;
                return (
                  <tr key={result.id} className="border-t border-slate-100">
                    <td className={clsx('px-4 py-2 font-medium', STATUS_LABELS[result.status].tone)}>
                      {STATUS_LABELS[result.status].label}
                    </td>
                    <td className="px-4 py-2">{entry?.prenom ?? '-'}</td>
                    <td className="px-4 py-2">{entry?.nom ?? '-'}</td>
                    <td className="px-4 py-2">{entry?.passion ?? '-'}</td>
                    <td className="px-4 py-2 text-slate-500">{result.suggestion ?? '-'}</td>
                    <td className="px-4 py-2 font-mono text-xs">{result.score.toFixed(2)}</td>
                    <td className="px-4 py-2 text-slate-500">{entry?.source ?? '-'}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
