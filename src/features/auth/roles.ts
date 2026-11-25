export type AppRole = 'ceo' | 'admin' | 'gerente' | 'supervisor' | 'vendedor';

export interface RoleInfo {
  role: AppRole;
  supervisorCode: string | null;
  vendedorCode: string | null;
}

export const roleLabels: Record<AppRole, string> = {
  ceo: 'CEO',
  admin: 'Administrador',
  gerente: 'Gerente',
  supervisor: 'Supervisor',
  vendedor: 'Vendedor',
};

export function isAppRole(value: unknown): value is AppRole {
  return (
    value === 'ceo' ||
    value === 'admin' ||
    value === 'gerente' ||
    value === 'supervisor' ||
    value === 'vendedor'
  );
}

/** Subir arquivos, processar motores e tratar a auditoria (CEO e admin). */
export const canMaintainData = (role: AppRole | null | undefined): boolean =>
  role === 'ceo' || role === 'admin';

/**
 * Configurações do site (periodicidade, operações do 379, papéis): somente CEO.
 * O admin usa todas as funções, mas não altera o site.
 */
export const canChangeSite = (role: AppRole | null | undefined): boolean =>
  role === 'ceo';

/** Telas de motores e auditoria mostram dados completos só a partir do gerente. */
export const canSeeEngines = (role: AppRole | null | undefined): boolean =>
  role === 'ceo' || role === 'admin' || role === 'gerente';
