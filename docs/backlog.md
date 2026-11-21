# Backlog — Red Jacket

| ID | Título | Status | Responsável | Dependências |
|---|---|---|---|---|
| T-000 | Base Vite + Firebase Hosting e ADR | QA aprovado; PR #1 draft, sem merge | Backend/Gerente | Nenhuma |
| T-001 | Página navegável de padrão visual comercial | Código e suíte aprovados pela QA; CI verde; QA visual aguarda preview | Frontend | T-000 |
| T-002 | Configurar projeto Firebase e políticas de acesso | Bloqueada por decisões/ação do usuário | Usuário/gerente | Aprovar projeto, plano, provedor e políticas |
| T-003 | Revisão independente e verificação integrada | QA de código e suíte de T-001 aprovadas; navegador/capturas pendentes | Revisor QA | T-000; depois T-001 e T-004 |
| T-004 | Implementar autenticação real | Bloqueada até T-002 | Backend | T-000 e T-002 |

## Estado
- Todo trabalho de criação e revisão ocorre no GitHub; sem cópias de trabalho ou execuções locais.
- O usuário escolheu Firebase Hosting e quer autenticação real; login depende do projeto e da política em T-002 antes de T-004.
- Nenhum projeto Firebase, domínio, provedor, regra, credencial, faturamento ou deploy foi configurado.
- T-000 recebeu aprovação QA; PR #1 permanece draft e sem merge.
- T-001 está na PR dependente #3; código/documentação foram aprovados no HEAD de0af5b e a suíte no HEAD 287281c. CI de testes/build/audit passou.
- QA visual em navegador, capturas e medidas 360/768/1280 ainda aguardam projeto Firebase e autorização explícita de preview publicado.
- Não fazer merge ou deploy sem aprovação explícita.