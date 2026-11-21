# Backlog — Red Jacket

| ID | Título | Status | Responsável | Dependências |
|---|---|---|---|---|
| T-000 | Base Vite + Firebase Hosting e ADR | Em revisão de QA (draft PR #1; CI verde reportado) | Backend | Nenhuma |
| T-001 | Página navegável de padrão visual comercial | Aguardando aprovação de T-000 | Frontend | T-000 |
| T-002 | Configurar projeto Firebase e políticas de acesso | Bloqueada por decisões/ação do usuário | Usuário/gerente | Aprovar projeto, plano, provedor e políticas |
| T-003 | Revisão independente e verificação integrada | Revisando T-000 | Revisor QA | T-000; depois T-001 e T-004 |
| T-004 | Implementar autenticação real | Bloqueada até T-002 | Backend | T-000 e T-002 |

## Estado
- O trabalho existe em branches/PRs do GitHub; não manter clones nem artefatos locais.
- O usuário escolheu Firebase para hospedagem e quer login real; Hosting serve o frontend e Authentication atende ao login web.
- Login real integra o objetivo final, mas depende do projeto/política em T-002 antes da implementação T-004.
- Nenhum projeto Firebase, domínio, provedor, regra, credencial, faturamento ou deploy foi configurado.
- PR #1 tem CI de build/audit; usa npm install e ainda não tem lockfile, pendência de reprodutibilidade em revisão.
- Não fazer merge ou deploy sem aprovação explícita.
