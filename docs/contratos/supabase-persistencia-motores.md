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

### Motores ainda sem formato/arquivo conhecido

Nenhuma amostra foi recebida ainda para **Histórico**, **Clientes** e
**Chegada de NFs**. Sem amostra real, não dá para inventar layout — nem
largura fixa, nem colunas de planilha, nem nomes de campo. **Precisa do
usuário**: pelo menos um arquivo real (ou DEMO, como os já enviados) de
cada um desses 3 motores, no mesmo formato que o sistema de origem gera
hoje (texto largura-fixa, .xls/.xlsx, CSV — o que for). Sem isso, esses 3
motores seguem funcionando apenas via a API genérica de staging/promoção
(`atualizarMotor` aceita `linhas` já estruturadas de qualquer fonte), mas
sem parser próprio.

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

- **`parse-faturamento-erp-antigo.js`** (fontes `erp_antigo_2025` e
  `erp_antigo_2026`) — parser de texto largura fixa, 420 caracteres por
  linha terminada em `\r\n`, para o relatório "Faturamento ... Analítico
  Detalhado". Offsets de campo validados contra 20.000 linhas reais de
  `379_25_DEMO.txt` (0 erros). `parseFaturamentoErpAntigo(content)` retorna
  `{ items, discrepancies, totalLinhasNaoVazias, totalLinhasReconhecidas }`
  — `discrepancies` lista linhas que não bateram o formato esperado, para a
  UI decidir se bloqueia ou avisa. **Limite da amostra**: validado contra
  `379_25_DEMO.txt` (2025); `379_26_DEMO.txt` (2026) não foi escaneado
  linha a linha da mesma forma — assume-se mesmo layout por ser o mesmo
  relatório, mas isso não foi 100% confirmado campo a campo nessa segunda
  amostra. Dois campos têm nome genérico (`campoNaoIdentificado1`,
  `campoNaoIdentificado2`) por não ter sido possível identificar o que
  representam a partir da amostra sozinha.
- **`parse-vendas-erp-atual.js`** (fonte `erp_atual_vendas`) —
  `normalizarLinhasVendas(linhasBrutas)` já pronta e testada: recebe linhas
  já decodificadas (array de arrays, uma por linha da planilha, cabeçalho
  incluído) e devolve objetos tipados com as 36 colunas do relatório real
  (`COLUNAS`), convertendo datas seriais do Excel para ISO
  (`serialExcelParaIso`). **O que falta**: a função que decodifica o
  binário `.xls` em si (abrir o arquivo e extrair essas linhas brutas) —
  isso depende de uma biblioteca de leitura de planilha, e está bloqueado
  pela pendência de dependência abaixo. Enquanto isso, `.xls` dessa fonte
  não pode ser lido pela aplicação; a função pura de normalização já pode
  ser usada/testada com dados extraídos manualmente.

## Exportação (`src/lib/export-motor.js`)

- `gerarJson(linhas)` — pronto. Gera um Blob JSON dos dados ativos sem
  nenhuma sanitização (mantém campos tipados — number, boolean, null —
  exatamente como estão).
- `sanitizarCelulaExcel(valor)` / `sanitizarLinhaExcel(linha)` — pronto e
  testado. Prefixa com apóstrofo qualquer string que comece com `=`, `+`,
  `-`, `@`, tab ou CR (proteção contra fórmula/CSV injection ao abrir no
  Excel). Só se aplica a texto destinado ao Excel; nunca é usado no JSON.
- `gerarExcel(...)` (geração do arquivo `.xlsx` em si) — **removido nesta
  PR, pendente de decisão de dependência** (ver abaixo). O sanitizer já
  está pronto para ser usado por essa função quando a lib for escolhida.

## Pendência de dependência: leitura/escrita de planilha (.xls/.xlsx)

Tanto a leitura de `erp_atual_vendas` (.xls) quanto a geração real de
Excel na exportação dependem de uma biblioteca de planilha no navegador. A
única opção amplamente usada e publicada no **registry público do npm**
(`xlsx`, pacote SheetJS) está na versão `0.18.5`, que tem **2
vulnerabilidades HIGH sem correção disponível**:

- `GHSA-4r6h-8v6p-xvw6` — Prototype Pollution.
- `GHSA-5pgg-2g8v-p4x9` — ReDoS (Regular Expression Denial of Service).

`npm audit --audit-level=high` reprova com essa dependência instalada — a
CI (`build-and-audit`) ficaria vermelha. Por isso essa PR **não inclui**
`xlsx` no `package.json`; tanto a leitura de `.xls` quanto `gerarExcel`
foram removidas, mantendo só a lógica pura (sem binário) já testada.

**Precisa de decisão do usuário/gerente** entre:

1. Aceitar o risco documentado e instalar `xlsx@0.18.5` do registry do npm
   mesmo assim (ambas as CVEs são do tipo que importa mais em uso
   server-side com dados não-confiáveis; aqui os arquivos são enviados
   pelo próprio usuário autorizado no navegador dele — o risco real talvez
   seja aceitável, mas é uma decisão de produto/segurança, não técnica).
2. Instalar a versão mais recente do SheetJS fora do registry público do
   npm (a própria SheetJS publica um tarball via CDN própria com correções
   que não chegam ao npm) — isso muda o processo padrão de instalação de
   dependência e precisa de aprovação explícita antes.
3. Usar outra biblioteca: resolveria a **escrita** de `.xlsx` (ex.
   `exceljs`, sem as CVEs do xlsx) mas **não resolve a leitura de `.xls`**
   da fonte `erp_atual_vendas` — poderia exigir pedir esse arquivo em outro
   formato (`.xlsx` ou `.csv`) à fonte de origem.

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

1. Aplicar a migração no projeto Supabase real (`red-jacket`) — não feito.
2. O dono do projeto chamar `cadastrar_primeiro_owner()` logo após o
   primeiro login (passo manual, não automatizável sem credencial real).
3. Preencher `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` reais no ambiente
   de build/CI.
4. Configurar provedor(es) de login no Supabase Auth (ADR 0002).
5. Decidir a pendência de dependência de planilha (xlsx) acima — bloqueia
   leitura de `.xls` da fonte `erp_atual_vendas` e a geração real de
   `.xlsx` na exportação.
6. Enviar ao menos um arquivo real/DEMO de cada um dos 3 motores sem
   formato conhecido: **Histórico**, **Clientes**, **Chegada de NFs** —
   sem isso não é possível escrever parser para eles.
7. Integrar os botões "Atualizar"/"Atualizar todos" e exportação na UI
   (frontend) — esta PR entrega a API que os botões/exportação chamam.

## O que já pode ser testado contra o Supabase real (quando autorizado)

Depois que a migração for aplicada e o `cadastrar_primeiro_owner()` for
chamado pelo dono do projeto: `atualizarMotor`/`atualizarTodos`/
`listarEstadoMotores`/`obterDadosAtivos` já funcionam de ponta a ponta para
qualquer motor/fonte, mesmo sem parser de binário próprio — bastando que o
chamador já tenha as `linhas` estruturadas. Isso cobre hoje:
`cadastro_erp_antigo` (Produtos, PR #5), `erp_antigo_2025` e
`erp_antigo_2026` (Movimentações, parser pronto nesta PR). A fonte
`erp_atual_vendas` e os 3 motores sem amostra ficam fora até as pendências
5 e 6 acima serem resolvidas. Exportação (`gerarJson`) já funciona para
qualquer motor com dados ativos; `gerarExcel` real depende da pendência 5.
