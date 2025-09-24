import { useCallback, useRef, useState } from 'react';
import { parsePdf } from '../lib/pdf';
import { parseSpreadsheet } from '../lib/excel';
import { mergeNovotelFragments } from '../lib/novotel';
import type { ParsedDocument, PersonEntry } from '../types';
import { useAppStore } from '../state/store';
import { t } from '../lib/i18n';

const ACCEPTED_TYPES = '.pdf,.xls,.xlsx,.csv';

function isSpreadsheet(extension: string): boolean {
  return ['xls', 'xlsx', 'csv'].includes(extension);
}

function isPdf(extension: string): boolean {
  return extension === 'pdf';
}

function isCommandeFile(file: File, extension: string): boolean {
  const name = file.name.toLowerCase();
  if (/commande|order|ref|bon/.test(name)) {
    return true;
  }
  if (/amalgam|amalgame|badge/.test(name)) {
    return false;
  }
  if (isSpreadsheet(extension)) {
    return true;
  }
  return false;
}

function mergeDocuments(documents: ParsedDocument[]): PersonEntry[] {
  const novotelDocs = documents.filter((doc) => doc.novotelFormat);
  const standardDocs = documents.filter((doc) => !doc.novotelFormat);
  const entries: PersonEntry[] = [];
  standardDocs.forEach((doc) => {
    entries.push(...doc.entries);
  });
  if (novotelDocs.length) {
    entries.push(...mergeNovotelFragments(novotelDocs));
  }
  const unique = new Map(entries.map((entry) => [entry.hash, entry]));
  return Array.from(unique.values());
}

export default function Dropzone() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const {
    commandeEntries,
    amalgameEntries,
    progress,
    loading,
    setCommande,
    setAmalgames,
    setResults,
    setLogs,
    setWarnings,
    setLoading,
    setProgress,
    setLineCounts,
    setOcrConfidence,
    reset
  } = useAppStore((state) => ({
    commandeEntries: state.commandeEntries,
    amalgameEntries: state.amalgameEntries,
    progress: state.progress,
    loading: state.loading,
    setCommande: state.setCommande,
    setAmalgames: state.setAmalgames,
    setResults: state.setResults,
    setLogs: state.setLogs,
    setWarnings: state.setWarnings,
    setLoading: state.setLoading,
    setProgress: state.setProgress,
    setLineCounts: state.setLineCounts,
    setOcrConfidence: state.setOcrConfidence,
    reset: state.reset
  }));

  const handleFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      if (!files.length) {
        return;
      }
      setLoading(true);
      setProgress(0);
      setLogs([]);
      setWarnings([]);
      setResults([]);
      setLineCounts({ commande: 0, amalgame: 0 });
      setOcrConfidence(undefined);

      const total = files.length;
      const allLogs: string[] = [];
      const allWarnings: string[] = [];
      const commandeDocs: ParsedDocument[] = [];
      const amalgameDocs: ParsedDocument[] = [];
      let totalOcrConfidence = 0;
      let ocrCount = 0;

      for (let i = 0; i < files.length; i += 1) {
        const file = files[i];
        const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
        const isCommande = isCommandeFile(file, extension);
        try {
          let parsed: ParsedDocument | undefined;
          if (isPdf(extension)) {
            parsed = await parsePdf(file, {
              sourceLabel: file.name,
              onProgress: (fraction) => {
                setProgress((i + fraction) / total);
              }
            });
          } else if (isSpreadsheet(extension)) {
            setProgress((i + 0.5) / total);
            parsed = await parseSpreadsheet(file);
          } else {
            allWarnings.push(`Format non pris en charge: ${file.name}`);
          }

          if (parsed) {
            allLogs.push(...parsed.logs);
            allWarnings.push(...parsed.warnings);
            if (parsed.ocrConfidence) {
              totalOcrConfidence += parsed.ocrConfidence;
              ocrCount += 1;
            }
            if (isCommande) {
              commandeDocs.push(parsed);
            } else {
              amalgameDocs.push(parsed);
            }
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Erreur inconnue';
          allWarnings.push(`Erreur lors de la lecture de ${file.name}: ${message}`);
        }
        setProgress((i + 1) / total);
      }

      const commandeEntriesMerged = mergeDocuments(commandeDocs);
      const amalgameEntriesMerged = mergeDocuments(amalgameDocs);

      setCommande(commandeEntriesMerged);
      setAmalgames(amalgameEntriesMerged);
      setLineCounts({
        commande: commandeDocs.reduce((acc, doc) => acc + doc.lineCount, 0),
        amalgame: amalgameDocs.reduce((acc, doc) => acc + doc.lineCount, 0)
      });
      setOcrConfidence(ocrCount ? totalOcrConfidence / ocrCount : undefined);
      setLogs(allLogs);
      setWarnings(allWarnings);
      setLoading(false);
      setProgress(1);
    },
    [
      setAmalgames,
      setCommande,
      setLineCounts,
      setLoading,
      setLogs,
      setOcrConfidence,
      setProgress,
      setResults,
      setWarnings
    ]
  );

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragging(false);
      if (event.dataTransfer.files?.length) {
        void handleFiles(event.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(true);
  }, []);

  const onDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
  }, []);

  const onBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const onFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.files) {
        void handleFiles(event.target.files);
        event.target.value = '';
      }
    },
    [handleFiles]
  );

  const onReset = useCallback(() => {
    reset();
    setProgress(0);
  }, [reset, setProgress]);

  return (
    <section className="bg-white shadow-sm rounded-xl p-6 space-y-4 border border-slate-200">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300'
        }`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          multiple
          className="hidden"
          onChange={onFileChange}
        />
        <p className="text-lg font-semibold">{t('dropzone.title', 'Glissez-déposez vos fichiers ici')}</p>
        <p className="text-sm text-slate-500">{t('dropzone.subtitle', '')}</p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onBrowseClick}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            {t('dropzone.choose', 'Choisir des fichiers')}
          </button>
          <button
            type="button"
            onClick={onReset}
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            {t('dropzone.reset', 'Réinitialiser')}
          </button>
        </div>
        {loading ? (
          <div className="mt-6">
            <p className="text-sm text-slate-500 mb-2">{t('dropzone.loading', 'Traitement en cours…')}</p>
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: `${Math.min(progress * 100, 100)}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <p className="font-semibold text-slate-700">{t('dropzone.command', 'Bon de commande')}</p>
          <p className="text-2xl font-bold text-blue-600">{commandeEntries.length}</p>
          <p className="text-xs text-slate-500">{t('dropzone.command.hint', '')}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <p className="font-semibold text-slate-700">{t('dropzone.amalgame', 'Amalgames')}</p>
          <p className="text-2xl font-bold text-emerald-600">{amalgameEntries.length}</p>
          <p className="text-xs text-slate-500">{t('dropzone.amalgame.hint', '')}</p>
        </div>
      </div>
    </section>
  );
}
