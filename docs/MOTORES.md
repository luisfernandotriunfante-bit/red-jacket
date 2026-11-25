# Motores

Cada motor junta os arquivos de um assunto em **uma única base**, limpa e igual para qualquer período.
Os arquivos são lidos no navegador (nada é enviado ao GitHub) e a base pronta é gravada no Supabase.

## Como funciona

1. Em **Configurações > Motores**, envie todos os arquivos do motor.
2. **Atualizar motor** lê as colunas pelo **nome do cabeçalho** (não pela posição), aplica as regras do processo e monta a base.
3. A base anterior só é trocada se o processamento terminar sem **bloqueio**. Colunas obrigatórias ausentes, EAN repetido ou totais do rodapé diferentes bloqueiam.
4. A auditoria do processamento (erros, avisos e contagens) é gravada junto com a base.

## Motores ligados

| Motor    | Arquivos                                                                                 | Chave |
| -------- | ---------------------------------------------------------------------------------------- | ----- |
| Produtos | 286, lista de preço da indústria (aba `data`), 8013, 322, 8011, Base_Sortimento_Nacional | EAN   |

Os demais motores têm os slots de envio, mas ainda não processam.

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
