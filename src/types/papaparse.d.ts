/* Minimal type declarations for papaparse usage in this project. */
declare module 'papaparse' {
  export type ParseError = {
    type: string;
    code: string;
    message: string;
    row: number;
  };

  export type ParseMeta = {
    aborted: boolean;
    cursor: number;
    delimiter: string;
    linebreak: string;
    truncated: boolean;
    fields?: string[];
  };

  export type ParseResult<T> = {
    data: T[];
    errors: ParseError[];
    meta: ParseMeta;
  };

  export type ParseConfig<T> = {
    header?: boolean;
    skipEmptyLines?: boolean | 'greedy';
    transformHeader?: (header: string) => string;
    complete?: (results: ParseResult<T>, file?: File) => void;
    error?: (error: ParseError) => void;
  };

  export interface PapaStatic {
    parse<T>(data: string | File | Blob, config?: ParseConfig<T>): ParseResult<T>;
  }

  const Papa: PapaStatic;
  export default Papa;
}
