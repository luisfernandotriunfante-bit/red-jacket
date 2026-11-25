import { describe, expect, it } from 'vitest';
import {
  code,
  digits,
  ean,
  eanFromDun,
  key,
  num,
  resolveEan,
  text,
  zeroToNull,
} from './normalize';

describe('normalização', () => {
  it('compara nomes sem acento, espaço ou ponto', () => {
    expect(key('Cód. Barras')).toBe('codbarras');
    expect(key(' Bloqueado(Qt.Bloq.-Qt.Avaria)')).toBe(
      'bloqueadoqtbloqqtavaria',
    );
  });

  it('limpa texto vazio e marcadores de ausência', () => {
    expect(text(null)).toBe('');
    expect(text(' nan ')).toBe('');
    expect(text('Não cadastrado')).toBe('');
    expect(text('  ABC ')).toBe('ABC');
  });

  it('lê números com vírgula decimal', () => {
    expect(num('1,5')).toBe(1.5);
    expect(num(7)).toBe(7);
    expect(num('abc')).toBeNull();
    expect(num(null)).toBeNull();
    expect(zeroToNull(0)).toBeNull();
    expect(zeroToNull('2')).toBe(2);
  });

  it('extrai dígitos, EAN e códigos sem zeros à esquerda', () => {
    expect(digits('7891024.0')).toBe('7891024');
    expect(ean('0007891024110123')).toBe('7891024110123');
    expect(ean('1234567')).toBe('1234567');
    expect(code('000123')).toBe('123');
  });

  it('converte DUN-14 em EAN-13 só quando o EAN existe', () => {
    const e13 = '7891024110126';
    const dun = `1${e13.slice(0, 12)}0`;
    expect(eanFromDun(dun)).toBe(e13);
    expect(resolveEan(dun, new Set([e13]))).toBe(e13);
    expect(resolveEan(dun, new Set())).toBe(dun);
  });
});
