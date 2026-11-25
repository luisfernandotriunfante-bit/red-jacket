# Motores

Cada motor junta os arquivos de um assunto em **uma única base**, limpa e igual para qualquer período.
Os arquivos são lidos no navegador (nada é enviado ao GitHub) e a base pronta é gravada no Supabase.

## Como funciona

1. Em **Configurações > Motores**, envie todos os arquivos do motor.
2. **Atualizar motor** lê as colunas pelo **nome do cabeçalho** (não pela posição), aplica as regras do processo e monta a base.
3. A base anterior só é trocada se o processamento terminar sem **bloqueio**. Colunas obrigatórias ausentes, EAN repetido ou totais do rodapé diferentes bloqueiam.
4. A auditoria do processamento (erros, avisos e contagens) é gravada junto com a base.

## Motores ligados

| Motor                | Situação                                     | Dependências        |
| -------------------- | -------------------------------------------- | ------------------- |
| Produtos             | processamento e persistência ativos          | —                   |
| Clientes             | processamento e persistência ativos          | —                   |
| Movimentações        | processamento em lotes e persistência ativos | —                   |
| Cortes               | processamento e persistência ativos          | Produtos e Clientes |
| Roteiro              | processamento e persistência ativos          | Clientes            |
| Compras da indústria | processamento e persistência ativos          | Produtos            |

## Banco de dados

A migração `supabase/migrations/20261125000000_engine_bases.sql` cria `engine_runs` e `engine_base_rows`, com RLS, e a função `replace_engine_base`, que troca a base de um motor por inteiro numa transação.
Aplique o arquivo no Supabase antes de publicar. As políticas atuais liberam leitura e escrita a qualquer usuário autenticado; restrinja a escrita ao administrador quando o cadastro de funções existir.

## Regras do motor Produtos

- Uma linha por item do 286 (a base). Itens que existem só em outros arquivos não entram.
- Os demais arquivos são ligados pelo EAN (DUN de 14 dígitos vira EAN-13 quando o EAN existe no 286). A lista de preço também casa pelo código Winthor e escolhe a linha cujo SKU é igual ao Cód. Fabricante do 286.
- O 8011 só vale para a filial 11 e UF MS, ligado pelo código do produto.
- Unidades por caixa: 286, depois lista, 8013, 8011 e 322.
- Sortimento por canal: 0, 1 ou 2; o valor 5 vira 1.
- `ativo` = não está fora de linha no 286.

## Auditoria

Cada processamento devolve uma lista de itens de auditoria (`AuditItem`). Os de severidade `ERRO` e `AVISO` viram **casos** na tabela `engine_audit_items`, prontos para a aba de auditoria listar e tratar:

- `status`: `aberto`, `em_analise`, `tratado` ou `ignorado`; `note`, `treated_by` e `treated_at` registram o tratamento.
- `records`: até 200 registros afetados (`{ key, info }`); o total real fica em `count`.
- `fingerprint` (motor + código + mensagem): se o mesmo caso já foi tratado ou ignorado antes, o novo processamento herda o tratamento.
- Itens `INFO` (conferências e contagens) ficam só no resumo do processamento (`engine_runs.audit`).

A tela de Auditoria consulta esses casos reais e permite colocá-los em análise ou marcá-los como tratados.

## Movimentações (motor 6)

- Entradas: dois relatórios 379 (ERP antigo, texto de largura fixa) e dois 8022 (ERP novo, xls/xlsx). O tipo de cada arquivo é decidido pelo **conteúdo** (assinatura de planilha ou texto), nunca pelo nome ou extensão.
- 379: campos achados pelos vãos de espaço + nome do cabeçalho. 8022: colunas pelo nome do cabeçalho. Coluna desconhecida vira `x_…` e gera aviso; coluna obrigatória ausente bloqueia.
- O 8022 mais recente substitui o período repetido do anterior. Devolução/troca do 379 relançada no 8022 é removida (auditada).
- Base grande (~300 mil linhas): gravada em lotes (`begin_engine_run` → `append_engine_rows` → `finalize_engine_run` → `purge_engine_rows`, migração `20261125000200`). A base anterior só deixa de valer quando a nova é finalizada e a contagem confere.
- Paridade: 296.377 linhas conferidas célula a célula com o motor em Python.

## Ajustes da conferência (lógica)

- **Arquivos guardados:** cada arquivo enviado fica no Supabase (compactado); atualizar só parte dos arquivos, ou nenhum, reaproveita os guardados. O 218 é um arquivo só (ano inteiro).
- **Dependências:** ao atualizar todos, quem depende de outra base roda depois dela. Cada processamento registra a versão das bases usadas (`base:<motor>` nas fontes); se a base mudar depois, o card avisa que o motor está defasado.
- **Periodicidade** de cada arquivo: tabela `engine_slot_settings`.
- **Operações do ERP antigo (379):** tabela `movimentacoes_operacoes` (operação, CFOP opcional, classe). Operação fora do mapa vira aviso e fica fora da base.
- **Gravação em lotes:** trava contra duas gravações do mesmo motor ao mesmo tempo; gravação que falha é cancelada (`abort_engine_run`) e a base vigente não é tocada.
- **Produtos:** os avisos listam os EAN afetados.
- **Deploy:** o site publicado vem só da `main` (branches de feature não publicam mais por cima).
