# ADR 0002 — Supabase Auth como autenticação única (Cenário A) e seu impacto

Status: Proposto (decisão de login confirmada pelo usuário; impacto nos
motores em Firestore ainda pendente de aprovação)
Data: 2026-11-23
Autor: Desenvolvedor backend

## Contexto

O motor Histórico precisa de ~535 mil linhas item a item, volume
incompatível com a cota diária do Firestore Spark (20.000 escritas/dia) —
decisão já registrada em T-005/T-006/T-007. Isso levou à criação de um
projeto Supabase gratuito (`red-jacket`, região East US/Ohio — us-east-2,
plano Free, URL `aqqkfiaazctneiwdpwiv.supabase.co`) para armazenar esses
dados em Postgres, sem cota diária de escrita e sem exigir billing.

O usuário decidiu em seguida: **"vamos usar login próprio do Supabase"**.
Esta ADR registra essa decisão como **Cenário A — Supabase Auth substitui o
Firebase Authentication em todo o app**, e documenta o impacto disso nos
motores que ainda usam Firestore.

## Decisão

- **Autenticação da aplicação:** Supabase Auth, não Firebase Authentication.
  Suporta e-mail/senha nativamente e provedores OAuth (ex. GitHub), com
  configuração do app OAuth e das credenciais no painel do Supabase —
  confirmado em supabase.com/docs/guides/auth e
  supabase.com/docs/guides/auth/social-sign-in/auth-github.
- **Controle de acesso aos dados do Histórico:** Row Level Security (RLS)
  nativo do Postgres, usando as funções `auth.uid()`/`auth.jwt()` do
  Supabase nas políticas — o JWT emitido pelo Supabase Auth já contém o UUID
  do usuário e acompanha cada requisição ao banco, permitindo políticas por
  linha sem nenhuma ponte adicional. Confirmado em
  supabase.com/docs/guides/database/postgres/row-level-security e
  supabase.com/docs/guides/auth/auth-deep-dive/auth-policies.
- **T-004 (autenticação real) muda de escopo:** o cartão foi escrito em
  termos de "Firebase Authentication"; com esta decisão, o SDK e o fluxo
  passam a ser os do Supabase Auth. Recomendo ao gerente reescrever o
  cartão (SDK, testes com ambiente de teste do Supabase em vez de "Auth
  emulator" do Firebase, critérios de aceitação).
- **T-002 (configuração administrativa) muda de escopo parcialmente:** a
  parte "provedor de login, domínios autorizados, política de usuários" não
  é mais uma decisão do Firebase Console — já está resolvida pelo projeto
  Supabase criado. A parte de Hosting estático no Firebase (ADR 0001)
  continua válida e não é afetada.
- **T-005 muda de escopo:** a seção "Proposta" do cartão ainda diz "Firebase
  Authentication e Cloud Firestore no Spark" — isso fica desatualizado em
  dois pontos: Firestore já não é o destino dos dados item a item do
  Histórico (decisão anterior, Supabase/Postgres), e agora a autenticação
  também sai do Firebase. Recomendo ao gerente atualizar essa seção.

## Risco — motores que ainda ficariam no Firestore (Auditoria, metadados)

Firestore Security Rules só reconhecem nativamente o token emitido pelo
Firebase Authentication (`request.auth.uid`). Com o login saindo do
Firebase, um token do Supabase Auth **não é validado pelas Firestore
Security Rules** — não há verificação nativa de identidade de usuário real
para esses motores se eles continuarem no Firestore.

Duas saídas possíveis, nenhuma boa sem mudança de escopo:
1. **Construir uma ponte** (ex. troca do token do Supabase por um "custom
   token" do Firebase, via função de servidor) — isso exige Cloud Functions
   ou Cloud Run, que exigem o plano Blaze (billing), já descartado pelo
   usuário. Não recomendo.
2. **Deixar o Firestore sem verificação real de usuário** para esses
   motores (regras abertas ou fracas) — risco de segurança inaceitável para
   dados comerciais, mesmo que hoje sejam só metadados/auditoria.

## Recomendação segura

Migrar também os motores hoje previstos para Firestore (Auditoria,
metadados gerais) para tabelas no mesmo projeto Supabase, usando o mesmo
Supabase Auth e RLS unificado. Vantagens:
- Um único sistema de login e autorização em todo o app, sem ponte entre
  provedores.
- Mesmo projeto gratuito já criado, com folga de cota (os volumes desses
  motores são bem menores que o Histórico).
- Consistente com a decisão do usuário de usar "o login próprio do
  Supabase".

Efeito prático: o papel do Firebase no projeto passa a ser só o Hosting
estático (ADR 0001), e o Supabase passa a cobrir autenticação + todos os
dados estruturados dos motores (Histórico já decidido; os demais motores
ficam pendentes de confirmação do gerente/usuário, já que ainda não têm
arquivo real nem cartão detalhado além do T-005 genérico).

## Fora de escopo desta ADR

- Implementar o código de login (fica para a revisão do T-004).
- Migrar dados reais de Firestore para Supabase (não há dados reais ainda).
- Criar tabelas, políticas RLS ou provedores OAuth no projeto Supabase —
  nada foi configurado além da criação do projeto em si.
- Qualquer ativação de billing em qualquer um dos dois provedores.

## O que não foi tocado

- Projeto Supabase `red-jacket`: só criado, sem tabela, sem política RLS,
  sem provedor OAuth configurado, sem credencial exposta em chat ou
  repositório.
- PR #5 (parser do de-para): inalterado por esta ADR, continua em draft.

## Links oficiais consultados

- [Supabase Auth — visão geral](https://supabase.com/docs/guides/auth)
- [Sign in with GitHub](https://supabase.com/docs/guides/auth/social-sign-in/auth-github)
- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [RLS e funções de autenticação](https://supabase.com/docs/guides/auth/auth-deep-dive/auth-policies)

## Decisões pendentes (gerente/usuário)

- Aprovar a recomendação de migrar também Auditoria/metadados para
  Supabase, ou manter Firestore para eles aceitando o risco de regras sem
  verificação real de usuário.
- Atualizar T-002, T-004 e T-005 (docs/cards/, docs/backlog.md) para
  refletir Supabase Auth — são artefatos do gerente, não editados aqui.
