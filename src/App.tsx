import { useCallback, useMemo, useState, type ChangeEvent, type MouseEvent } from 'react';

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

type ColumnHints = {
  prenom: number;
  nom: number;
};

const INITIAL_DATASET: DatasetState = {
  loading: false,
  people: [],
  errors: []
};

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

const LETTER_PATTERN = /[A-Za-zÀ-ÖØ-öø-ÿ]/;
const RAW_HONORIFIC_TOKENS = [
  'm',
  'm.',
  'mr',
  'mme',
  'mlle',
  'monsieur',
  'madame',
  'maitre',
  'maître',
  'dr',
  'docteur'
];
const RAW_BANNED_TOKENS = [
  'adresse',
  'amalgame',
  'badge',
  'badges',
  'bondecommande',
  'civilite',
  'commande',
  'compagnie',
  'contact',
  'coquilles',
  'correspondants',
  'date',
  'email',
  'entreprise',
  'facturation',
  'facture',
  'fonction',
  'anglais',
  'allemand',
  'arabe',
  'atelier',
  'ateliers',
  'chinois',
  'espagnol',
  'italien',
  'langue',
  'langues',
  'liste',
  'livraison',
  'loisir',
  'loisirs',
  'groupe',
  'groupes',
  'equipe',
  'equipes',
  'hobby',
  'hobbies',
  'neerlandais',
  'manquants',
  'montant',
  'musique',
  'japonais',
  'role',
  'roles',
  'portugais',
  'ocr',
  'option',
  'page',
  'passion',
  'passions',
  'nom',
  'noms',
  'russe',
  'portable',
  'team',
  'teams',
  'prenom',
  'prix',
  'quantite',
  'quantites',
  'rapport',
  'reference',
  'societe',
  'status',
  'telephone',
  'total',
  'ttc',
  'ville'
];
const PDF_LINE_SKIP_KEYWORDS = [
  'rapport',
  'checkbadges',
  'ocr',
  'date',
  'correspondants',
  'manquants',
  'coquilles',
  'inversions',
  'montant',
  'total',
  'facture',
  'facturation',
  'livraison',
  'adresse',
  'bondecommande',
  'reference',
  'contact'
];

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase();
}

