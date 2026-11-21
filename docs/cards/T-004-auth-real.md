# T-004 — Autenticação real

ID: T-004
Título: Implementar login com Firebase Authentication
Objetivo: Implementar login/logout e proteção de acesso na aplicação conforme o provedor e política definidos.
Escopo: SDK modular público Firebase Web, fluxo escolhido, estados de sessão e erro, áreas protegidas, testes sem credenciais reais.
Fora de escopo: Configurar projeto, billing, provedores ou regras sem autorização; armazenar senhas em código/cliente; publicar.
Critérios de aceitação: Fluxos e sessão funcionam conforme política aprovada; acesso restrito para não autenticados; erros tratados; CI verde; QA independente.
Dependências: T-000 aprovado e T-002 concluída; adicionar pacote Firebase após auditoria e decisão de segurança.
Arquivos/áreas: Frontend client e serviços/backend somente conforme arquitetura aprovada; alterações por GitHub PR.
Testes exigidos: CI remoto, auth emulator, sucesso/erro/logout/sessão e revisão de segurança pelo QA.
Prioridade: P1
Dificuldade: Difícil
Status: Bloqueada até T-002 e aprovação da política.