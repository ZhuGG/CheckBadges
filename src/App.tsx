import { useEffect } from 'react';
import Dropzone from './components/Dropzone';
import SummaryBar from './components/SummaryBar';
import SettingsPanel from './components/SettingsPanel';
import ResultsTable from './components/ResultsTable';
import { useAppStore } from './state/store';
import { matchEntries } from './lib/match';
import { t } from './lib/i18n';

function useMatchComputation() {
  const { commandeEntries, amalgameEntries, thresholds, toleranceAccents, setResults } = useAppStore(
    (state) => ({
      commandeEntries: state.commandeEntries,
      amalgameEntries: state.amalgameEntries,
      thresholds: state.thresholds,
      toleranceAccents: state.toleranceAccents,
      setResults: state.setResults
    })
  );

  useEffect(() => {
    if (!commandeEntries.length && !amalgameEntries.length) {
      setResults([]);
      return;
    }
    const computed = matchEntries(commandeEntries, amalgameEntries, thresholds, toleranceAccents);
    setResults(computed);
  }, [commandeEntries, amalgameEntries, thresholds, toleranceAccents, setResults]);
}

export default function App() {
  useMatchComputation();

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">{t('app.title', 'CheckBadges OCR')}</h1>
        <p className="text-sm text-slate-500">{t('app.subtitle', '')}</p>
      </header>

      <Dropzone />
      <SummaryBar />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <SettingsPanel />
        <ResultsTable />
      </div>
    </main>
  );
}
