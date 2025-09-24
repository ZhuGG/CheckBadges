const DIACRITICS_REGEX = /[\u0300-\u036f]/g;
const PUNCTUATION_REGEX = /[\p{P}\p{S}]+/gu;

export function normalizeName(value: string): string {
  if (!value) {
    return '';
  }
  const trimmed = value
    .normalize('NFD')
    .replace(DIACRITICS_REGEX, '')
    .replace(PUNCTUATION_REGEX, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return trimmed;
}

export function normalizeForHash(value: string): string {
  return normalizeName(value)
    .replace(/\s+/g, ' ')
    .trim();
}

export function computeEntryHash(prenom: string, nom: string, passion?: string): string {
  const parts = [normalizeForHash(prenom), normalizeForHash(nom)];
  if (passion) {
    parts.push(normalizeForHash(passion));
  }
  return parts.join('|');
}

export function compareStrings(
  a: string,
  b: string,
  options: { toleranceAccents?: boolean } = {}
): { normalizedA: string; normalizedB: string } {
  const { toleranceAccents = true } = options;
  const normalize = (value: string) => {
    const lower = value.normalize('NFD');
    const cleaned = toleranceAccents
      ? lower.replace(DIACRITICS_REGEX, '')
      : lower;
    return cleaned
      .replace(PUNCTUATION_REGEX, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  };

  return { normalizedA: normalize(a), normalizedB: normalize(b) };
}
