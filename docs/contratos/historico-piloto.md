# Contrato do piloto — Histórico lendo Movimentações

Status: proposta na PR #10 (draft). Migrações **não aplicadas** no Supabase
real. Nenhuma credencial, arquivo real ou dado de produção foi usado.

## Objetivo do piloto

Entregar o fluxo de Histórico funcionando de ponta a ponta com os arquivos
já fornecidos: os relatórios `379_25`/`379_26` do ERP antigo e a planilha
`8022` do ERP atual. O Histórico **não tem upload próprio**: ele consulta e
agrega os dados normalizados que já estão ativos no motor **Movimentações**.
Isso evita duplicar fontes e slots no upload.

## Fluxo

1. O usuário owner/updater escolhe um ou mais arquivos de Movimentações.
2. O parser local transforma o arquivo em linhas estruturadas:
   `parseFaturamentoErpAntigo` (texto largura fixa) ou
   `lerPlanilhaVendas` + `normalizarLinhasVendas` (`.xls` BIFF8).
3. `atualizarMotor` grava em staging, valida e promove de forma atômica
   (`promover_versao`); a versão ativa anterior é preservada em falha.
4. O Histórico chama `obterHistorico`, que lê todas as fontes ativas de
   Movimentações, normaliza para o registro canônico, filtra, resume e
   pagina.
5. Depois de recarregar a página, a tela refaz as leituras no Supabase:
   nada depende de estado em memória.

## API para o Frontend

### Autenticação (`src/lib/auth.js`)

| Função | Uso |
| --- | --- |
| `entrar(client, {email, senha})` | Login pelo Supabase Auth; a sessão é persistida pelo SDK. |
| `sair(client)` | Logout. |
| `sessaoAtual(client)` | Sessão atual (null se deslogado). |
| `observarSessao(client, cb)` | Reage a login/logout/refresh; devolve a função de cancelar. |
| `obterPapel(client)` | RPC `meu_papel()`: `owner`, `updater`, `leitor` ou `anonimo`. |
| `podeEditar(papel)` | `true` só para owner/updater (conveniência de UI). |

O papel é decidido no banco, não no cliente. `podeEditar` só controla a
exibição dos botões; a escrita é negada pela RLS e pelas funções SQL.

### Leitura/atualização (`src/lib/motor-sync.js`)

| Função | Uso |
| --- | --- |
| `atualizarMotor({client, motor, fonteChave, hashArquivo, nomeArquivo, linhas, validar})` | Atualiza uma fonte; devolve `promovido`, `sem-mudanca` ou `rejeitado`. |
| `atualizarTodos({client, arquivosPorMotor})` | Botão geral; uma entrada por fonte, falha isolada por fonte. |
| `listarEstadoMotores({client})` | Estado por fonte/motor (nome do arquivo, linhas, data de promoção). |
| `obterDadosAtivos({client, motor, fonteChave?})` | Linhas ativas (sem a fonte). |
| `obterDadosAtivosPorFonte({client, motor, fonteChave?})` | Linhas ativas com `fonteChave` e `versaoId`; usado pelo Histórico. |

### Histórico (`src/motors/historico/consultar.js`)

`obterHistorico({client, filtros, pagina})` devolve:

- `registros`: página de registros canônicos.
- `total`: total filtrado (não só a página).
- `pagina`: `{limite, deslocamento, temMais}`; limite padrão 100, máximo 1000.
- `resumo`: `totalRegistros`, `totalValor`, `totalQuantidade`, `periodo`
  (`de`/`ate`), `porFonte`, `porTipo`.
- `avisos`: `registrosIgnorados`, `fontes`, `registrosEmMaisDeUmaFonte`,
  `chavesEmMaisDeUmaFonte`.

Filtros aceitos: `de`, `ate` (ISO `aaaa-mm-dd`), `cliente`, `documento`,
`vendedor`, `produto`, `fonte`, `tipo` (`venda` ou `faturamento`).

`linhasParaExportacao(registros)` devolve as colunas planas para
`gerarExcel`/`gerarJson`. O sanitizer de fórmulas é aplicado só no Excel;
o JSON preserva os tipos.

