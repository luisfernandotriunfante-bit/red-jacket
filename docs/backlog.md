# Backlog — Red Jacket

| ID | Título | Status | Responsável | Dependências |
|---|---|---|---|---|
| T-000 | Base Vite + Firebase Hosting e ADR | QA aprovou HEAD a62ede6; PR #1 draft, sem merge | Backend/Gerente | Nenhuma |
| T-001 | Página navegável de padrão visual comercial | PR draft #3 devolvida pela QA; Frontend corrigindo achados | Frontend | T-000 |
| T-002 | Configurar projeto Firebase e políticas de acesso | Bloqueada por decisões/ação do usuário | Usuário/gerente | Aprovar projeto, plano, provedor e políticas |
| T-003 | Revisão independente e verificação integrada | Revisar PR #3 após correções; navegador aguarda preview autorizado | Revisor QA | T-000; depois T-001 e T-004 |
| T-004 | Implementar autenticação real | Bloqueada até T-002 | Backend | T-000 e T-002 |

## Estado
- O trabalho é feito no GitHub; não criar nem manter cópias ou artefatos de trabalho no PC.
- O usuário escolheu Firebase para hospedagem e quer login real; Hosting serve o frontend e Authentication atende ao login web.
- Login real integra o objetivo final, mas depende do projeto/política em T-002 antes da implementação T-004.
- Nenhum projeto Firebase, domínio, provedor, regra, credencial, faturamento ou deploy foi configurado.
- T-000 recebeu aprovação QA no HEAD a62ede6; a PR #1 permanece draft, sem merge.
- T-001 está em PR dependente #3; a QA pediu correções de código e revisão de navegador/capturas depende de um preview autorizado.
- Não fazer merge ou deploy sem aprovação explícita.