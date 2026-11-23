# Backlog — Red Jacket

| ID | Título | Status | Responsável | Dependências |
|---|---|---|---|---|
| T-000 | Base Vite + Firebase Hosting e ADR | QA aprovado; PR #1 draft, sem merge | Backend/Gerente | Nenhuma |
| T-001 | Casca de navegação e padrão visual | PR #4 draft; checks verdes no HEAD db8f7f5; última aprovação QA no HEAD 354d960 | Frontend | T-000 |
| T-002 | Configurar Firebase Hosting e Supabase Auth | Projeto Supabase Free criado; domínio e Auth pendentes | Usuário/gerente | T-000 |
| T-003 | Revisão integrada de qualidade | Aplicada a cada PR de implementação | Revisor QA | Cartão correspondente |
| T-004 | Autenticação real com Supabase Auth | Provedor escolhido; implementação pendente | Backend/Frontend | T-000 e T-002 |
| T-005 | Arquitetura gratuita dos motores | Histórico em Supabase; migração de Auditoria/metadados proposta e pendente de aprovação | Backend/Gerente | T-004; arquivos reais |
| T-006 | Slots independentes e substituição segura de bases | Planejado; Supabase/Postgres e RLS; schema pendente | Backend/Frontend | T-004 e T-005 |
| T-007 | Motor Histórico piloto | Bloqueado por arquivos reais, de-para e regra para sobreposição | Backend | T-006 |
| T-008 | Auditoria de inconsistências e exportação IA | Regras e esquema do ajuste pendentes | Backend/Frontend | T-006 e decisão de armazenamento |
| T-009 | Especificar motores Movimentações, Clientes, Produtos e Chegada de NFs | Um motor por vez após conhecer seus arquivos e regras | Backend/Frontend | T-006 e arquivos por motor |

## Regras atuais do produto

- O usuário prefere opções sem custo e proibiu alteração do plano Firebase. Não associar billing nem habilitar serviços pagos.
- O usuário decidiu usar Supabase Auth como login próprio da aplicação.
- Dados item a item do Histórico persistem no Supabase/Postgres. Migrar Auditoria/metadados para Supabase é recomendação pendente; não usar Firestore com regras sem verificação real de usuário.
- Bases tratadas persistem por slot; trocar uma base não afeta os demais slots. Durante validação, a versão ativa não é tocada. O original binário é descartado após parsing.
- A faixa de datas não será fixa: detectar período/competência em cada arquivo. Se não houver evidência suficiente ou houver sobreposição sem regra, enviar para Auditoria e não gerar métrica sobre essa parte.
- Parsing client-side é uma proposta; capacidade depende do tamanho real dos arquivos e do banco disponível. Falha explícita deve preservar a versão ativa; nunca ativar upgrade.
- Motor Histórico será o primeiro piloto; não implementar parser com colunas/regras inventadas.
- Toda a construção continua no GitHub. Não fazer merge ou deploy live sem autorização explícita.
