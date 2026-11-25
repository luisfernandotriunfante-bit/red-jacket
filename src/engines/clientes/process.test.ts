import { describe, expect, it } from 'vitest';
import type { Matrix } from '../core/types';
import { doc, processClientes, type ClientesInput } from './process';

const names = { cadastro: 'a', carteira: 'b', piramide: 'c' };
const CNPJ1 = '11222333000181';

const input = (over: Partial<ClientesInput> = {}): ClientesInput => ({
  cadastro1203: [
    ['Código', 'CPF/CNPJ', 'Nome', 'Município'],
    [10, CNPJ1, 'MERCADO DO ZE LTDA', 'CUIABA'],
    [11, '12345678909', 'MARIA', 'VARZEA GRANDE'],
  ] as Matrix,
  carteira: [
    ['Relatório'],
    ['Código Cliente', 'Cliente', 'CNPJ', 'Dias Sem Comprar'],
    ['1 - VENDEDOR A'],
    [10, 'MERCADO DO ZE', CNPJ1, 'Cliente sem Compra'],
  ] as Matrix,
  piramide: [
    ['COD CLIENTE', 'TIPO', 'NOME_CLIENTE', 'FAIXAS', 'PERFIL'],
    [CNPJ1, 'CNPJ', 'MERCADO DO ZE LTDA', 'A', 'P1'],
    ['998877000199', 'CNPJ', 'FORA DO CADASTRO', 'B', 'P2'],
  ] as Matrix,
  ...over,
});

describe('doc', () => {
  it('repõe zeros conforme o tipo', () => {
    expect(doc('1234567890123', 'CNPJ')).toBe('01234567890123');
    expect(doc('123456789', 'CPF')).toBe('00123456789');
  });
});

describe('processClientes', () => {
  it('junta 1203, carteira e pirâmide por documento', () => {
    const r = processClientes(input(), names);
    expect(r.rows).toHaveLength(3);
    const ze = r.rows.find((x) => x.cnpj_cpf === CNPJ1);
    expect(ze?.nome).toBe('MERCADO DO ZE LTDA');
    expect(ze?.em_carteira_colgate).toBe('SIM');
    expect(ze?.dias_sem_comprar).toBeNull();
    expect(ze?.faixa).toBe('A');
    const fora = r.audit.find((a) => a.code === 'C12');
    expect(fora?.severity).toBe('AVISO');
    expect(fora?.records?.[0]?.key).toBe('00998877000199'.slice(-14));
  });

  it('bloqueia documento repetido no 1203', () => {
    const dup = input({
      cadastro1203: [
        ['Código', 'CPF/CNPJ', 'Nome'],
        [10, CNPJ1, 'A'],
        [11, CNPJ1, 'B'],
      ],
    });
    expect(() => processClientes(dup, names)).toThrow(/BLOQUEIO/);
  });
});