function normalizeHeader(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

function normalizeToken(value: string): string {
  return normalizeHeader(value).replace(/_/g, '');
}

const HONORIFIC_TOKENS = new Set(RAW_HONORIFIC_TOKENS.map((token) => normalizeToken(token)));
const BANNED_TOKENS = new Set(RAW_BANNED_TOKENS.map((token) => normalizeToken(token)));

function splitIntoColumns(line: string): string[] {
  return line.split(/\s{2,}|;|,|\t|\|/).map((value) => value.trim());
}

function looksLikeSurname(value: string): boolean {
  const sanitized = value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ'’\-\s]/g, '');
  if (!sanitized) {
    return false;
  }
  const upper = sanitized.toUpperCase();
  const lower = sanitized.toLowerCase();
  if (sanitized === upper && sanitized !== lower) {
    return true;
  }
  if (sanitized.includes('-') || sanitized.includes(' ')) {
    const parts = sanitized.split(/[-\s]+/).filter(Boolean);
    if (parts.length >= 2 && parts.every((part) => part === part.toUpperCase() || part[0] === part[0].toUpperCase())) {
      return true;
    }
  }
  return false;
}

function looksLikeFirstNameCandidate(value: string): boolean {
  const sanitized = value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ'’\-\s]/g, '');
  if (!sanitized) {
    return false;
  }
  const upper = sanitized.toUpperCase();
  const lower = sanitized.toLowerCase();
  if (sanitized === upper && sanitized !== lower) {
    return sanitized.length <= 4;
  }
  return sanitized[0] === sanitized[0].toUpperCase();
}

function parseTokensIntoName(rawTokens: string[]): { prenom: string; nom: string } | null {
  let tokens = rawTokens
    .map(cleanNameToken)
    .map((token) => token.trim())
    .filter((token) => token.length > 0 && LETTER_PATTERN.test(token));

  while (tokens.length > 0 && HONORIFIC_TOKENS.has(normalizeToken(tokens[0]))) {
    tokens.shift();
  }

  while (tokens.length > 0 && BANNED_TOKENS.has(normalizeToken(tokens[tokens.length - 1]))) {
    tokens.pop();
  }

  if (tokens.length < 2) {
    return null;
  }

  const prenom = tokens.shift()!;
  const nomTokens = tokens.filter((token) => !BANNED_TOKENS.has(normalizeToken(token)));

  if (nomTokens.length === 0) {
    return null;
  }

  const nom = nomTokens.join(' ');

  if (!isLikelyName(prenom) || !isLikelyName(nom)) {
    return null;
  }

  return { prenom, nom };
}

function parseColumnsIntoName(columns: string[], columnHints?: ColumnHints): { prenom: string; nom: string } | null {
  const tryPair = (prenomIndex: number, nomIndex: number) => {
    if (prenomIndex < 0 || nomIndex < 0) {
      return null;
    }
    if (prenomIndex >= columns.length || nomIndex >= columns.length) {
      return null;
    }
    const prenom = cleanNameToken(columns[prenomIndex]);
    const nom = cleanNameToken(columns[nomIndex]);
    if (!prenom || !nom) {
      return null;
    }
    if (!isLikelyName(prenom) || !isLikelyName(nom)) {
      return null;
    }
    return { prenom, nom };
  };

  if (columnHints) {
    const parsed = tryPair(columnHints.prenom, columnHints.nom);
    if (parsed) {
      return parsed;
    }
  }

  if (columns.length >= 2) {
    const parsed = tryPair(0, 1);
    if (parsed) {
      return parsed;
    }
  }

  if (columns.length === 1) {
    const tokens = columns[0].split(/\s+/).filter(Boolean);
    const parsed = parseTokensIntoName(tokens);
    if (parsed) {
      return parsed;
    }
  }

  if (columns.length > 1) {
    const tokens = columns.flatMap((column) => column.split(/\s+/)).filter(Boolean);
    return parseTokensIntoName(tokens);
  }

  return null;
}

function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

function stringToUint8Array(value: string): Uint8Array {
  const array = new Uint8Array(value.length);
  for (let index = 0; index < value.length; index += 1) {
    array[index] = value.charCodeAt(index) & 0xff;
  }
  return array;
}

function asciiHexDecode(data: Uint8Array): Uint8Array {
  const text = new TextDecoder('latin1', { fatal: false }).decode(data);
  let buffer = '';
  const bytes: number[] = [];

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '>') {
      break;
    }
    if (/\s/.test(char)) {
      continue;
    }
    if (!/[0-9A-Fa-f]/.test(char)) {
      throw new Error('Caractère ASCIIHex invalide dans le flux PDF.');
    }
    buffer += char;
  }

  if (buffer.length % 2 === 1) {
    buffer += '0';
  }

  for (let index = 0; index < buffer.length; index += 2) {
    bytes.push(Number.parseInt(buffer.slice(index, index + 2), 16));
  }

  return new Uint8Array(bytes);
}

