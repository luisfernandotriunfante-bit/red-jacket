# Evolução visual das páginas

Esta branch concentra a construção das páginas ainda não concluídas do Red Jacket.
Ela permanecerá separada da `main` até que todas as páginas abaixo sejam revisadas e
aprovadas.

## Método de aprovação

Para cada página:

1. revisar a versão do Blue Jacket e a versão atual do Red Jacket;
2. resumir informações, interações e limitações da versão antiga;
3. indicar o que será preservado, descartado ou melhorado;
4. obter aprovação antes de implementar;
5. validar visual, responsividade, estados vazios e integração com os dados existentes.

## Estado das páginas

| Área          | Página                                    | Painel antigo               | Painel atual                            | Próxima ação                                  |
| ------------- | ----------------------------------------- | --------------------------- | --------------------------------------- | --------------------------------------------- |
| Sell out      | Resumo                                    | Implementada                | Implementada e redesenhada              | Preservar como padrão visual                  |
| Sell out      | Gerencial                                 | Implementada                | Casca vazia                             | Primeira página em análise                    |
| Sell out      | Clientes                                  | Implementada                | Casca vazia                             | Analisar após Gerencial                       |
| Estoque       | Estoque                                   | Implementada                | Casca vazia                             | Analisar e redesenhar                         |
| Clientes      | Carteira, cadastro, pirâmide e sortimento | Implementadas como subáreas | Casca vazia                             | Reorganizar a navegação antes de implementar  |
| Campanhas     | Campanhas                                 | Implementada                | Casca vazia                             | Analisar e redesenhar                         |
| Configurações | Motores                                   | Implementada                | Implementada e funcional                | Preservar e evoluir somente quando necessário |
| Configurações | Auditoria                                 | Implementada                | Implementada                            | Preservar e validar integrações futuras       |
| Configurações | Equipe                                    | Cadastro antigo de RCAs     | Implementada com equipes e supervisores | Painel atual é a referência                   |
| Configurações | Ajustes comerciais                        | Controles dispersos         | Implementada parcialmente               | Completar após as páginas operacionais        |
| Configurações | Competências                              | Implementada                | Estrutura inicial                       | Completar após as páginas operacionais        |

## Regra de publicação

- A PR é cumulativa e deverá permanecer como rascunho durante a construção.
- Nenhuma alteração desta branch será mesclada na `main` antes da aprovação do conjunto.
- Dados demonstrativos servem apenas para validar a composição visual; a fonte real será
  conectada aos motores e tabelas persistidas já existentes.
