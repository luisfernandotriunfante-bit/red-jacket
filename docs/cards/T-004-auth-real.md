# T-004 — Autenticação real

ID: T-004
Título: Implementar login com Supabase Auth
Objetivo: Implementar login/logout e áreas protegidas usando o Supabase Auth como autenticação única do app.
Escopo: SDK oficial Supabase JS, fluxo de autenticação aprovado, estado/sessão/erros, proteção de áreas e integração com políticas RLS.
Fora de escopo: Configurar projeto/provedores sem autorização; armazenar senha ou service-role key no código; publicar.
Critérios de aceitação: Fluxos e sessão funcionam; usuários sem autenticação não acessam dados; RLS restringe dados por usuário; erros tratados; CI verde; QA independente.
Dependências: T-000 aprovada; projeto Supabase existente; política de cadastro/provedores e configuração de ambiente definidas.
Área: Frontend/serviços conforme arquitetura aprovada, tudo via GitHub PR.
Testes: CI remoto e projeto de teste Supabase; cenários de sucesso/erro/logout/sessão e revisão de segurança.
Prioridade: P1
Dificuldade: Difícil
Status: Provedor escolhido; implementação e configuração pendentes.
