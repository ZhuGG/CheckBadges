import { useCallback, useMemo, useState, type ChangeEvent, type MouseEvent } from 'react';
import Papa from 'papaparse';
import type { ParseError, ParseResult } from 'papaparse';

type DatasetKind = 'commande' | 'badges';

type Person = {
  prenom: string;
  nom: string;
  normalized: string;
  lineNumber: number;
};

type DatasetState = {
  fileName?: string;
  loading: boolean;
  people: Person[];
  errors: string[];
};

type MatchStatus = 'match' | 'missing' | 'extra' | 'duplicate';

type MatchRow = {
  id: string;
  status: MatchStatus;
  prenom: string;
  nom: string;
  source: DatasetKind;
  details: string;
};

type Comparison = {
  rows: MatchRow[];
  summary: Record<MatchStatus, number>;
};

type HeaderOutcome = {
  people: Person[];
  errors: string[];
  hasNameColumns: boolean;
};

const INITIAL_DATASET: DatasetState = {
  loading: false,
  people: [],
  errors: []
};

const FIRST_NAME_KEYS = ['prenom', 'prenoms', 'first_name', 'firstname', 'first', 'given_name'];
const LAST_NAME_KEYS = ['nom', 'noms', 'last_name', 'lastname', 'last', 'surname', 'family_name'];

const STATUS_LABELS: Record<MatchStatus, string> = {
  match: 'Correspondance',
  missing: 'Manquant',
  extra: 'En trop',
  duplicate: 'Doublon'
};

const STATUS_ORDER: MatchStatus[] = ['missing', 'extra', 'duplicate', 'match'];

const DATASET_LABELS: Record<DatasetKind, string> = {
  commande: 'Bon de commande',
  badges: 'Fichier badges'
};

const INITIAL_STATUS_FILTER: Record<MatchStatus, boolean> = {
  match: true,
  missing: true,
  extra: true,
  duplicate: true
};

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase();
}

function cleanCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function normalizeHeader(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

function findMatchingKey(keys: string[], candidates: string[]): string | undefined {
  return keys.find((key) => candidates.includes(key)) ?? keys.find((key) => candidates.some((candidate) => key.includes(candidate)));
}

function parseWithHeaders(rows: Record<string, unknown>[], keys: string[] | undefined): HeaderOutcome {
  const normalizedKeys = (keys ?? []).map(normalizeHeader);
  const effectiveKeys = normalizedKeys.length ? normalizedKeys : Object.keys(rows[0] ?? {}).map(normalizeHeader);
  const firstKey = findMatchingKey(effectiveKeys, FIRST_NAME_KEYS);
  const lastKey = findMatchingKey(effectiveKeys, LAST_NAME_KEYS);

  if (!firstKey || !lastKey) {
    return {
      people: [],
      errors: ['Impossible d\'identifier les colonnes prénom et nom. Vérifiez la première ligne de votre fichier.'],
      hasNameColumns: false
    };
  }

  const errors: string[] = [];
  const people: Person[] = [];

  rows.forEach((row, index) => {
    const prenom = cleanCell(row[firstKey]);
    const nom = cleanCell(row[lastKey]);

    if (!prenom && !nom) {
      return;
    }

    if (!prenom || !nom) {
      errors.push(`Ligne ${index + 2}: valeur manquante pour ${!prenom ? 'le prénom' : 'le nom'}.`);
      return;
    }

    people.push({
      prenom,
      nom,
      normalized: normalizeText(`${prenom} ${nom}`),
      lineNumber: index + 2
    });
  });

  return { people, errors, hasNameColumns: true };
}

function parseWithoutHeaders(rows: unknown[][]): HeaderOutcome {
  const errors: string[] = [];
  const people: Person[] = [];

  if (!rows.length) {
    return { people, errors: ['Le fichier est vide.'], hasNameColumns: false };
  }

  let startIndex = 0;
  const headerGuess = rows[0]?.map((cell) => normalizeHeader(cleanCell(cell)));
  const headerLooksValid = headerGuess?.some((cell) => FIRST_NAME_KEYS.includes(cell)) && headerGuess?.some((cell) => LAST_NAME_KEYS.includes(cell));

  if (headerLooksValid) {
    startIndex = 1;
  }

  for (let index = startIndex; index < rows.length; index += 1) {
    const row = rows[index] ?? [];
    const prenom = cleanCell(row[0]);
    const nom = cleanCell(row[1]);

    if (!prenom && !nom) {
      continue;
    }

    if (!prenom || !nom) {
      errors.push(`Ligne ${index + 1}: la colonne ${!prenom ? 'prénom' : 'nom'} est vide.`);
      continue;
    }

    people.push({
      prenom,
      nom,
      normalized: normalizeText(`${prenom} ${nom}`),
      lineNumber: index + 1
    });
  }

  if (!people.length) {
    errors.push('Aucune ligne exploitable n\'a été trouvée (les deux premières colonnes doivent contenir prénom et nom).');
  }

  return { people, errors, hasNameColumns: true };
}

function parseCsvFile(file: File): Promise<Omit<DatasetState, 'loading'>> {
  return new Promise((resolve) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: normalizeHeader,
      complete: (result: ParseResult<Record<string, unknown>>) => {
        const headerOutcome = parseWithHeaders(result.data, result.meta.fields as string[] | undefined);

        if (headerOutcome.hasNameColumns && headerOutcome.people.length > 0) {
          resolve({
            fileName: file.name,
            people: headerOutcome.people,
            errors: headerOutcome.errors
          });
          return;
        }

        Papa.parse<unknown[]>(file, {
          header: false,
          skipEmptyLines: true,
          complete: (fallback: ParseResult<unknown[]>) => {
            const fallbackRows = (fallback.data as unknown[]).map((row) => {
              if (Array.isArray(row)) {
                return row;
              }
              if (row && typeof row === 'object') {
                return Object.values(row);
              }
              return [row];
            });

            const fallbackOutcome = parseWithoutHeaders(fallbackRows);
            resolve({
              fileName: file.name,
              people: fallbackOutcome.people,
              errors: [...headerOutcome.errors, ...fallbackOutcome.errors]
            });
          },
          error: (error: ParseError) => {
            resolve({
              fileName: file.name,
              people: headerOutcome.people,
              errors: [...headerOutcome.errors, `Erreur lors de la lecture sans entête: ${error.message}`]
            });
          }
        });
      },
      error: (error: ParseError) => {
        resolve({
          fileName: file.name,
          people: [],
          errors: [`Impossible de lire ${file.name}: ${error.message}`]
        });
      }
    });
  });
}

function computeComparison(commande: Person[], badges: Person[]): Comparison {
  const rows: MatchRow[] = [];
  const summary: Record<MatchStatus, number> = {
    match: 0,
    missing: 0,
    extra: 0,
    duplicate: 0
  };

  const badgeLookup = new Map<string, number[]>();
  badges.forEach((person, index) => {
    const existing = badgeLookup.get(person.normalized);
    if (existing) {
      existing.push(index);
    } else {
      badgeLookup.set(person.normalized, [index]);
    }
  });

  const usedBadges = new Set<number>();

  commande.forEach((person, index) => {
    const candidates = badgeLookup.get(person.normalized) ?? [];
    const availableIndex = candidates.find((candidate) => !usedBadges.has(candidate));

    if (availableIndex !== undefined) {
      usedBadges.add(availableIndex);
      summary.match += 1;
      rows.push({
        id: `match-${index}`,
        status: 'match',
        prenom: person.prenom,
        nom: person.nom,
        source: 'commande',
        details: `Bon de commande – ligne ${person.lineNumber}`
      });
      return;
    }

    if (candidates.length > 0) {
      summary.duplicate += 1;
      rows.push({
        id: `duplicate-${index}`,
        status: 'duplicate',
        prenom: person.prenom,
        nom: person.nom,
        source: 'commande',
        details: `Bon de commande – ligne ${person.lineNumber}`
      });
      return;
    }

    summary.missing += 1;
    rows.push({
      id: `missing-${index}`,
      status: 'missing',
      prenom: person.prenom,
      nom: person.nom,
      source: 'commande',
      details: `Bon de commande – ligne ${person.lineNumber}`
    });
  });

  badges.forEach((person, index) => {
    if (usedBadges.has(index)) {
      return;
    }
    summary.extra += 1;
    rows.push({
      id: `extra-${index}`,
      status: 'extra',
      prenom: person.prenom,
      nom: person.nom,
      source: 'badges',
      details: `Fichier badges – ligne ${person.lineNumber}`
    });
  });

  rows.sort((a, b) => {
    const statusDiff = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
    if (statusDiff !== 0) {
      return statusDiff;
    }
    return a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' }) || a.prenom.localeCompare(b.prenom, 'fr', { sensitivity: 'base' });
  });

  return { rows, summary };
}

