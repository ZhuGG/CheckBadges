import type { NovotelFormat, ParsedDocument, PersonEntry } from '../types';
import { computeEntryHash } from './normalize';

const PASSION_KEYWORDS = [
  'golf',
  'tennis',
  'foot',
  'football',
  'lecture',
  'voyage',
  'cuisine',
  'musique',
  'running',
  'yoga',
  'cinema',
  'cinéma',
  'théâtre',
  'peinture',
  'danse'
];

const COMMON_FIRSTNAME_ENDINGS = ['a', 'e', 'i', 'y', 'ine', 'ine', 'ine', 'ie', 'ine', 'ette'];

function tokenize(input: string | string[]): string[] {
  if (Array.isArray(input)) {
    return input;
  }
  return input
    .split(/\r?\n|[;,\t]/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function looksLikeFirstName(token: string): boolean {
  if (token.length < 2 || token.length > 20) return false;
  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ'\-]+$/.test(token)) return false;
  if (!/^[A-ZÀ-ÖØ-Ý]/.test(token)) return false;
  const lower = token.toLowerCase();
  return (
    COMMON_FIRSTNAME_ENDINGS.some((ending) => lower.endsWith(ending)) ||
    /[aeiouy]$/.test(lower)
  );
}

function looksLikeLastName(token: string): boolean {
  const cleaned = token.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ'-]/g, '');
  if (cleaned.length < 2) return false;
  if (/^[A-ZÀ-ÖØ-Ý\-]+$/.test(token)) return true;
  if (/^[A-ZÀ-ÖØ-Ý][A-ZÀ-ÖØ-Ý\-]+$/.test(token)) return true;
  if (/^[A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ]+$/.test(token) && token.length > 3) {
    return true;
  }
  return false;
}

function looksLikePassion(token: string): boolean {
  const lower = token.toLowerCase();
  if (PASSION_KEYWORDS.some((keyword) => lower.includes(keyword))) {
    return true;
  }
  return /\s/.test(token) || token.split(/\s+/).length >= 2;
}

export function detectNovotelFormat(input: string | string[]): NovotelFormat {
  const tokens = tokenize(input);
  if (!tokens.length) {
    return null;
  }

  let prenomScore = 0;
  let nomScore = 0;
  let passionScore = 0;

  tokens.forEach((raw) => {
    const token = raw.trim();
    if (!token) return;
    const pieces = token.split(/\s+/);
    if (pieces.length === 1) {
      if (looksLikeFirstName(pieces[0])) {
        prenomScore += 1;
      }
      if (looksLikeLastName(pieces[0])) {
        nomScore += 1;
      }
    } else if (pieces.length >= 2) {
      if (looksLikePassion(token)) {
        passionScore += 1;
      }
      // also consider splitted tokens for names like "Jean Louis"
      if (pieces.length === 2) {
        if (looksLikeFirstName(pieces[0]) && looksLikeLastName(pieces[1])) {
          prenomScore += 0.5;
          nomScore += 0.5;
        }
      }
    }
  });

  const total = tokens.length;
  const prenomRatio = prenomScore / total;
  const nomRatio = nomScore / total;
  const passionRatio = passionScore / total;

  if (prenomRatio > 0.6 && prenomRatio > nomRatio && prenomRatio > passionRatio) {
    return 'prenoms';
  }
  if (nomRatio > 0.6 && nomRatio > prenomRatio && nomRatio > passionRatio) {
    return 'noms';
  }
  if (passionRatio > 0.5 && passionRatio > prenomRatio && passionRatio > nomRatio) {
    return 'passions';
  }

  return null;
}

export function mergeNovotelFragments(documents: ParsedDocument[]): PersonEntry[] {
  const prenoms = documents
    .filter((doc) => doc.novotelFormat === 'prenoms')
    .flatMap((doc) => doc.entries)
    .sort((a, b) => (a.ligne ?? 0) - (b.ligne ?? 0));
  const noms = documents
    .filter((doc) => doc.novotelFormat === 'noms')
    .flatMap((doc) => doc.entries)
    .sort((a, b) => (a.ligne ?? 0) - (b.ligne ?? 0));
  const passions = documents
    .filter((doc) => doc.novotelFormat === 'passions')
    .flatMap((doc) => doc.entries)
    .sort((a, b) => (a.ligne ?? 0) - (b.ligne ?? 0));

  const max = Math.max(prenoms.length, noms.length, passions.length);
  const entries: PersonEntry[] = [];
  for (let i = 0; i < max; i += 1) {
    const prenom = prenoms[i]?.prenom ?? '';
    const nom = noms[i]?.nom ?? '';
    const passion = passions[i]?.passion ?? undefined;
    if (!prenom && !nom && !passion) {
      continue;
    }
    entries.push({
      prenom,
      nom,
      passion,
      source: prenoms[i]?.source ?? noms[i]?.source ?? passions[i]?.source ?? 'Novotel',
      ligne: prenoms[i]?.ligne ?? noms[i]?.ligne ?? passions[i]?.ligne,
      hash: computeEntryHash(prenom, nom, passion),
      raw: [prenom, nom, passion].filter(Boolean).join(' ')
    });
  }
  return entries;
}
