import { supabase } from '../auth/supabase';

export type ContractType = 'CLT' | 'PJ';

export type CommercialTeam = {
  id: string;
  supervisorCode: string;
  supervisorName: string;
  supervisorCpf: string;
  contractType: ContractType;
  region: string;
  active: boolean;
  createdAt: string;
};

export type CommercialSeller = {
  id: string;
  teamId: string;
  name: string;
  cpf: string;
  oldRcaCode: string;
  newSellerCode: string;
  contractType: ContractType;
  region: string;
  financialTarget: number;
  positivityTarget: number;
  active: boolean;
  createdAt: string;
};

export type TeamDraft = Omit<CommercialTeam, 'id' | 'createdAt'>;
export type SellerDraft = Omit<CommercialSeller, 'id' | 'createdAt'>;

function client() {
  if (!supabase) throw new Error('Supabase não configurado.');
  return supabase;
}

const onlyDigits = (value: string) => value.replace(/\D/g, '');

export async function listCommercialTeams(): Promise<CommercialTeam[]> {
  const response = await client()
    .from('commercial_teams')
    .select(
      'id, supervisor_code, supervisor_name, supervisor_cpf, contract_type, region, active, created_at',
    )
    .order('active', { ascending: false })
    .order('supervisor_name');
  if (response.error) throw new Error(response.error.message);
  return ((response.data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    supervisorCode: String(row.supervisor_code),
    supervisorName: String(row.supervisor_name),
    supervisorCpf: String(row.supervisor_cpf),
    contractType: row.contract_type === 'PJ' ? 'PJ' : 'CLT',
    region: typeof row.region === 'string' ? row.region : '',
    active: row.active !== false,
    createdAt: String(row.created_at),
  }));
}

export async function listCommercialSellers(): Promise<CommercialSeller[]> {
  const response = await client()
    .from('commercial_sellers')
    .select(
      'id, team_id, name, cpf, old_rca_code, new_seller_code, contract_type, region, financial_target, positivity_target, active, created_at',
    )
    .order('active', { ascending: false })
    .order('name');
  if (response.error) throw new Error(response.error.message);
  return ((response.data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    teamId: String(row.team_id),
    name: String(row.name),
    cpf: String(row.cpf),
    oldRcaCode: typeof row.old_rca_code === 'string' ? row.old_rca_code : '',
    newSellerCode: String(row.new_seller_code),
    contractType: row.contract_type === 'PJ' ? 'PJ' : 'CLT',
    region: typeof row.region === 'string' ? row.region : '',
    financialTarget: Number(row.financial_target ?? 0),
    positivityTarget: Number(row.positivity_target ?? 0),
    active: row.active !== false,
    createdAt: String(row.created_at),
  }));
}

export async function saveCommercialTeam(draft: TeamDraft, id?: string) {
  const values = {
    supervisor_code: draft.supervisorCode.trim(),
    supervisor_name: draft.supervisorName.trim(),
    supervisor_cpf: onlyDigits(draft.supervisorCpf),
    contract_type: draft.contractType,
    region: draft.region.trim(),
    active: draft.active,
    updated_at: new Date().toISOString(),
  };
  const response = id
    ? await client().from('commercial_teams').update(values).eq('id', id)
    : await client().from('commercial_teams').insert(values);
  if (response.error) throw new Error(response.error.message);
}

export async function saveCommercialSeller(draft: SellerDraft, id?: string) {
  const values = {
    team_id: draft.teamId,
    name: draft.name.trim(),
    cpf: onlyDigits(draft.cpf),
    old_rca_code: draft.oldRcaCode.trim() || null,
    new_seller_code: draft.newSellerCode.trim(),
    contract_type: draft.contractType,
    region: draft.region.trim(),
    financial_target: draft.financialTarget,
    positivity_target: draft.positivityTarget,
    active: draft.active,
    updated_at: new Date().toISOString(),
  };
  const response = id
    ? await client().from('commercial_sellers').update(values).eq('id', id)
    : await client().from('commercial_sellers').insert(values);
  if (response.error) throw new Error(response.error.message);
}

export async function deleteCommercialTeam(id: string) {
  const response = await client()
    .from('commercial_teams')
    .delete()
    .eq('id', id);
  if (response.error) throw new Error(response.error.message);
}

export async function deleteCommercialSeller(id: string) {
  const response = await client()
    .from('commercial_sellers')
    .delete()
    .eq('id', id);
  if (response.error) throw new Error(response.error.message);
}
