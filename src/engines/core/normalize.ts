import type { Cell } from './types';

/** Remove acentos. */
export function unaccent(value: string): string {
  return value.normalize('NFD').replace(/\p{Mn}/gu, '');
}

/** Nome comparável: minúsculo, sem acento, só letras e números. */
export function key(value: unknown): string {
  const raw =
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
      ? String(value)
      : '';
  return unaccent(raw)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function isEmptyCell(value: Cell | undefined): value is null | undefined {
  return value === null || value === undefined;
}

/** Texto limpo; vazio para nulo, NAN/NAT/NONE e "não cadastrado". */
export function text(value: Cell | undefined): string {
  if (isEmptyCell(value)) return '';
  if (value instanceof Date) return value.toISOString();
  const t = String(value).trim();
  if (['NAN', 'NAT', 'NONE'].includes(t.toUpperCase())) return '';
  if (key(t) === 'naocadastrado') return '';
  return t;
}

/** Número; aceita vírgula decimal. Nulo quando não é número. */
export function num(value: Cell | undefined): number | null {
  if (isEmptyCell(value) || value instanceof Date) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'boolean') return null;
  const t = value.replace(',', '.').trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Só os dígitos do valor (descarta o ".0" que o Excel deixa em inteiros). */
export function digits(value: Cell | undefined): string {
  let t = text(value);
  if (/^-?\d+\.0+$/.test(t)) t = t.split('.')[0] ?? t;
  return t.replace(/\D/g, '');
}

/** EAN sem zeros à esquerda (a partir de 8 dígitos). */
export function ean(value: Cell | undefined): string {
  const d = digits(value);
  return d.length >= 8 ? d.replace(/^0+/, '') : d;
}

/** Código interno sem zeros à esquerda. */
export function code(value: Cell | undefined): string {
  return digits(value).replace(/^0+/, '');
}

/** Converte um DUN-14 em EAN-13 (dígito verificador recalculado). */
export function eanFromDun(dun14: string): string {
  const base = dun14.slice(1, 13);
  let sum = 0;
  for (let i = 0; i < base.length; i += 1) {
    sum += Number(base[i]) * (i % 2 === 0 ? 1 : 3);
  }
  return base + String((10 - (sum % 10)) % 10);
}

/** EAN normalizado; se for um DUN de 14 dígitos desconhecido, tenta o EAN-13 dele. */
export function resolveEan(
  value: Cell | undefined,
  known: Set<string>,
): string {
  const e = ean(value);
  if (known.has(e) || e.length !== 14) return e;
  const converted = eanFromDun(e);
  return known.has(converted) ? converted : e;
}

/** Número, mas zero vira vazio. */
export function zeroToNull(value: Cell | undefined): number | null {
  const n = num(value);
  return n === null || n === 0 ? null : n;
}