function ascii85Decode(data: Uint8Array): Uint8Array {
  const text = new TextDecoder('latin1', { fatal: false }).decode(data);
  const bytes: number[] = [];
  const chunk = [0, 0, 0, 0, 0];
  let count = 0;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (char === '~') {
      break;
    }

    if (/\s/.test(char)) {
      continue;
    }

    if (char === 'z') {
      if (count !== 0) {
        throw new Error('Caractère "z" inattendu dans un bloc ASCII85.');
      }
      bytes.push(0, 0, 0, 0);
      continue;
    }

    const code = char.charCodeAt(0);
    if (code < 33 || code > 117) {
      throw new Error('Caractère ASCII85 invalide dans le flux PDF.');
    }

    chunk[count] = code - 33;
    count += 1;

    if (count === 5) {
      let value = 0;
      for (let offset = 0; offset < 5; offset += 1) {
        value = value * 85 + chunk[offset];
      }
      for (let byteIndex = 3; byteIndex >= 0; byteIndex -= 1) {
        bytes.push((value >> (byteIndex * 8)) & 0xff);
      }
      count = 0;
    }
  }

  if (count > 0) {
    for (let fill = count; fill < 5; fill += 1) {
      chunk[fill] = 84;
    }
    let value = 0;
    for (let offset = 0; offset < 5; offset += 1) {
      value = value * 85 + chunk[offset];
    }
    const bytesToKeep = count - 1;
    for (let byteIndex = 0; byteIndex < bytesToKeep; byteIndex += 1) {
      const shift = 24 - byteIndex * 8;
      bytes.push((value >> shift) & 0xff);
    }
  }

  return new Uint8Array(bytes);
}

async function inflateStream(data: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error("Décompression FlateDecode indisponible dans ce navigateur.");
  }

  const decompressionStream = new DecompressionStream('deflate');
  const inputBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
  const response = new Response(new Blob([inputBuffer]).stream().pipeThrough(decompressionStream));
  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}

type PdfTextExtraction = {
  lines: string[];
  errors: string[];
};

