import test from 'node:test';
import assert from 'node:assert/strict';
import {safeError,resultMessage,source,ensureSession,isCurrent} from '../src/upload-feedback.js';

test('sessão ausente impede leitura e escrita',async()=>{
  const client={auth:{getSession:async()=>({data:{session:null},error:null})}};
  await assert.rejects(ensureSession(client),/Entre na sua conta/);
});
test('erro de permissão, rede e configuração vira mensagem segura',()=>{
  assert.match(safeError({message:'permission denied for table'}),/não pode atualizar/);
  assert.match(safeError({message:'Failed to fetch'}),/conexão/);
  assert.match(safeError({message:'VITE_SUPABASE_URL missing'}),/não configurada/);
  assert.doesNotMatch(safeError({message:'secret database stack'}),/secret/);
});
test('fontes múltiplas e XLS bloqueado',()=>{
  assert.equal(source({name:'379_25_DEMO.txt'},'movimentacoes'),'erp_antigo_2025');
  assert.equal(source({name:'379_26_DEMO.txt'},'movimentacoes'),'erp_antigo_2026');
  assert.equal(source({name:'818191d3-322_DEMO.txt'},'produtos'),'cadastro_erp_antigo');
  assert.equal(source({name:'992ca97f-vendas-8022_DEMO.xls'},'movimentacoes'),null);
});
test('resultado parcial por fonte permanece distinto',()=>{
  const results=new Map([['erp_antigo_2025',resultMessage('promovido')],['erp_antigo_2026',safeError('network timeout')]]);
  assert.equal(results.get('erp_antigo_2025'),'Atualizado no banco');
  assert.equal(results.get('erp_antigo_2026'),'Falha de conexão. Tente novamente.');
});
test('resposta antiga não pode sobrescrever montagem nova',()=>{
  assert.equal(isCurrent(1,2),false);
  assert.equal(isCurrent(2,2),true);
});
