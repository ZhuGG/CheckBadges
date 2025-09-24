import { compareStrings } from './normalize';
import type { MatchResult, MatchThresholds, PersonEntry } from '../types';

type SimilarityAlgo = 'jaro' | 'damerau';

function jaroDistance(a: string, b: string): number {
  if (a === b) return 1;
  const lenA = a.length;
  const lenB = b.length;
  if (lenA === 0 || lenB === 0) return 0;

  const matchDistance = Math.floor(Math.max(lenA, lenB) / 2) - 1;
  const aMatches = new Array(lenA).fill(false);
  const bMatches = new Array(lenB).fill(false);
  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < lenA; i += 1) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, lenB);
    for (let j = start; j < end; j += 1) {
      if (bMatches[j]) continue;
      if (a[i] !== b[j]) continue;
      aMatches[i] = true;
      bMatches[j] = true;
      matches += 1;
      break;
    }
  }

  if (matches === 0) return 0;

  let k = 0;
  for (let i = 0; i < lenA; i += 1) {
    if (!aMatches[i]) continue;
    while (!bMatches[k]) {
      k += 1;
    }
    if (a[i] !== b[k]) {
      transpositions += 1;
    }
    k += 1;
  }

  return (
    (matches / lenA + matches / lenB + (matches - transpositions / 2) / matches) /
    3
  );
}

function damerauLevenshteinDistance(a: string, b: string): number {
  const lenA = a.length;
  const lenB = b.length;
  const maxDist = lenA + lenB;
  const dp: number[][] = Array.from({ length: lenA + 2 }, () => new Array(lenB + 2).fill(0));
  const da: Record<string, number> = {};
  const inf = maxDist;
  dp[0][0] = inf;
  for (let i = 0; i <= lenA; i += 1) {
    dp[i + 1][0] = inf;
    dp[i + 1][1] = i;
  }
  for (let j = 0; j <= lenB; j += 1) {
    dp[0][j + 1] = inf;
    dp[1][j + 1] = j;
  }
  for (let i = 1; i <= lenA; i += 1) {
    let db = 0;
    for (let j = 1; j <= lenB; j += 1) {
      const i1 = da[b[j - 1]] ?? 0;
      const j1 = db;
      let cost = 1;
      if (a[i - 1] === b[j - 1]) {
        cost = 0;
        db = j;
      }
      dp[i + 1][j + 1] = Math.min(
        dp[i][j] + cost,
        dp[i + 1][j] + 1,
        dp[i][j + 1] + 1,
        dp[i1][j1] + (i - i1 - 1) + 1 + (j - j1 - 1)
      );
    }
    da[a[i - 1]] = i;
  }

  return 1 - dp[lenA + 1][lenB + 1] / Math.max(lenA, lenB, 1);
}

export function similarity(
  a: string,
  b: string,
  options: { algo?: SimilarityAlgo } = {}
): number {
  const algo = options.algo ?? 'jaro';
  if (!a || !b) return 0;
  if (algo === 'damerau') {
    return damerauLevenshteinDistance(a, b);
  }
  return jaroDistance(a, b);
}

interface MatchOptions {
  thresholds: MatchThresholds;
  toleranceAccents: boolean;
}

interface CandidateScore {
  amalgame: PersonEntry;
  prenomScore: number;
  nomScore: number;
  passionScore: number;
  combined: number;
  inversion: boolean;
}

