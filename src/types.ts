export type MatchStatus = 'match' | 'missing' | 'extra' | 'typo' | 'inversion';

export interface PersonEntry {
  prenom: string;
  nom: string;
  passion?: string;
  source: string;
  page?: number;
  ligne?: number;
  hash: string;
  raw?: string;
}

export interface MatchThresholds {
  prenom: number;
  nom: number;
  passion: number;
}

export interface MatchResult {
  id: string;
  commande?: PersonEntry;
  amalgame?: PersonEntry;
  status: MatchStatus;
  score: number;
  suggestion?: string;
  inversion?: boolean;
  reasons?: string[];
}

export type NovotelFormat = 'prenoms' | 'noms' | 'passions' | null;

export interface ParsedDocument {
  entries: PersonEntry[];
  warnings: string[];
  logs: string[];
  novotelFormat: NovotelFormat;
  ocrConfidence?: number;
  lineCount: number;
}

export interface PipelineResult {
  commande: PersonEntry[];
  amalgames: PersonEntry[];
  logs: string[];
  warnings: string[];
}
