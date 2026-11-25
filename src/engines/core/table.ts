import * as XLSX from 'xlsx';
import { EngineBlockError, type Cell, type Matrix } from './types';
import { key, text } from './normalize';

export type Workbook = {
  sheetNames: string[];
  sheet: (name?: string) => Matrix;
};

function fromRaw(value: unknown): Cell {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return value;
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  )
    return value;
  return null;
}

/** Lê um xlsx/xls já carregado em memória. */
export function readWorkbook(data: ArrayBuffer | Uint8Array): Workbook {
  const wb = XLSX.read(data, { type: 'array', cellDates: true });
  return {
    sheetNames: wb.SheetNames,
    sheet: (name) => {
      const target = name ?? wb.SheetNames[0];
      const ws = target ? wb.Sheets[target] : undefined;
      if (!ws) throw new EngineBlockError(`aba não encontrada: ${name ?? ''}`);
      const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, {
        header: 1,
        raw: true,
        defval: null,
        blankrows: true,
      });
      return raw.map((line) => line.map(fromRaw));
    },
  };
}

/** Planilha com acesso às colunas pelo nome (sem acento, espaço ou ponto). */
export class Table {
  readonly headers: string[];
  readonly rows: Cell[][];
  private readonly index = new Map<string, number>();

  constructor(headers: string[], rows: Cell[][]) {
    this.headers = headers;
    this.rows = rows;
    headers.forEach((h, i) => {
      const k = key(h);
      if (!this.index.has(k)) this.index.set(k, i);
    });
  }

  /** Acha a linha de cabeçalho (a primeira que contém todos os nomes exigidos). */
  static fromMatrix(matrix: Matrix, required: string[] = []): Table {
    const need = required.map(key);
    let headerAt = 0;
    for (let i = 0; i < Math.min(matrix.length, 30); i += 1) {
      const line = matrix[i] ?? [];
      const present = new Set(
        line.filter((c) => text(c) !== '').map((c) => key(text(c))),
      );
      if (need.every((n) => present.has(n))) {
        headerAt = i;
        break;
      }
    }
    const headers = (matrix[headerAt] ?? []).map((c, j) =>
      text(c) !== '' ? text(c) : `_sem_titulo_${j}`,
    );
    const rows = matrix
      .slice(headerAt + 1)
      .filter((line) => line.some((c) => c !== null && text(c) !== ''));
    return new Table(headers, rows);
  }

  has(...names: string[]): boolean {
    return names.every((n) => this.index.has(key(n)));
  }

  /** Posição da coluna; erro de bloqueio se for obrigatória e não existir. */
  pos(name: string, required = false): number | undefined {
    const i = this.index.get(key(name));
    if (i === undefined && required) {
      throw new EngineBlockError(`coluna obrigatória ausente: ${name}`);
    }
    return i;
  }

  /** Primeira coluna cujo nome normalizado começa com o prefixo. */
  posStarting(prefix: string): number | undefined {
    const p = key(prefix);
    for (const [k, i] of this.index) if (k.startsWith(p)) return i;
    return undefined;
  }

  get(row: Cell[], name: string): Cell {
    const i = this.pos(name);
    return i === undefined ? null : (row[i] ?? null);
  }

  at(row: Cell[], position: number | undefined): Cell {
    return position === undefined ? null : (row[position] ?? null);
  }

  withRows(rows: Cell[][]): Table {
    return new Table(this.headers, rows);
  }
}