function toCsvValue(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function downloadRowsAsCsv(rows: MatchRow[], fileName: string) {
  if (rows.length === 0) {
    return;
  }

  const header = ['Statut', 'Prénom', 'Nom', 'Origine', 'Détails'];
  const lines = rows.map((row) => [
    STATUS_LABELS[row.status],
    row.prenom,
    row.nom,
    DATASET_LABELS[row.source],
    row.details
  ]);

  const csvContent = [header, ...lines]
    .map((line) => line.map(toCsvValue).join(';'))
    .join('\n');

  const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}

function useDataset(setState: (state: DatasetState) => void) {
  return async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setState({
      fileName: file.name,
      loading: true,
      people: [],
      errors: []
    });

    const result = await parseCsvFile(file);
    setState({
      fileName: result.fileName,
      loading: false,
      people: result.people,
      errors: result.errors
    });
  };
}

function DatasetPanel({
  title,
  state,
  onChange,
  description
}: {
  title: string;
  state: DatasetState;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  description: string;
}) {
  return (
    <section className="panel">
      <header className="panel__header">
        <h2>{title}</h2>
        <p className="panel__description">{description}</p>
      </header>
      <label className="file-input">
        <span>Sélectionner un fichier CSV</span>
        <input
          type="file"
          accept=".csv,.tsv,.txt"
          onChange={onChange}
          onClick={(event: MouseEvent<HTMLInputElement>) => {
            event.currentTarget.value = '';
          }}
        />
      </label>
      {state.loading && <p className="panel__info">Lecture du fichier…</p>}
      {state.fileName && !state.loading && (
        <p className="panel__info">
          {state.fileName} – {state.people.length} ligne{state.people.length > 1 ? 's' : ''} exploitables
        </p>
      )}
      {state.errors.length > 0 && (
        <ul className="panel__errors">
          {state.errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function App() {
  const [commandeState, setCommandeState] = useState<DatasetState>(INITIAL_DATASET);
  const [badgesState, setBadgesState] = useState<DatasetState>(INITIAL_DATASET);
  const [statusFilter, setStatusFilter] = useState<Record<MatchStatus, boolean>>({ ...INITIAL_STATUS_FILTER });

  const handleCommandeChange = useDataset(setCommandeState);
  const handleBadgesChange = useDataset(setBadgesState);

  const comparison = useMemo(() => {
    if (!commandeState.people.length && !badgesState.people.length) {
      return null;
    }
    return computeComparison(commandeState.people, badgesState.people);
  }, [commandeState.people, badgesState.people]);

  const activeStatuses = useMemo(
    () => STATUS_ORDER.filter((status) => statusFilter[status]),
    [statusFilter]
  );

  const filteredRows = useMemo(() => {
    if (!comparison) {
      return [];
    }
    if (!activeStatuses.length) {
      return [];
    }
    return comparison.rows.filter((row: MatchRow) => statusFilter[row.status]);
  }, [activeStatuses.length, comparison, statusFilter]);

  const hasDifferences = comparison?.rows.some((row: MatchRow) => row.status !== 'match');
  const anomaliesCount = comparison
    ? comparison.rows.filter((row: MatchRow) => row.status !== 'match').length
    : 0;
  const filteredRowCount = filteredRows.length;
  const allStatusesActive = STATUS_ORDER.every((status) => statusFilter[status]);

  const handleToggleStatus = useCallback((status: MatchStatus) => {
    setStatusFilter((previous) => ({
      ...previous,
      [status]: !previous[status]
    }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setStatusFilter({ ...INITIAL_STATUS_FILTER });
  }, []);

  const handleDownloadCsv = useCallback(() => {
    if (!comparison || anomaliesCount === 0) {
      return;
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const rowsToExport = comparison.rows.filter((row: MatchRow) => row.status !== 'match');
    downloadRowsAsCsv(rowsToExport, `checkbadges-anomalies-${timestamp}.csv`);
  }, [anomaliesCount, comparison]);

  return (
    <main className="layout">
      <header className="layout__header">
        <h1>CheckBadges</h1>
        <p>
          Comparez simplement un bon de commande et la liste de badges délivrés. L\'outil fonctionne hors-ligne et se concentre
          sur l\'essentiel&nbsp;: repérer les manquants, les doublons et les écarts.
        </p>
      </header>

      <div className="layout__grid">
        <DatasetPanel
          title="Bon de commande"
          description="Fichier exporté depuis votre CRM (CSV de préférence). Les deux premières colonnes doivent contenir le prénom et le nom."
          state={commandeState}
          onChange={handleCommandeChange}
        />
        <DatasetPanel
          title="Liste de badges"
          description="Fichier généré après production des badges. Les prénoms et noms sont analysés en ignorant la casse et les accents."
          state={badgesState}
          onChange={handleBadgesChange}
        />
      </div>

      <section className="panel">
        <header className="panel__header">
          <h2>Résultats de la comparaison</h2>
          {comparison && (
            <div className="summary">
              {STATUS_ORDER.map((status) => (
                <button
                  key={status}
                  type="button"
                  className="summary__item"
                  onClick={() => handleToggleStatus(status)}
                  aria-pressed={statusFilter[status]}
                >
                  <span className={`status status--${status}`}>{STATUS_LABELS[status]}</span>
                  <strong>{comparison.summary[status]}</strong>
                </button>
              ))}
            </div>
          )}
        </header>

        {!comparison && <p>Importez vos deux fichiers pour lancer l'analyse.</p>}

        {comparison && comparison.rows.length === 0 && <p>Aucune donnée à comparer pour le moment.</p>}

        {comparison && comparison.rows.length > 0 && (
          <div className="panel__actions">
            <p className="panel__info panel__info--muted">
              {activeStatuses.length === 0
                ? 'Sélectionnez au moins un statut pour afficher les résultats.'
                : `Résultats affichés : ${filteredRowCount}`}
            </p>
            <div className="panel__actions-buttons">
              <button
                type="button"
                className="reset-button"
                onClick={handleResetFilters}
                disabled={allStatusesActive}
              >
                Réinitialiser les filtres
              </button>
              <button
                type="button"
                className="action-button"
                onClick={handleDownloadCsv}
                disabled={anomaliesCount === 0}
              >
                Télécharger les anomalies (CSV)
              </button>
            </div>
          </div>
        )}

        {comparison && comparison.rows.length > 0 && (
          <>
            {!hasDifferences && (
              <p className="panel__info panel__info--success">Tout est cohérent : aucune anomalie détectée.</p>
            )}
            {activeStatuses.length > 0 && filteredRowCount === 0 && (
              <p className="panel__info panel__info--muted">
                Aucun résultat ne correspond aux statuts sélectionnés.
              </p>
            )}
            {activeStatuses.length > 0 && filteredRowCount > 0 && (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Statut</th>
                      <th>Prénom</th>
                      <th>Nom</th>
                      <th>Origine</th>
                      <th>Détails</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row: MatchRow) => (
                      <tr key={row.id} className={`row--${row.status}`}>
                        <td>
                          <span className={`status status--${row.status}`}>{STATUS_LABELS[row.status]}</span>
                        </td>
                        <td>{row.prenom}</td>
                        <td>{row.nom}</td>
                        <td>{DATASET_LABELS[row.source]}</td>
                        <td>{row.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