function shouldSkipPdfLine(line: string): boolean {
  const normalized = normalizeHeader(line);
  if (normalized.includes('prenom') && normalized.includes('nom')) {
    return false;
  }
  return PDF_LINE_SKIP_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function decodePdfStringLiteral(source: string, startIndex: number): { value: string; nextIndex: number } {
  let index = startIndex + 1;
  let nesting = 1;
  let value = '';

  while (index < source.length && nesting > 0) {
    const char = source[index];

    if (char === '\\') {
      index += 1;
      if (index >= source.length) {
        break;
      }

      const nextChar = source[index];

      if (/[0-7]/.test(nextChar)) {
        let octal = nextChar;
        index += 1;
        for (let count = 0; count < 2 && index < source.length; count += 1) {
          const digit = source[index];
          if (/[0-7]/.test(digit)) {
            octal += digit;
            index += 1;
          } else {
            break;
          }
        }
        value += String.fromCharCode(parseInt(octal, 8));
        continue;
      }

      const escapeMap: Record<string, string> = {
        n: '\n',
        r: '\r',
        t: '\t',
        b: '\b',
        f: '\f',
        '(': '(',
        ')': ')',
        '\\': '\\'
      };

      value += escapeMap[nextChar] ?? nextChar;
      index += 1;
      continue;
    }

    if (char === '(') {
      nesting += 1;
      value += char;
      index += 1;
      continue;
    }

    if (char === ')') {
      nesting -= 1;
      if (nesting === 0) {
        index += 1;
        break;
      }
      value += char;
      index += 1;
      continue;
    }

    value += char;
    index += 1;
  }

  return { value, nextIndex: index };
}

function decodePdfStringArray(source: string, startIndex: number): { value: string; nextIndex: number } {
  let index = startIndex + 1;
  let result = '';
  let pendingSpace = false;

  while (index < source.length) {
    const char = source[index];

    if (char === '(') {
      if (pendingSpace && result && !result.endsWith(' ')) {
        result += ' ';
        pendingSpace = false;
      }
      const decoded = decodePdfStringLiteral(source, index);
      result += decoded.value;
      index = decoded.nextIndex;
      continue;
    }

    if (char === ']') {
      return { value: result, nextIndex: index + 1 };
    }

    if (char === '-' || (char >= '0' && char <= '9')) {
      const match = source.slice(index).match(/^(-?\d+(?:\.\d+)?)/);
      if (match) {
        const numeric = Number.parseFloat(match[1]);
        if (Number.isFinite(numeric) && Math.abs(numeric) > 80) {
          pendingSpace = true;
        }
        index += match[1].length;
        continue;
      }
    }

    index += 1;
  }

  return { value: result, nextIndex: source.length };
}

function parsePdfTextStream(content: string): string[] {
  const lines: string[] = [];
  let current = '';

  const pushCurrent = () => {
    const trimmed = current.replace(/\s+/g, ' ').trim();
    if (trimmed) {
      lines.push(trimmed);
    }
    current = '';
  };

  let index = 0;
  while (index < content.length) {
    const char = content[index];

    if (char === '(') {
      const decoded = decodePdfStringLiteral(content, index);
      current += decoded.value;
      index = decoded.nextIndex;
      continue;
    }

    if (char === '[') {
      const decoded = decodePdfStringArray(content, index);
      current += decoded.value;
      index = decoded.nextIndex;
      continue;
    }

    if (char === 'T') {
      const operator = content.slice(index, index + 2);

      if (operator === 'T*') {
        index += 2;
        pushCurrent();
        continue;
      }

      if (operator === 'Td' || operator === 'TD') {
        index += 2;
        pushCurrent();
        continue;
      }

      if (operator === 'Tj') {
        index += 2;
        continue;
      }

      if (content.startsWith('TJ', index)) {
        index += 2;
        continue;
      }

      if (operator === 'Tm') {
        index += 2;
        pushCurrent();
        continue;
      }
    }

    if (char === '\'' || char === '"') {
      index += 1;
      pushCurrent();
      continue;
    }

    if (content.startsWith('BT', index) || content.startsWith('ET', index)) {
      index += 2;
      pushCurrent();
      continue;
    }

    index += 1;
  }

  pushCurrent();
  return lines;
}

async function extractPdfLines(file: File): Promise<PdfTextExtraction> {
  const errors: string[] = [];
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const content = new TextDecoder('latin1', { fatal: false }).decode(bytes);
  const regex = /<<([\s\S]*?)>>\s*stream\r?\n([\s\S]*?)\r?\nendstream/g;
  const lines: string[] = [];
  const unsupportedFilters = new Set<string>();

  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    const dictionary = match[1];
    const rawStream = match[2];

    if (/\/Subtype\s*\/Image/i.test(dictionary)) {
      continue;
    }

    const filters: string[] = [];
    const filterRegex = /\/Filter\s*(?:\[(.*?)\]|\/([A-Za-z0-9\.]+))/g;
    let filterMatch: RegExpExecArray | null;

    while ((filterMatch = filterRegex.exec(dictionary)) !== null) {
      if (filterMatch[2]) {
        filters.push(filterMatch[2]);
        continue;
      }
      if (filterMatch[1]) {
        filterMatch[1]
          .split(/\s+/)
          .map((token) => token.replace('/', '').trim())
          .filter((token) => token.length > 0)
          .forEach((token) => filters.push(token));
      }
    }

    let streamData = stringToUint8Array(rawStream);

    let filterError = false;

    if (filters.length > 0) {
      for (const filter of filters) {
        const normalized = filter.replace(/[^A-Za-z]/g, '').toLowerCase();
        try {
          if (normalized === 'flatedecode' || normalized === 'fl') {
            streamData = await inflateStream(streamData);
            continue;
          }
          if (normalized === 'ascii85decode' || normalized === 'a85') {
            streamData = ascii85Decode(streamData);
            continue;
          }
          if (normalized === 'asciihexdecode' || normalized === 'ahx') {
            streamData = asciiHexDecode(streamData);
            continue;
          }
          if (!unsupportedFilters.has(filter)) {
            unsupportedFilters.add(filter);
            errors.push(`Filtre PDF non pris en charge (${filter}).`);
          }
          filterError = true;
          break;
        } catch (error) {
          errors.push(
            `Impossible d'appliquer le filtre ${filter}: ${error instanceof Error ? error.message : 'erreur inconnue'}.`
          );
          filterError = true;
          break;
        }
      }
    }

    if (filterError) {
      continue;
    }

    const streamText = new TextDecoder('latin1', { fatal: false }).decode(streamData);
    const textLines = parsePdfTextStream(streamText);
    lines.push(...textLines);
  }

  return { lines, errors };
}

