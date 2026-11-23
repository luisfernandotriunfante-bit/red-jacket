# Arquitetura

## Decisões da fundação

- **React + TypeScript + Vite:** interface modular, tipada e rápida de desenvolver.
- **Supabase Auth:** login por e-mail e senha, sessão persistida e cadastro público desabilitável.
- **Supabase Postgres:** será incorporado somente quando existir o primeiro modelo de dados aprovado. Nenhuma tabela fictícia foi criada.
- **Vercel ou Cloudflare Pages:** hospedagem recomendada para o front-end. A escolha final será feita antes do primeiro deploy público.
- **Variáveis de ambiente:** somente a URL e a chave pública (`anon`) chegam ao navegador. A chave `service_role` nunca pode ser usada no front-end.

## Organização

- `src/app`: rotas e navegação.
- `src/components`: componentes reutilizáveis e estrutura visual.
- `src/features`: funcionalidades isoladas, como autenticação e tema.
- `src/styles`: identidade visual e regras globais.

## Segurança futura dos dados

Toda tabela criada no Supabase deverá ter Row Level Security (RLS), políticas explícitas, migração versionada e validação de entrada. O front-end nunca será tratado como barreira de segurança.
