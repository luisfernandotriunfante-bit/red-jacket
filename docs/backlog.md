# Backlog — Red Jacket

| ID | Título | Status | Responsável | Dependências |
|---|---|---|---|---|
| T-000 | Base Vite + Firebase Hosting e ADR | Em revisão independente (draft PR #1; CI verde) | Backend | Nenhuma |
| T-001 | Página navegável de padrão visual comercial | Aguardando aprovação de T-000 | Frontend | T-000 |
| T-002 | Configurar projeto Firebase e decisões de acesso | Bloqueada por decisão/ação do usuário | Usuário/gerente | Aprovar projeto, plano, provedor e políticas |
| T-003 | Revisão independente e verificação integrada | Em andamento para T-000 | Revisor QA | T-000; depois T-001 e T-004 |
| T-004 | Implementar autenticação real | Bloqueada até T-002 | Backend | T-000 aprovado e T-002 concluída |

## Estado e limites
- O trabalho ativo está em branches e PRs do GitHub; não manter clones nem artefatos locais.
- O usuário pediu Firebase para hospedagem e login real. Hosting serve o frontend estático; Firebase Authentication é a opção de autenticação web.
- T-001 demonstra interface de acesso sem coletar credenciais. Login real é parte do objetivo final, mas depende da configuração e política em T-002 antes do código de T-004.
- Nenhum projeto Firebase, domínio, provedor, regra, credencial, faturamento ou deploy foi configurado.
- O usuário determinou que criação e validação ocorram no GitHub; não usar computador local.
- O PR #1 tem GitHub Actions verde para build e auditoria. Não há package-lock.json; CI usa npm install. A falta de lockfile é limitação registrada até haver solução inteiramente pelo GitHub.
- Não fazer merge ou deploy sem aprovação explícita do usuário.