function cleanNameToken(token: string): string {
  return token
    .replace(/^[^A-Za-zÀ-ÖØ-öø-ÿ'’\-]+/g, '')
    .replace(/[^A-Za-zÀ-ÖØ-öø-ÿ'’\-]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isLikelyName(value: string): boolean {
  if (!value) {
    return false;
  }
  if (!LETTER_PATTERN.test(value)) {
    return false;
  }
  if (/\d/.test(value)) {
    return false;
  }
  const normalized = normalizeToken(value);
  if (!normalized || normalized.length < 2) {
    return false;
  }
  if (BANNED_TOKENS.has(normalized)) {
    return false;
  }
  return true;
}

function parsePdfLine(line: string, columnHints?: ColumnHints): { prenom: string; nom: string } | null {
  const withoutIndex = line.replace(/^[0-9]+(?:[.)\s-]+|(?:er|e)?\s+)/i, '');
  const columnSource = withoutIndex.replace(/^\s+/, '');
  const sanitized = columnSource.replace(/\s+/g, ' ').trim();

  if (!sanitized || !LETTER_PATTERN.test(sanitized)) {
    return null;
  }

  const columns = splitIntoColumns(columnSource);
  const columnResult = parseColumnsIntoName(columns, columnHints);
  if (columnResult) {
    return columnResult;
  }

  const tokens = sanitized.split(/\s+/);
  return parseTokensIntoName(tokens);
}

function parsePdfLines(lines: string[]): HeaderOutcome {
  const errors: string[] = [];
  const people: Person[] = [];

  const headerIndex = lines.findIndex((line) => {
    const normalized = normalizeHeader(line);
    return normalized.includes('prenom') && normalized.includes('nom');
  });

  const startIndex = headerIndex >= 0 ? headerIndex + 1 : 0;
  let columnHints: ColumnHints | undefined;

  if (headerIndex >= 0) {
    const columns = splitIntoColumns(lines[headerIndex]);
    const normalizedColumns = columns.map((value) => normalizeHeader(value));
    const prenomIndex = normalizedColumns.findIndex((value) => value.includes('prenom'));
    const nomIndex = normalizedColumns.findIndex((value) => value.includes('nom'));
    if (prenomIndex !== -1 && nomIndex !== -1) {
      columnHints = { prenom: prenomIndex, nom: nomIndex };
    }
  }

  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index];

    if (shouldSkipPdfLine(line)) {
      continue;
    }

    const parsed = parsePdfLine(line, columnHints);
    if (!parsed) {
      continue;
    }

    people.push({
      prenom: parsed.prenom,
      nom: parsed.nom,
      normalized: normalizeText(`${parsed.prenom} ${parsed.nom}`),
      lineNumber: index + 1
    });
  }

  if (people.length === 0 && headerIndex === -1) {
    const fallback: Person[] = [];

    let pending: { value: string; lineNumber: number; looksLikeSurname: boolean } | null = null;

    lines.forEach((line, index) => {
      if (shouldSkipPdfLine(line)) {
        pending = null;
        return;
      }

      const parsed = parsePdfLine(line, columnHints);
      if (parsed) {
        fallback.push({
          prenom: parsed.prenom,
          nom: parsed.nom,
          normalized: normalizeText(`${parsed.prenom} ${parsed.nom}`),
          lineNumber: index + 1
        });
        pending = null;
        return;
      }

      const sanitized = line.replace(/\s+/g, ' ').trim();
      if (!sanitized || !LETTER_PATTERN.test(sanitized)) {
        pending = null;
        return;
      }

      const tokens = sanitized.split(/\s+/).map(cleanNameToken).filter((token) => token.length > 0);

      const tokensResult = parseTokensIntoName(tokens);
      if (tokensResult) {
        fallback.push({
          prenom: tokensResult.prenom,
          nom: tokensResult.nom,
          normalized: normalizeText(`${tokensResult.prenom} ${tokensResult.nom}`),
          lineNumber: index + 1
        });
        pending = null;
        return;
      }

      if (tokens.length !== 1) {
        pending = null;
        return;
      }

      const token = tokens[0];
      if (token.length > 40) {
        pending = null;
        return;
      }
      if (!isLikelyName(token)) {
        pending = null;
        return;
      }

      const tokenLooksLikeSurname = looksLikeSurname(token);
      const tokenLooksLikeFirst = looksLikeFirstNameCandidate(token);

      if (pending) {
        let prenom = pending.value;
        let nom = token;
        if (pending.looksLikeSurname && tokenLooksLikeFirst && !tokenLooksLikeSurname) {
          prenom = token;
          nom = pending.value;
        }
        if (!pending.looksLikeSurname && tokenLooksLikeSurname && !tokenLooksLikeFirst) {
          prenom = pending.value;
          nom = token;
        }
        if (isLikelyName(prenom) && isLikelyName(nom)) {
          fallback.push({
            prenom,
            nom,
            normalized: normalizeText(`${prenom} ${nom}`),
            lineNumber: pending.lineNumber
          });
          pending = null;
          return;
        }
      }

      pending = {
        value: token,
        lineNumber: index + 1,
        looksLikeSurname: tokenLooksLikeSurname
      };
    });

    if (fallback.length >= 3) {
      people.push(...fallback);
      errors.push("Colonnes prénom et nom non détectées : extraction approximative depuis le PDF.");
    }
  }

  if (people.length === 0) {
    errors.push("Aucune donnée exploitable n'a été identifiée dans le PDF. Vérifiez que le document contient un tableau avec les colonnes prénom et nom.");
  }

  return { people, errors, hasNameColumns: Boolean(columnHints) };
}

async function parsePdfFile(file: File): Promise<Omit<DatasetState, 'loading'>> {
  const { lines, errors } = await extractPdfLines(file);
  const outcome = parsePdfLines(lines);
  return {
    fileName: file.name,
    people: outcome.people,
    errors: [...errors, ...outcome.errors]
  };
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

    if (!isPdfFile(file)) {
      setState({
        fileName: file.name,
        loading: false,
        people: [],
        errors: ['Format de fichier non pris en charge. Veuillez importer un PDF.']
      });
      return;
    }

    setState({
      fileName: file.name,
      loading: true,
      people: [],
      errors: []
    });

    try {
      const result = await parsePdfFile(file);
      setState({
        fileName: result.fileName,
        loading: false,
        people: result.people,
        errors: result.errors
      });
    } catch (error) {
      setState({
        fileName: file.name,
        loading: false,
        people: [],
        errors: [`Impossible de traiter ${file.name}: ${error instanceof Error ? error.message : 'erreur inconnue'}`]
      });
    }
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
        <span>Sélectionner un fichier PDF</span>
        <input
          type="file"
          accept=".pdf"
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
          Analysez en un coup d&apos;œil les écarts entre la commande et les badges produits. Tout se déroule hors-ligne pour mettre
          en lumière les manquants, les doublons et les anomalies.
        </p>
        <div className="layout__tags">
          <span className="layout__tag">
            <span className="layout__tag-dot" aria-hidden="true" />
            Analyse locale
          </span>
          <span className="layout__tag">
            <span className="layout__tag-dot layout__tag-dot--secondary" aria-hidden="true" />
            Anomalies ciblées
          </span>
        </div>
      </header>

      <div className="layout__grid">
        <DatasetPanel
          title="Bon de commande"
          description="PDF du bon de commande avec les colonnes Prénom/Nom bien identifiées pour chaque participant."
          state={commandeState}
          onChange={handleCommandeChange}
        />
        <DatasetPanel
          title="Liste de badges"
          description="PDF produit après fabrication des badges : les prénoms et noms sont normalisés (casse et accents ignorés)."
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
