# Backlog — Red Jacket

| ID | Título | Status | Responsável | Dependências |
|---|---|---|---|---|
| T-000 | Base Vite + Firebase Hosting e ADR | Em revisão de QA (draft PR #1; CI verde) | Backend | Nenhuma |
| T-001 | Página navegável de padrão visual comercial | Aguardando aprovação de T-000 | Frontend | T-000 |
| T-002 | Revisão independente e verificação integrada | Em andamento para T-000 | Revisor QA | T-000; depois T-001 e T-004 |
| T-003 | Configurar projeto Firebase e políticas de acesso | Bloqueada por decisão/ação do usuário | Usuário/gerente | Aprovar projeto, plano, provedor e políticas |
| T-004 | Implementar autenticação real | Bloqueada até T-003 | Backend | T-000 aprovado e T-003 concluída |

## Estado e limites
- O repositório remoto começou no commit inicial com somente README.md; o trabalho ativo está em branches e PRs do GitHub.
- O usuário pediu Firebase para hospedagem e login real. Hosting pode servir o frontend estático; Firebase Authentication é a opção para autenticação web.
- T-001 demonstra a interface de acesso sem coletar credenciais. Login real é parte do objetivo final, mas requer projeto e política aprovados em T-003 antes do código de T-004.
- Nenhum projeto Firebase, domínio, provedor de login, regra, credencial, faturamento ou deploy foi configurado.
- O usuário determinou que toda criação e validação ocorram no GitHub; não usar computador local.
- O PR #1 tem CI GitHub Actions verde para build e auditoria. Não há package-lock.json; CI usa npm install. Registrar essa limitação até haver solução de lockfile inteiramente via GitHub.
- Não fazer merge ou deploy sem aprovação explícita do usuário.
