export type Cell = string | number | boolean | Date | null;
export type Matrix = Cell[][];

export type AuditSeverity = 'ERRO' | 'AVISO' | 'INFO';

export type AuditItem = {
  code: string;
  severity: AuditSeverity;
  message: string;
  count?: number;
};

export type ColumnSpec = {
  group: string;
  name: string;
  source: string;
};

export type BaseValue = string | number | null;
export type BaseRow = Record<string, BaseValue>;

export type EngineResult = {
  engine: string;
  columns: ColumnSpec[];
  rows: BaseRow[];
  audit: AuditItem[];
};

/** Erro que bloqueia o processamento: a base anterior não deve ser substituída. */
export class EngineBlockError extends Error {
  constructor(message: string) {
    super(`BLOQUEIO: ${message}`);
    this.name = 'EngineBlockError';
  }
}
