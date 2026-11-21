# Formato — Cadastro de itens no padrão do ERP antigo

Relatório de largura fixa, 185 caracteres por linha de item, gerado por
impressora matricial. Terminador de linha original é `\r` solto (sem `\n`);
o parser aceita `\r\n`, `\r` ou `\n`.

## Origem

Alimenta o de-para de itens do padrão antigo → padrão atual, mantido no
motor de Produtos (decisão do usuário/gerente). O motor Histórico só
referencia esses registros pela chave do ERP atual, não duplica o cadastro.

## Offsets de coluna (0-based, intervalo meio-aberto `[início, fim)`)

| Campo | Offset | Exemplo |
|---|---|---|
| codigo | [0, 8) | `90000001` |
| descricao | [9, 49) | `PRODUTO DEMO 0720...............01X500ML` |
| um (unidade de medida) | [50, 53) | `000` |
| pctCom (% comissão) | [55, 59) | `0,00` |
| acx (aceita caixa fracionada) | [60, 63) | `Nao`/`Sim` |
| dm (disponível mostruário) | [64, 67) | `Nao`/`Sim` |
| pctDMax (% desconto máximo) | [70, 74) | `0,00` |
| qtCx (quantidade por caixa) | [75, 79) | `0001` |
| conv (fator de conversão) | [80, 84) | `0012` |
| pesoLiq (kg) | [88, 93) | `0,500` |
| pesoBru (kg) | [97, 102) | `0,550` |
| pontos | [105, 109) | `0,00` |
| classe | [110, 115) | `0-Ven` |
| codigoFornecedor | [115, 136) | `00000397` |
| codigoBarra (EAN) | [136, 151) | `2000000007205` |
| troca (aceita troca) | [151, 158) | `Nao`/`Sim` |
| saz (sazonal) | [158, 163) | `000` |
| dias (validade de paletização) | [163, 167) | `28` |
| palm (paletizável) | [167, 172) | `SIM`/`NAO` |
| agp (agrupamento) | [172, 179) | `0006` |
| multiplo | [179, 185) | `3` |

Linhas numéricas decimais usam vírgula como separador (padrão BR); o parser
converte para `Number` com ponto.

## Linha de categoria

Formato `\s+<código de 4 dígitos>\s+<nome>`, ex.: `         1110  CG LIMPEZA`.
O relatório imprime cada categoria **duas vezes seguidas** antes do primeiro
item dela — o parser deduplica por (código, nome) e mantém a categoria como
contexto para os itens seguintes, até a próxima linha de categoria.

## Linhas ignoradas (não geram discrepância)

Cabeçalho de página, linha de separador (`-----...`), linha "Usuario:", linha
em branco — qualquer linha que não bata com o padrão de item nem de
categoria.

## Limitação conhecida — validar com dado fora da amostra DEMO

Os offsets foram inferidos por alinhamento entre o cabeçalho do relatório e
as linhas de dados, e confirmados contra as 63 linhas de item disponíveis na
amostra (`tests/fixtures/erp-antigo-cadastro-demo.txt`). A amostra é
uniforme (todas as descrições seguem o padrão `PRODUTO DEMO NNNN...`), então
não prova que a largura de 41 caracteres do campo `descricao` está correta
para descrições reais mais longas ou mais curtas — recomendo reconfirmar os
offsets com pelo menos um arquivo real (não-DEMO) antes de uso em produção.
