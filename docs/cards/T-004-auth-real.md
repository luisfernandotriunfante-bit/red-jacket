# T-004 — Autenticação real

ID: T-004
Título: Implementar login com Firebase Authentication
Objetivo: Implementar login/logout e proteção de acesso na aplicação conforme o provedor e política definidos.
Escopo: SDK modular público Firebase Web, fluxo escolhido, estados de sessão e erro, rotas/áreas protegidas, testes sem credenciais reais.
Fora de escopo: Configurar projeto, billing, provedores ou regras sem autorização; armazenar senhas em próprio código/cliente; publicar.
Critérios de aceitação: Fluxos e sessão funcionam conforme a política aprovada; acesso restrito para não autenticados; erros tratados; CI verde; QA independente.
Dependências: T-000 aprovado e T-003 concluída; adicionar pacote Firebase após auditoria e decisão de segurança.
Arquivos/áreas: Frontend para integração client; Backend para regras de acesso/serviços aprovados; GitHub PRs.
Testes exigidos: CI remoto, auth emulator, sucesso/erro/logout/sessão e revisão de segurança.
Prioridade: P1
Dificuldade: Difícil
Status: Bloqueada até T-003 e aprovação de dependências/política.
