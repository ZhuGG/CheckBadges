import { create } from 'zustand';
import { MatchResult, MatchThresholds, PersonEntry } from '../types';

export type StatusFilter = 'all' | MatchResult['status'];

interface AppState {
  commandeEntries: PersonEntry[];
  amalgameEntries: PersonEntry[];
  results: MatchResult[];
  logs: string[];
  warnings: string[];
  loading: boolean;
  progress: number;
  commandeLineCount: number;
  amalgameLineCount: number;
  ocrConfidence?: number;
  thresholds: MatchThresholds;
  toleranceAccents: boolean;
  statusFilter: StatusFilter;
  searchTerm: string;
  setCommande: (entries: PersonEntry[]) => void;
  setAmalgames: (entries: PersonEntry[]) => void;
  setResults: (results: MatchResult[]) => void;
  setLogs: (logs: string[]) => void;
  appendLog: (log: string) => void;
  setWarnings: (warnings: string[]) => void;
  setLoading: (loading: boolean) => void;
  setProgress: (progress: number) => void;
  setLineCounts: (counts: { commande?: number; amalgame?: number }) => void;
  setOcrConfidence: (confidence?: number) => void;
  setThresholds: (thresholds: Partial<MatchThresholds>) => void;
  setToleranceAccents: (value: boolean) => void;
  setStatusFilter: (filter: StatusFilter) => void;
  setSearchTerm: (term: string) => void;
  reset: () => void;
}

const defaultThresholds: MatchThresholds = {
  prenom: 0.88,
  nom: 0.92,
  passion: 0.85
};

export const useAppStore = create<AppState>((set) => ({
  commandeEntries: [],
  amalgameEntries: [],
  results: [],
  logs: [],
  warnings: [],
  loading: false,
  progress: 0,
  commandeLineCount: 0,
  amalgameLineCount: 0,
  ocrConfidence: undefined,
  thresholds: defaultThresholds,
  toleranceAccents: true,
  statusFilter: 'all',
  searchTerm: '',
  setCommande: (entries) => set({ commandeEntries: entries }),
  setAmalgames: (entries) => set({ amalgameEntries: entries }),
  setResults: (results) => set({ results }),
  setLogs: (logs) => set({ logs }),
  appendLog: (log) =>
    set((state) => ({
      logs: [...state.logs, log]
    })),
  setWarnings: (warnings) => set({ warnings }),
  setLoading: (loading) => set({ loading }),
  setProgress: (progress) => set({ progress }),
  setLineCounts: (counts) =>
    set((state) => ({
      commandeLineCount: counts.commande ?? state.commandeLineCount,
      amalgameLineCount: counts.amalgame ?? state.amalgameLineCount
    })),
  setOcrConfidence: (confidence) => set({ ocrConfidence: confidence }),
  setThresholds: (thresholds) =>
    set((state) => ({ thresholds: { ...state.thresholds, ...thresholds } })),
  setToleranceAccents: (value) => set({ toleranceAccents: value }),
  setStatusFilter: (filter) => set({ statusFilter: filter }),
  setSearchTerm: (term) => set({ searchTerm: term }),
  reset: () =>
    set({
      commandeEntries: [],
      amalgameEntries: [],
      results: [],
      logs: [],
      warnings: [],
      loading: false,
      progress: 0,
      commandeLineCount: 0,
      amalgameLineCount: 0,
      ocrConfidence: undefined,
      thresholds: defaultThresholds,
      toleranceAccents: true,
      statusFilter: 'all',
      searchTerm: ''
    })
}));