### Formato canônico do registro

| Campo | Origem ERP antigo | Origem ERP atual (8022) |
| --- | --- | --- |
| `data` | `data` dd/mm/aaaa convertida para ISO | `dataMovimento` (serial Excel) para ISO |
| `documento` / `serie` | `notaFiscal` / `notaSerie` | `numeroNotaFiscal` / null |
| `item` | `item` | null |
| `codigoProduto` | `eanComercial` (fallback `item`) | `eanProduto` (fallback `codprodWinthor`) |
| `produto` | null (o relatório não traz descrição) | `descricaoProduto` |
| `cliente` / `clienteNome` | `cliente` / null | `codCliente` / `nomeCliente` |
| `quantidade` / `valor` | `quantidade` / `valor` | `unidadesVendidas` / `valorNota` |
| `vendedor`, `supervisor`, `uf` | null | colunas correspondentes |
| `fonte`, `origem`, `tipo`, `chaveRegistro` | derivados | derivados |

Payload de formato desconhecido é contado em `avisos.registrosIgnorados` e
não vira registro.

## Nomes de fonte sugeridos

- `erp_antigo_379_25` → `379_25_DEMO.txt`
- `erp_antigo_379_26` → `379_26_DEMO.txt`
- `erp_atual_vendas_8022` → `992ca97f-vendas-8022_DEMO.xls`

Um motor aceita várias fontes; cada fonte é um arquivo/relatório. O botão
geral é idempotente por fonte (hash do conteúdo) e preserva a versão ativa
anterior quando uma fonte falha.

## Permissões (RLS, decisão do usuário)

- Leitura: qualquer usuário autenticado lê Movimentações e, portanto, o
  Histórico.
- Escrita: só `app_owners` e `motor_updaters` concedidos por um owner.
- `criado_por` e `promovido_por` vêm de `auth.uid()` no banco.
- `upload_versoes` não tem policy de UPDATE: transições só pelas funções
  `SECURITY DEFINER`, com `EXECUTE` revogado de PUBLIC/anon.
- Migração `0002` adiciona `meu_papel()` para a UI; não substitui a RLS.

## Testes (sem rede, sem credencial)

- `tests/motors/movimentacoes/registro-canonico.test.js` — normalização dos
  dois formatos e recusa de payload desconhecido.
- `tests/motors/historico/consultar.test.js` — filtros, paginação, resumo,
  repetição entre fontes.
- `tests/lib/auth.test.js` — login, logout, sessão e papel.
- `tests/integration/piloto-historico.test.js` — fluxo real com os fixtures:
  68 itens de `379_25` + 3 linhas do `.xls` 8022, reload, permissão de
  leitor e exportação JSON.

Rodar: `npm ci && npm test`. O CI executa `npm ci` (lockfile commitado),
`npm test`, `npm run build` e `npm audit --audit-level=high`.

## Limites conhecidos

- As datas seriais da amostra 8022 resolvem para 2026-10-02; é o valor real
  do arquivo DEMO, não um erro de conversão.
- `379_26` não foi validado linha a linha; assume-se o mesmo layout de
  `379_25`.
- Dois campos do ERP antigo e o significado de `carga` continuam sem
  confirmação de negócio.
- A planilha 8022 tem 3 linhas no fixture binário real, não o arquivo
  inteiro de 42,6 MB.
- Períodos sobrepostos entre fontes não são descartados: o retorno apenas
  sinaliza `registrosEmMaisDeUmaFonte`. A regra de deduplicação de negócio
  ainda precisa ser definida.
- Clientes e Chegada de NFs continuam sem amostra; Produtos usa o de-para
  da PR #5.

## O que depende do usuário para o site real

1. QA aprovar as migrações completas (0001 + 0002).
2. Aplicar as migrações no projeto Supabase `red-jacket`.
3. O dono logar e chamar `cadastrar_primeiro_owner()` uma vez.
4. Fornecer `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (públicas) no
   ambiente de build. `service_role` nunca no cliente.
5. Configurar o provedor de login no Supabase Auth.
