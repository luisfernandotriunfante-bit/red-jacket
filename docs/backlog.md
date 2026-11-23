# Backlog — Red Jacket

| ID | Título | Status | Responsável | Dependências |
|---|---|---|---|---|
| T-000 | Base Vite + Firebase Hosting e ADR | QA aprovado; PR #1 draft, sem merge | Backend/Gerente | Nenhuma |
| T-001 | Casca de navegação e padrão visual | PR #4 base da nova tela; PR #8 draft para cinco cartões | Frontend | T-000 |
| T-002 | Configurar Firebase Hosting e Supabase Auth | Projeto Supabase Free criado; domínio e Auth pendentes | Usuário/gerente | T-000 |
| T-003 | Revisão integrada de qualidade | Aplicada a cada PR de implementação | Revisor QA | Cartão correspondente |
| T-004 | Autenticação real com Supabase Auth | Provedor escolhido; implementação pendente | Backend/Frontend | T-000 e T-002 |
| T-005 | Arquitetura gratuita dos motores | Histórico em Supabase; migração de Auditoria/metadados proposta e pendente de aprovação | Backend/Gerente | T-004; arquivos reais |
| T-006 | Persistência, atualização individual/global e exportação dos motores | Requisito do usuário; ainda não integrado; precisa garantir reload e uso real do site | Backend/Frontend | T-004, T-005 e parsers |
| T-007 | Motor Histórico piloto | Bloqueado por arquivos reais, de-para e regra para sobreposição | Backend | T-006 |
| T-008 | Auditoria de inconsistências e exportação IA | Regras e esquema do ajuste pendentes | Backend/Frontend | T-006 e decisão de armazenamento |
| T-009 | Especificar motores Movimentações, Clientes, Produtos e Chegada de NFs | Um motor por vez após conhecer seus arquivos e regras | Backend/Frontend | T-006 e arquivos por motor |

## Regras atuais do produto

- O usuário prefere opções sem custo e proibiu alteração do plano Firebase. Não associar billing nem habilitar serviços pagos.
- O usuário decidiu usar Supabase Auth como login próprio da aplicação.
- O projeto deve ser um site funcional de produção, não apenas uma demonstração de interface.
- Dados item a item do Histórico persistem no Supabase/Postgres. Migrar Auditoria/metadados para Supabase é recomendação pendente; não usar Firestore com regras sem verificação real de usuário.
- Dados importados precisam persistir após reload/reacesso. Os cinco motores têm atualização individual e comando global “Atualizar todos”.
- Uma substituição é validada em versão candidata e só promovida após sucesso; falha preserva o dado ativo. O original binário é descartado após parsing.
- A faixa de datas não será fixa: detectar período/competência em cada arquivo. Se não houver evidência suficiente ou houver sobreposição sem regra, enviar para Auditoria e não gerar métrica sobre essa parte.
- Capacidade depende dos arquivos reais e do banco disponível. Falha explícita deve preservar a versão ativa; nunca ativar upgrade.
- Motor Histórico será o primeiro piloto; não implementar parser com colunas/regras inventadas.
- Toda a construção continua no GitHub. Não fazer merge ou deploy live sem autorização explícita.
