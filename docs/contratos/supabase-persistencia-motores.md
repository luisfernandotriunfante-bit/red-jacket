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

## Fluxo (staging → validação → promoção)

1. UI chama `iniciarStaging(motor, hashArquivo)` → cria (ou reaproveita) o
   slot do motor e uma nova versão com `status = 'staging'`.
2. Se a versão `active` atual do slot já tem o mesmo `hash_arquivo`, a
   operação é **idempotente**: não cria nada novo, retorna sucesso sem
   reprocessar (requisito do botão "Atualizar todos").
3. UI faz o parsing do arquivo no navegador (client-side, sem servidor) e
   grava as linhas estruturadas associadas à versão em staging.
4. UI valida (schema, completude — regras específicas de cada motor, a
   definir por motor conforme os arquivos reais).
5. Sucesso → `promoverVersao(versaoId)`: operação atômica (função SQL) que
   marca a versão como `active`, marca a versão `active` anterior do mesmo
   slot como `superseded` e **apaga as linhas de dados** dessa versão
   superseded, mantendo só metadados (hash, quando, quem) — conforme regra
   já aprovada pelo usuário (não reter payload antigo por padrão).
6. Falha → `rejeitarVersao(versaoId)`: apaga as linhas da versão em
   staging; a versão `active` anterior nunca é tocada.

## Tabelas (ver migração `supabase/migrations/0001_motores_staging.sql`)

- `upload_slots`: um slot por motor (motor é enum fixo dos 5 nomes).
- `upload_versoes`: cada versão de um slot, com `status`.
- `dados_motor`: linhas estruturadas de uma versão, `payload jsonb` (schema
  interno por motor ainda não fechado — ver pendências).

## Autenticação e acesso (RLS)

- Supabase Auth é o único provedor (ADR 0002, Cenário A).
- Todas as tabelas exigem `auth.uid() is not null` para leitura e escrita
  (nenhuma operação anônima).
- Nesta proposta, o acesso não é segmentado por usuário individual (é uma
  ferramenta interna de uma única equipe) — qualquer usuário autenticado lê
  e escreve em qualquer motor. **Isto precisa de confirmação do usuário**:
  se houver necessidade de segmentar por papel/usuário, as policies mudam.

## Configuração do cliente (segura)

- Variáveis públicas no build (Vite): `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY`. A anon key é pública por design do Supabase —
  ela só concede o que as policies de RLS permitirem, nunca mais.
- `SUPABASE_SERVICE_ROLE_KEY` **nunca** entra no código do cliente, nunca em
  `.env` consumido pelo Vite, nunca em `import.meta.env.*`. Não há uso
  previsto dela nesta proposta (tudo roda com RLS + anon key).
- `.env.example` documenta as duas variáveis públicas, sem valor real.

## Idempotência do botão "Atualizar todos"

Para cada motor com arquivo local selecionado: chama o mesmo fluxo de
staging→validação→promoção isoladamente, em sequência ou paralelo. Captura
erro por motor (nunca propaga exceção de um motor para abortar os demais).
Resultado por motor é um de: `promovido`, `sem-mudanca` (hash igual ao
ativo), `rejeitado` (validação falhou, versão ativa preservada), `erro`
(falha de rede/banco, versão ativa preservada).

## Pendências que dependem de aprovação/credenciais do usuário

1. Aplicar a migração no projeto Supabase real (`red-jacket`) — não feito
   aqui, por instrução explícita.
2. Decidir a granularidade de RLS (todo usuário autenticado vs. por papel).
3. Preencher `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` reais no ambiente
   de build/CI — a anon key real só existe no painel do projeto.
4. Configurar provedor(es) de login no Supabase Auth (e-mail/senha e/ou
   OAuth) — ADR 0002 ainda não decidiu qual(is).
5. Schema de validação por motor (Movimentações, Clientes, Chegada de NFs)
   depende de arquivo real de cada um — só Produtos/de-para tem parser
   pronto (PR #5); os demais usam `payload jsonb` genérico até then.
6. Integrar os botões "Atualizar"/"Atualizar todos" na UI do PR #8 — essa
   parte é do frontend; esta proposta entrega a camada de dados que a UI
   vai chamar (`src/lib/motor-sync.js`).
