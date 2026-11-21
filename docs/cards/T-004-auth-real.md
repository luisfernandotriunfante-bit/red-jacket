# T-004 — Autenticação real

ID: T-004
Título: Implementar login com Firebase Authentication
Objetivo: Implementar login/logout e áreas protegidas conforme provedor e política escolhidos.
Escopo: SDK modular público Firebase Web, fluxo selecionado, estado/sessão/erros e proteção de áreas.
Fora de escopo: Configurar projeto, billing, provedores/regras sem autorização; armazenar senha no código; publicar.
Critérios de aceitação: Fluxos e sessão conforme política; usuários sem autenticação sem acesso; erros tratados; CI verde; QA independente.
Dependências: T-000 aprovada e T-002 concluída; auditar dependências ao instalar SDK.
Área: Frontend/serviços conforme arquitetura aprovada, tudo via GitHub PR.
Testes: CI remoto, Auth emulator, cenários de sucesso/erro/logout/sessão e revisão de segurança.
Prioridade: P1
Dificuldade: Difícil
Status: Bloqueada até T-002 e política aprovada.