function computeCandidate(
  commande: PersonEntry,
  amalgame: PersonEntry,
  options: MatchOptions
): CandidateScore {
  const { thresholds, toleranceAccents } = options;
  const prenomComparison = compareStrings(commande.prenom, amalgame.prenom, {
    toleranceAccents
  });
  const nomComparison = compareStrings(commande.nom, amalgame.nom, {
    toleranceAccents
  });

  const prenomScore = similarity(prenomComparison.normalizedA, prenomComparison.normalizedB);
  const nomScore = similarity(nomComparison.normalizedA, nomComparison.normalizedB);

  let passionScore = 0;
  if (commande.passion && amalgame.passion) {
    const passionComparison = compareStrings(commande.passion, amalgame.passion, {
      toleranceAccents
    });
    passionScore = similarity(
      passionComparison.normalizedA,
      passionComparison.normalizedB,
      { algo: 'damerau' }
    );
  }

  const inversionPrenomComparison = compareStrings(commande.prenom, amalgame.nom, {
    toleranceAccents
  });
  const inversionNomComparison = compareStrings(commande.nom, amalgame.prenom, {
    toleranceAccents
  });
  const inversionPrenom = similarity(
    inversionPrenomComparison.normalizedA,
    inversionPrenomComparison.normalizedB
  );
  const inversionNom = similarity(
    inversionNomComparison.normalizedA,
    inversionNomComparison.normalizedB
  );
  const inversion =
    inversionPrenom >= thresholds.nom && inversionNom >= thresholds.prenom &&
    prenomScore < thresholds.prenom &&
    nomScore < thresholds.nom;

  const availableScores = [prenomScore, nomScore];
  if (commande.passion || amalgame.passion) {
    availableScores.push(passionScore);
  }
  const combined = availableScores.reduce((acc, value) => acc + value, 0) / availableScores.length;

  return {
    amalgame,
    prenomScore,
    nomScore,
    passionScore,
    combined,
    inversion
  };
}

export function matchEntries(
  commande: PersonEntry[],
  amalgames: PersonEntry[],
  thresholds: MatchThresholds,
  toleranceAccents: boolean
): MatchResult[] {
  const options: MatchOptions = { thresholds, toleranceAccents };
  const results: MatchResult[] = [];
  const usedAmalgames = new Set<string>();

  commande.forEach((commandeEntry) => {
    const candidates = amalgames.map((amalgame) => computeCandidate(commandeEntry, amalgame, options));
    candidates.sort((a, b) => b.combined - a.combined);
    const best = candidates[0];

    if (!best || best.combined === 0) {
      results.push({
        id: `${commandeEntry.hash}-missing`,
        commande: commandeEntry,
        status: 'missing',
        score: 0
      });
      return;
    }

    if (best.inversion) {
      results.push({
        id: `${commandeEntry.hash}-inversion`,
        commande: commandeEntry,
        amalgame: best.amalgame,
        status: 'inversion',
        score: (best.prenomScore + best.nomScore) / 2,
        inversion: true,
        reasons: ['Inversion prénom/nom détectée']
      });
      usedAmalgames.add(best.amalgame.hash);
      return;
    }

    if (
      best.prenomScore >= thresholds.prenom &&
      best.nomScore >= thresholds.nom &&
      (!commandeEntry.passion || !best.amalgame.passion || best.passionScore >= thresholds.passion)
    ) {
      results.push({
        id: `${commandeEntry.hash}-match`,
        commande: commandeEntry,
        amalgame: best.amalgame,
        status: 'match',
        score: best.combined
      });
      usedAmalgames.add(best.amalgame.hash);
      return;
    }

    if (best.combined >= 0.7) {
      results.push({
        id: `${commandeEntry.hash}-typo`,
        commande: commandeEntry,
        amalgame: best.amalgame,
        status: 'typo',
        score: best.combined,
        suggestion: `${best.amalgame.prenom} ${best.amalgame.nom}`,
        reasons: ['Probable coquille détectée']
      });
      usedAmalgames.add(best.amalgame.hash);
      return;
    }

    results.push({
      id: `${commandeEntry.hash}-missing`,
      commande: commandeEntry,
      status: 'missing',
      score: best.combined,
      reasons: ['Aucun amalgame correspondant']
    });
  });

  amalgames.forEach((amalgame) => {
    if (!usedAmalgames.has(amalgame.hash)) {
      const exists = results.some((result) => result.amalgame?.hash === amalgame.hash);
      if (!exists) {
        results.push({
          id: `${amalgame.hash}-extra`,
          amalgame,
          status: 'extra',
          score: 0
        });
      }
    }
  });

  return results;
}
