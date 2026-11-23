# Contrato — Persistência por motor via Supabase (Auth + Postgres + RLS)

Status: proposto, nenhuma tabela criada no projeto Supabase real.
Projeto: `red-jacket`, plano Free, região us-east-2 (já criado, sem schema).

## Objetivo

Os 5 motores (Histórico, Movimentações, Clientes, Produtos, Chegada de NFs)
persistem dados tratados no Supabase, sobrevivendo a recarregar a página.
Cada motor tem um botão "Atualizar" que processa o arquivo local selecionado
e persiste; existe também um botão geral "Atualizar todos" que repete a
operação para todos os motores com arquivo selecionado, de forma
independente por motor (falha em um não afeta os outros).

## Modelo de acesso (decisão explícita do usuário)

- **Leitura**: qualquer usuário autenticado lê os dados trabalhados de
  todos os motores.
- **Escrita** (criar slot, enviar staging, promover, rejeitar): só o(s)
  **proprietário(s)** (`app_owners`) e as contas que um proprietário
  **conceder** (`motor_updaters`). Garantido pelo banco (RLS + funções
  `SECURITY DEFINER`), não pelo cliente — ver
  `supabase/migrations/0001_motores_staging.sql`.
- **Bootstrap do proprietário inicial** (sem UUID/credencial embutida): a
  função `cadastrar_primeiro_owner()` só funciona uma vez, enquanto não
  existir nenhum proprietário — o primeiro usuário autenticado que chamá-la
  se torna o proprietário. **Instrução de operação**: o dono do projeto
  deve chamar essa função imediatamente após seu primeiro login, antes de
  dar acesso à aplicação a qualquer outra conta. Depois disso, só um
  proprietário pode chamar `conceder_owner(user_id)` ou
  `conceder_updater(user_id)`/`revogar_updater(user_id)`.

## Fluxo (staging → validação → promoção)

1. UI chama `atualizarMotor({ client, motor, hashArquivo, nomeArquivo, linhas, validar })`
   (`src/lib/motor-sync.js`) → cria (ou reaproveita) o slot do motor e uma
   nova versão com `status = 'staging'`. Rejeitado pelo banco (RLS) se o
   usuário logado não for owner/updater.
2. Se a versão `active` atual do slot já tem o mesmo `hash_arquivo`, a
   operação é **idempotente**: retorna `sem-mudanca` sem criar nada novo.
3. UI faz o parsing do arquivo no navegador (client-side, sem servidor) e
   `linhas` (já estruturadas) são gravadas em `dados_motor` associadas à
   versão em staging.
4. UI valida (`validar(linhas)` — regras específicas de cada motor, a
   definir conforme os arquivos reais). O banco só valida estrutura mínima
   (ver "Validação" abaixo), não regra de negócio.
5. Sucesso → `promoverVersao` (RPC `promover_versao`): operação atômica que
   trava a versão ativa do slot (`FOR UPDATE`), marca a nova como `active`,
   marca a anterior como `superseded` e apaga o payload dela, mantendo só
   metadados (quando, quem promoveu).
6. Falha (validação ou erro) → `rejeitarVersao` (RPC `rejeitar_versao`):
   apaga as linhas da staging; a versão `active` anterior nunca é tocada.
   `atualizarMotor` chama isso automaticamente se qualquer passo falhar
   depois de criar a staging, para não deixar versão órfã.

## API para o Frontend (`src/lib/motor-sync.js`)

```js
import { createSupabaseClient } from './lib/supabase-client.js';
import { atualizarMotor, atualizarTodos, MOTORES } from './lib/motor-sync.js';

const client = createSupabaseClient(); // usa VITE_SUPABASE_URL/ANON_KEY

// Botão "Atualizar" de um cartão:
const resultado = await atualizarMotor({
  client,
  motor: 'produtos', // um de MOTORES
  hashArquivo, // sha256 do conteúdo do arquivo, calculado no cliente
  nomeArquivo: file.name,
  linhas, // array de objetos já normalizados pelo parser do motor
  validar, // opcional: (linhas) => boolean | Promise<boolean>
});
// resultado.resultado: 'promovido' | 'sem-mudanca' | 'rejeitado'
// erro de permissão (usuário não é owner/updater) chega como exceção —
// a UI deve capturar e mostrar que a conta não tem permissão de atualizar.

// Botão geral "Atualizar todos":
const resultados = await atualizarTodos({
  client,
  arquivosPorMotor: { produtos: { hashArquivo, nomeArquivo, linhas, validar }, ... },
});
// um item por motor em MOTORES; resultado inclui 'erro' com .erro (mensagem)
// quando aquele motor falhou — os demais continuam processando.
```

## Tabelas (ver migração `supabase/migrations/0001_motores_staging.sql`)

- `app_owners`, `motor_updaters`: controle de quem pode escrever.
- `upload_slots`: um slot por motor (motor é enum fixo dos 5 nomes).
- `upload_versoes`: cada versão de um slot, com `status`; sem policy de
  UPDATE direta — só as funções RPC mudam o status.
- `dados_motor`: linhas estruturadas de uma versão, `payload jsonb`; sem
  policy de DELETE direta — só as funções RPC apagam.

## Concorrência

- Índice único parcial (`upload_versoes_slot_active_unique`) garante, no
  banco, que nunca existam duas versões `active` para o mesmo slot.
- `promover_versao` trava a linha ativa do slot (`FOR UPDATE`) antes de
  decidir, serializando promoções concorrentes do mesmo slot.
- Duas chamadas de `atualizarMotor` com o mesmo `hashArquivo` podem ambas
  criar uma staging, mas a segunda promoção a encontrar a ativa já com o
  mesmo hash só descarta a staging redundante (idempotência também sob
  concorrência).

## Validação

- Banco (mínima, estrutural): `hash_arquivo` não vazio, `nome_arquivo_original`
  obrigatório, `payload` precisa ser um objeto JSON.
- Cliente (regra de negócio por motor): schema esperado, completude,
  referências — **ainda não embutido no banco**. Um payload que passa pelas
  checks do banco não está necessariamente correto segundo as regras do
  motor; isso é um risco residual aceito nesta etapa, não "seguro" no
  sentido de totalmente verificado.

## Configuração do cliente (segura)

- Variáveis públicas no build (Vite): `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY`. A anon key só concede o que as policies de RLS
  permitirem.
- `SUPABASE_SERVICE_ROLE_KEY` **nunca** entra no código do cliente.

## Pendências que dependem de aprovação/credenciais do usuário

1. Aplicar a migração no projeto Supabase real (`red-jacket`) — não feito.
2. O dono do projeto chamar `cadastrar_primeiro_owner()` logo após o
   primeiro login (passo manual, não automatizável sem credencial real).
3. Preencher `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` reais no ambiente
   de build/CI.
4. Configurar provedor(es) de login no Supabase Auth (ADR 0002).
5. Schema de validação por motor (Movimentações, Clientes, Chegada de NFs)
   depende de arquivo real de cada um — só Produtos/de-para tem parser
   pronto (PR #5); os demais usam `payload jsonb` genérico até then.
6. Integrar os botões "Atualizar"/"Atualizar todos" na UI (frontend) —
   esta PR entrega a API que os botões chamam.
