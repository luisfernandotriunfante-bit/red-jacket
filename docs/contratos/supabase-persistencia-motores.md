# Contrato — Persistência por motor via Supabase (Auth + Postgres + RLS)

Status: proposto, nenhuma tabela criada no projeto Supabase real.
Projeto: `red-jacket`, plano Free, região us-east-2 (já criado, sem schema).

## Objetivo

Os 5 motores (Histórico, Movimentações, Clientes, Produtos, Chegada de NFs)
persistem dados tratados no Supabase, sobrevivendo a recarregar a página.
**Motor é o destino funcional, não cada relatório/arquivo**: um motor pode
receber várias **fontes** (arquivos) diferentes — por isso cada upload é
identificado por `(motor, fonteChave)`, não só por motor.

Mapeamento das amostras reais já compartilhadas (DEMO, não dados de
produção), confirmado pelo usuário em 23/11:

| Arquivo amostra | Motor | Fonte (`fonteChave` sugerida) |
|---|---|---|
| `379_25_DEMO.txt` (67,5 MB, faturamento 2025) | `movimentacoes` | `erp_antigo_2025` |
| `379_26_DEMO.txt` (42,6 MB, faturamento 2026) | `movimentacoes` | `erp_antigo_2026` |
| `992ca97f-vendas-8022_DEMO.xls` (vendas ERP atual) | `movimentacoes` | `erp_atual_vendas` |
| `818191d3-322_DEMO.txt` (cadastro/itens ERP antigo) | `produtos` | `cadastro_erp_antigo` (parser já pronto, PR #5) |

Essas 4 amostras não são 4 cartões — são 3 fontes do motor Movimentações
mais 1 fonte do motor Produtos. Os nomes de `fonteChave` acima são uma
sugestão; a decisão final de nomenclatura/quantidade de fontes por motor
fica com quem desenhar a tela (frontend) e for recebendo mais arquivos
reais.

Cada fonte tem um botão "Atualizar" que processa o arquivo local
selecionado e persiste; existe também um botão geral "Atualizar todos" que
repete a operação para todas as fontes com arquivo selecionado, de forma
independente (falha em uma não afeta as outras).

## Modelo de acesso (decisão explícita do usuário)

- **Leitura**: qualquer usuário autenticado lê os dados trabalhados de
  todos os motores/fontes.
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

1. UI chama `atualizarMotor({ client, motor, fonteChave, hashArquivo, nomeArquivo, linhas, validar })`
   (`src/lib/motor-sync.js`) → cria (ou reaproveita) o slot `(motor,
   fonteChave)` e uma nova versão com `status = 'staging'`. Rejeitado pelo
   banco (RLS) se o usuário logado não for owner/updater.
2. Se a versão `active` atual do slot já tem o mesmo `hash_arquivo`, a
   operação é **idempotente**: retorna `sem-mudanca` sem criar nada novo.
3. UI faz o parsing do arquivo no navegador (client-side, sem servidor) e
   `linhas` (já estruturadas) são gravadas em `dados_motor` associadas à
   versão em staging.
4. UI valida (`validar(linhas)` — regras específicas de cada fonte, a
   definir conforme os arquivos reais). O banco só valida estrutura mínima
   (ver "Validação" abaixo), não regra de negócio.
5. Sucesso → RPC `promover_versao` retorna o status final: `'active'` se
   promoveu de fato, `'rejected'` se o banco descartou por já existir ativa
   idêntica (idempotência também sob concorrência — o client nunca supõe
   sucesso só porque não houve erro). Marca a anterior como `superseded` e
   apaga o payload dela, mantendo só metadados.
6. Falha (validação ou erro) → RPC `rejeitar_versao`: apaga as linhas da
   staging; a versão `active` anterior nunca é tocada. `atualizarMotor`
   chama isso automaticamente se qualquer passo falhar depois de criar a
   staging, para não deixar versão órfã.

## API para o Frontend (`src/lib/motor-sync.js`)

```js
import { createSupabaseClient } from './lib/supabase-client.js';
import {
  atualizarMotor, atualizarTodos, listarEstadoMotores, obterDadosAtivos, MOTORES,
} from './lib/motor-sync.js';

const client = createSupabaseClient(); // usa VITE_SUPABASE_URL/ANON_KEY

// Botão "Atualizar" de uma fonte dentro de um cartão/motor:
const resultado = await atualizarMotor({
  client,
  motor: 'movimentacoes',        // um de MOTORES
  fonteChave: 'erp_antigo_2025', // identifica o arquivo dentro do motor
  hashArquivo,                   // sha256 do conteúdo, calculado no cliente
  nomeArquivo: file.name,
  linhas,                        // já normalizadas pelo parser da fonte
  validar,                       // opcional: (linhas) => boolean | Promise<boolean>
});
// resultado.resultado: 'promovido' | 'sem-mudanca' | 'rejeitado'
// erro de permissão (usuário não é owner/updater) chega como exceção —
// a UI deve capturar e mostrar que a conta não tem permissão de atualizar.

// Botão geral "Atualizar todos" — uma lista de fontes por motor:
const resultados = await atualizarTodos({
  client,
  arquivosPorMotor: {
    movimentacoes: [
      { fonteChave: 'erp_antigo_2025', hashArquivo, nomeArquivo, linhas },
      { fonteChave: 'erp_atual_vendas', hashArquivo, nomeArquivo, linhas },
    ],
    produtos: [{ fonteChave: 'cadastro_erp_antigo', hashArquivo, nomeArquivo, linhas }],
  },
});
// um item por fonte processada; motor sem nenhuma fonte na lista aparece
// como { motor, fonteChave: null, resultado: 'sem-arquivo' }.

// Leitura pós-reload — estado de cada fonte, para "última atualização":
const estado = await listarEstadoMotores({ client });
// estado.movimentacoes = [{ fonteChave, temDados, nomeArquivo, linhasCount, promovidoEm }, ...]

// Leitura pós-reload — dados para exibir/exportar:
const linhasDeUmaFonte = await obterDadosAtivos({ client, motor: 'movimentacoes', fonteChave: 'erp_antigo_2025' });
const linhasDoMotorInteiro = await obterDadosAtivos({ client, motor: 'movimentacoes' }); // agrega todas as fontes
```

## Tabelas (ver migração `supabase/migrations/0001_motores_staging.sql`)

- `app_owners`, `motor_updaters`: controle de quem pode escrever.
- `upload_slots`: `(motor, fonte_chave)` único — um motor pode ter várias
  linhas (uma por fonte).
- `upload_versoes`: cada versão de um slot, com `status`; sem policy de
  UPDATE direta — só as funções RPC mudam o status.
- `dados_motor`: linhas estruturadas de uma versão, `payload jsonb`; sem
  policy de DELETE direta — só as funções RPC apagam.

## Concorrência

- Índice único parcial (`upload_versoes_slot_active_unique`) garante, no
  banco, que nunca existam duas versões `active` para o mesmo slot.
- `promover_versao` trava a linha ativa do slot (`FOR UPDATE`) antes de
  decidir, serializando promoções concorrentes do mesmo slot, e retorna o
  status final para o client distinguir promoção real de no-op.

## Validação

- Banco (mínima, estrutural): `hash_arquivo` não vazio, `nome_arquivo_original`
  obrigatório, `payload` precisa ser um objeto JSON.
- Cliente (regra de negócio por fonte): schema esperado, completude,
  referências — **ainda não embutido no banco**. Um payload que passa pelas
  checks do banco não está necessariamente correto segundo as regras da
  fonte; isso é um risco residual aceito nesta etapa, não "seguro" no
  sentido de totalmente verificado.
- **Amostra DEMO vs. dado real**: as 4 amostras usadas para desenhar o
  contrato são fictícias (nome do arquivo já indica "DEMO") e uniformes —
  isso basta para validar formato/fluxo, mas não prova largura de campo
  nem variação real de conteúdo (ex. descrições mais longas). Ver
  `docs/contratos/formato-cadastro-erp-antigo.md` para o caso já
  documentado (Produtos/de-para).

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
5. Parser e schema de validação das fontes de Movimentações
   (`379_25_DEMO.txt`, `379_26_DEMO.txt`, `992ca97f-vendas-8022_DEMO.xls`)
   — ainda não implementados; só o parser de Produtos/de-para existe (PR
   #5). Export funcional também depende disso — **não afirmar que exportar
   já funciona antes de implementar os parsers**.
6. Integrar os botões "Atualizar"/"Atualizar todos" na UI (frontend) —
   esta PR entrega a API que os botões chamam.

## O que já pode ser testado contra o Supabase real (quando autorizado)

Depois que a migração for aplicada e o `cadastrar_primeiro_owner()` for
chamado pelo dono do projeto: `atualizarMotor`/`atualizarTodos`/
`listarEstadoMotores`/`obterDadosAtivos` já funcionam de ponta a ponta para
qualquer motor/fonte, mesmo sem os parsers dos demais motores — bastando
que o chamador já tenha as `linhas` estruturadas (ex. vindas do parser de
Produtos/de-para, que já existe). Os parsers de Movimentações ainda
precisam ser escritos antes de testar esse motor especificamente com dados
reais.
