# T-000 — Base e ADR para Firebase Hosting

ID: T-000
Título: Base Vite + Firebase Hosting e ADR
Objetivo: Definir uma base estática do Red Jacket e registrar a decisão de stack compatível com a preferência do usuário por Firebase Hosting e autenticação Firebase futura.
Escopo: ADR, bootstrap mínimo sem SDK/auth/configuração Firebase, hosting config apontando para dist/, versão Node compatível com Vite 8, workflow de CI do GitHub para build/auditoria sem deploy e lockfile versionado.
Fora de escopo: Criar projeto Firebase, habilitar Auth, alterar regras/billing/domínio, inserir credenciais, publicar site ou fazer deploy.
Critérios de aceitação:
- ADR propõe Vite + Firebase Hosting e documenta Auth posterior após decisões do usuário/projeto.
- App abre sem .env ou projeto Firebase configurado.
- package-lock.json versionado e instalado por npm ci estrito no GitHub Actions.
- GitHub Actions executa build e npm audit sem nível alto ou crítico; status verde.
- Workflow não publica nem faz deploy e usa token de leitura sem push.
- QA revisa arquivos/diff e evidências de CI via GitHub.
Dependências: Nenhuma; predecessora de T-001 e T-004.
Arquivos/áreas: Bootstrap, config Hosting, ADR e workflow em branch remota; documentação de escopo/backlog/cartões. Alterações exclusivamente pelo GitHub.
Testes exigidos: Build e auditoria integral via GitHub Actions; revisão remota do diff; sem executar no PC.
Prioridade: P1
Dificuldade: Médio
Status: QA aprovado no HEAD a62ede6; CI verde; PR #1 segue draft, aguardando decisão de merge.