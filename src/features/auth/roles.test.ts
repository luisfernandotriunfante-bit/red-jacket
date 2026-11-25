import { describe, expect, it } from 'vitest';
import {
  canChangeSite,
  canMaintainData,
  canSeeEngines,
  isAppRole,
} from './roles';

describe('papéis', () => {
  it('só CEO altera o site', () => {
    expect(canChangeSite('ceo')).toBe(true);
    for (const r of [
      'admin',
      'gerente',
      'supervisor',
      'vendedor',
      null,
    ] as const)
      expect(canChangeSite(r)).toBe(false);
  });
  it('CEO e admin fazem a manutenção de dados', () => {
    expect(canMaintainData('ceo')).toBe(true);
    expect(canMaintainData('admin')).toBe(true);
    expect(canMaintainData('gerente')).toBe(false);
    expect(canMaintainData('supervisor')).toBe(false);
  });
  it('gerente vê os motores, supervisor e vendedor não', () => {
    expect(canSeeEngines('gerente')).toBe(true);
    expect(canSeeEngines('supervisor')).toBe(false);
    expect(canSeeEngines('vendedor')).toBe(false);
  });
  it('reconhece só papéis válidos', () => {
    expect(isAppRole('ceo')).toBe(true);
    expect(isAppRole('dono')).toBe(false);
  });
});
