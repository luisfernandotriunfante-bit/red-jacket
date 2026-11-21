# Backlog — Red Jacket

| ID | Título | Status | Responsável | Dependências |
|---|---|---|---|---|
| T-000 | Base Vite + Firebase Hosting e ADR | QA aprovado; PR #1 draft, sem merge | Backend/Gerente | Nenhuma |
| T-001 | Casca de navegação e padrão visual | Prévia em PR #4; checks verdes; sem merge | Frontend | T-000 |
| T-002 | Configurar autenticação e acesso no Firebase Spark | Pendente de provedor, política de usuários e região Firestore; sem upgrade | Usuário/gerente | T-000 |
| T-003 | Revisão integrada de qualidade | Aplicada a cada PR de implementação | Revisor QA | Cartão correspondente |
| T-004 | Autenticação real | Pendente das escolhas de T-002 | Backend | T-000 e T-002 |
| T-005 | Arquitetura gratuita dos motores | Proposta registrada; limites de volume e localização pendentes | Backend/Gerente | T-002; amostras para dimensionar |
| T-006 | Slots independentes e substituição segura de bases | Planejado; sem Storage/Functions, precisa de amostras e Auth | Backend/Frontend | T-004 e T-005 |
| T-007 | Motor Histórico piloto | Bloqueado por amostras, de-para e regras de período | Backend | T-006 |
| T-008 | Auditoria de inconsistências e exportação IA | Regras e esquema do ajuste pendentes | Backend/Frontend | T-006 e motores |
| T-009 | Especificar motores Movimentações, Clientes, Produtos e Chegada de NFs | Um motor por vez após receber arquivos e regras | Backend/Frontend | T-006 e amostras por motor |

## Regras atuais do produto

- O usuário prefere opções sem custo e proibiu alteração do plano Firebase. Não associar billing nem habilitar serviços pagos.
- Bases tratadas persistem por slot no Firestore; trocar uma base não afeta os demais slots. Apenas a versão ativa e candidata de uma base coexistem durante validação; depois da troca bem-sucedida, o payload anterior é descartado e ficam metadados mínimos. Retenção completa para rollback é uma decisão futura.
- O original binário enviado é descartado após o parsing. O usuário confirmou que aceita isso desde que cada base possa ser atualizada individualmente.
- Parsing client-side é uma proposta; capacidade depende do tamanho real dos arquivos e das cotas Firestore. Cota gratuita insuficiente deve gerar falha explícita e manter a base ativa, nunca ativar um upgrade.
- Motor Histórico será o primeiro piloto; não implementar parser com colunas/regras inventadas.
- Toda a construção continua no GitHub. Não fazer merge ou deploy live sem autorização explícita.
