import fr from '../locales/fr.json';

type Messages = Record<string, string>;

const messages: Messages = fr as Messages;

export function t(key: string, fallback: string): string {
  return messages[key] ?? fallback;
}
