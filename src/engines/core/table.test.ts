import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { readWorkbook } from './table';

function book(sheets: Record<string, unknown[][]>): Uint8Array {
  const wb = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name);
  }
  return new Uint8Array(
    XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer,
  );
}

describe('sheetWith', () => {
  const data = book({
    Capa: [['Relatório']],
    OutroNome: [
      ['SKU', 'Preço base'],
      ['1', 10],
    ],
  });

  it('acha a aba pelo conteúdo mesmo com nome de aba diferente', () => {
    const matrix = readWorkbook(data).sheetWith(['SKU', 'PRECO BASE'], 'data');
    expect(matrix[1]?.[0]).toBe('1');
  });

  it('bloqueia quando nenhuma aba tem as colunas', () => {
    expect(() => readWorkbook(data).sheetWith(['EAN'])).toThrow(/BLOQUEIO/);
  });
});
