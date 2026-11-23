export const safeError=error=>{const raw=String(error?.message||error||'');if(/permiss|row-level|42501|403/i.test(raw))return 'Esta conta não pode atualizar este motor.';if(/VITE_SUPABASE|ambiente de build/i.test(raw))return 'Conexão com o banco não configurada.';if(/sessão|session|jwt|auth|401/i.test(raw))return 'Entre na sua conta para consultar ou atualizar os dados.';if(/network|fetch|timeout|conexão|connection|503|502/i.test(raw))return 'Falha de conexão. Tente novamente.';return 'Não foi possível concluir a operação. Tente novamente.'};
export const resultMessage=result=>result==='promovido'?'Atualizado no banco':result==='sem-mudanca'?'Sem mudança':result==='rejeitado'?'Rejeitado':result==='erro'?'Não foi possível atualizar':'Indisponível';
export function source(file,motor){
  if(motor==='movimentacoes' && /^379_25.*\.txt$/i.test(file.name))return 'erp_antigo_2025';
  if(motor==='movimentacoes' && /^379_26.*\.txt$/i.test(file.name))return 'erp_antigo_2026';
  if(motor==='produtos' && /^818191d3.*\.txt$/i.test(file.name))return 'cadastro_erp_antigo';
  return null;
}
export async function ensureSession(client){const {data,error}=await client.auth.getSession();if(error)throw error;if(!data.session)throw new Error('Entre na sua conta para consultar ou atualizar os dados.');return client}
export const isCurrent=(version,current)=>version===current;
