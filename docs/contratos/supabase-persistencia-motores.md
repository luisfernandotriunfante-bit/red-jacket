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

| Arquivo amostra | Motor | Fonte (`fonteChave` sugerida) | Parser |
|---|---|---|---|
| `379_25_DEMO.txt` (67,5 MB, faturamento 2025, largura fixa) | `movimentacoes` | `erp_antigo_2025` | pronto (`parse-faturamento-erp-antigo.js`) |
| `379_26_DEMO.txt` (42,6 MB, faturamento 2026, largura fixa) | `movimentacoes` | `erp_antigo_2026` | pronto — mesmo layout/offsets de `erp_antigo_2025` (mesmo relatório, ano diferente) |
| `992ca97f-vendas-8022_DEMO.xls` (vendas ERP atual) | `movimentacoes` | `erp_atual_vendas` | normalização pura pronta (`parse-vendas-erp-atual.js`); **leitura do binário .xls ainda pendente** — ver "Pendência de dependência" abaixo |
| `818191d3-322_DEMO.txt` (cadastro/itens ERP antigo) | `produtos` | `cadastro_erp_antigo` | pronto (PR #5) |

Essas 4 amostras não são 4 cartões — são 3 fontes do motor Movimentações
mais 1 fonte do motor Produtos. Os nomes de `fonteChave` acima são uma
sugestão; a decisão final de nomenclatura/quantidade de fontes por motor
fica com quem desenhar a tela (frontend) e for recebendo mais arquivos
reais.

Cada fonte tem um botão "Atualizar" que processa o arquivo local
selecionado e persiste; existe também um botão geral "Atualizar todos" que
repete a operação para todas as fontes com arquivo selecionado, de forma
independente (falha em uma não afeta as outras).

### Fontes ainda sem formato/arquivo conhecido

Com a prioridade atual (site real com o fluxo de Histórico funcionando), o
piloto usa apenas as amostras já enviadas e NÃO pede arquivos novos:

- **Histórico**: não é uma fonte de upload. É uma visão de leitura sobre os
  dados normalizados de **Movimentações** (ver
  `docs/contratos/historico-piloto.md`). Não tem slot próprio nem precisa de
  amostra própria.
- **Produtos**: o de-para/cadastro do ERP antigo (`818191d3`) já tem parser
  na PR #5.
- **Clientes** e **Chegada de NFs**: continuam sem amostra/formato
  conhecido. Não bloqueiam o piloto do Histórico; entram quando houver
  arquivo real.

Sem amostra, não se inventa layout. Esses motores continuam aceitando
`linhas` já estruturadas pela API genérica de staging/promoção.

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

## Parsers de Movimentações (`src/motors/movimentacoes/`)

- **`parse-faturamento-erp-antigo.js`** (fontes `erp_antigo_379_25` e
  `erp_antigo_379_26`) — texto largura fixa, 420 caracteres por linha
  terminada em `\r\n`, para o relatório "Faturamento ... Analítico
  Detalhado". Offsets validados contra 20.000 linhas de `379_25_DEMO.txt`
  (0 erros de formato de data/código). `parseFaturamentoErpAntigo(content)`
  devolve `{ items, discrepancies, totalLinhasNaoVazias,
  totalLinhasReconhecidas }`. **Limite da amostra**: `379_26_DEMO.txt`
  (2026) não foi escaneado linha a linha da mesma forma; assume-se o mesmo
  layout por ser o mesmo relatório. Dois campos seguem com nome genérico
  (`campoNaoIdentificado1`, `campoNaoIdentificado2`) e o significado de
  negócio de `carga` não foi confirmado — capturados como estão, sem
  inventar rótulo.
- **`parse-vendas-erp-atual.js`** (fonte `erp_atual_vendas_8022`) —
  `lerPlanilhaVendas(bytes)` decodifica o `.xls` real (BIFF8) via
  `xls-reader@0.7.0` e `normalizarLinhasVendas(linhasBrutas)` mapeia as 36
  colunas por posição, convertendo datas seriais do Excel para ISO. Testado
  contra um excerto binário real do `992ca97f-vendas-8022_DEMO.xls`
  transportado em base64.
- **`registro-canonico.js`** (novo) — normaliza os payloads dos dois
  formatos em um registro único para o Histórico (`data`, `documento`,
  `serie`, `item`, `codigoProduto`, `cliente`, `quantidade`, `valor`,
  pesos, vendedor, UF, `fonte`, `chaveRegistro`). Não faz parsing de
  arquivo nem grava no banco; payload de formato desconhecido vira `null` e
  é contado como ignorado, nunca inventado.

## Exportação (`src/lib/export-motor.js`)

- `gerarJson(linhas)` — Blob JSON dos dados ativos, sem sanitização:
  mantém `number`, `boolean` e `null` exatamente como estão, porque JSON
  não é interpretado como fórmula por nenhuma ferramenta.
- `sanitizarCelulaExcel(valor)` / `sanitizarLinhaExcel(linha)` — prefixa
  com apóstrofo strings que comecem com `=`, `+`, `-`, `@`, tab ou CR
  (proteção contra fórmula/CSV injection). Só no Excel; nunca no JSON.
- `gerarExcel(linhas, nomeAba)` — gera `.xlsx` real via `exceljs@4.4.0`,
  aplicando o sanitizer célula a célula e preservando números. Testado com
  round-trip real (escreve e relê o arquivo).
- `linhasParaExportacao(registros)` (em `src/motors/historico/consultar.js`)
  — achata o registro canônico do Histórico nas colunas de exportação,
  mantendo os tipos.

## Dependências de planilha (decisão tomada)

A opção `xlsx` (SheetJS no registry público do npm, 0.18.5) foi
**descartada**: tem 2 vulnerabilidades HIGH sem correção no registry
(`GHSA-4r6h-8v6p-xvw6`, Prototype Pollution; `GHSA-5pgg-2g8v-p4x9`, ReDoS).
Não há supressão de alerta nem uso dessa lib.

Alternativa adotada, com versões fixas no `package.json`:

- **`xls-reader@0.7.0`** — leitura de `.xls` BIFF8 no navegador, zero
  dependências de runtime. Validado com o excerto real da amostra 8022.
- **`exceljs@4.4.0`** — geração de `.xlsx` para exportação.

`npm audit --audit-level=high` passa no CI com o lockfile commitado. O
`exceljs` traz um advisory **MODERATE** indireto (`uuid` < 11.1.1,
`GHSA-w5hq-g745-h8pq`) abaixo do limiar de falha; fica documentado por
transparência, não suprimido.

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
- **Amostra DEMO vs. dado real**: as amostras usadas para desenhar este
  contrato e os parsers são fictícias (nome do arquivo já indica "DEMO").
  `379_25_DEMO.txt` foi escaneado em 20.000 linhas reais do arquivo (não
  só uma amostra pequena), o que corrigiu suposições iniciais erradas (ex.
  um campo achado "sempre vazio" em 5 linhas tinha valor real mais adiante
  no arquivo) — mas ainda é um único arquivo de exemplo, não o universo de
  variações que o sistema de origem pode produzir (ex. linha mais longa,
  caractere especial em nome de cliente). Ver também
  `docs/contratos/formato-cadastro-erp-antigo.md` para o caso já
  documentado (Produtos/de-para).

## Configuração do cliente (segura)

- Variáveis públicas no build (Vite): `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY`. A anon key só concede o que as policies de RLS
  permitirem.
- `SUPABASE_SERVICE_ROLE_KEY` **nunca** entra no código do cliente.

## Pendências que dependem de aprovação/credenciais do usuário

1. QA revisar as migrações `0001_motores_staging.sql` e
   `0002_papel_usuario.sql` **completas** após as correções.
2. Aplicar as migrações no projeto Supabase real (`red-jacket`) — não
   feito; só depois da aprovação do QA e da configuração segura do owner.
3. O dono do projeto chamar `cadastrar_primeiro_owner()` logo após o
   primeiro login (passo manual, não automatizável sem credencial real).
4. Preencher `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` reais no ambiente
   de build. `service_role` nunca entra no cliente.
5. Configurar o provedor de login no Supabase Auth (ADR 0002).
6. Integrar na UI os botões "Atualizar"/"Atualizar todos", a leitura
   pós-reload e a exportação (frontend) — esta PR entrega a API.
7. Definir a regra de negócio para períodos sobrepostos entre `379_25/26`
   e a planilha `8022`: o piloto mantém as duas fontes e apenas sinaliza
   `registrosEmMaisDeUmaFonte`; não descarta linha sem regra aprovada.
8. Amostras de **Clientes** e **Chegada de NFs** continuam necessárias para
   esses motores, mas não bloqueiam o piloto do Histórico.

## O que já pode ser testado contra o Supabase real (quando autorizado)

Depois que as migrações forem aplicadas e o `cadastrar_primeiro_owner()`
for chamado pelo dono: `atualizarMotor`/`atualizarTodos`/
`listarEstadoMotores`/`obterDadosAtivos`/`obterDadosAtivosPorFonte` e
`obterHistorico` funcionam de ponta a ponta. Cobertura atual por testes
sem rede: `379_25` (68 itens reais do fixture), `8022` (3 linhas reais do
excerto binário) e o de-para de Produtos (PR #5). Continua fora: Clientes
e Chegada de NFs (sem amostra). Exportação JSON e Excel já são reais.
