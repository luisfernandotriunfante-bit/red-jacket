# Arquitetura

## Decisões da fundação

- **React + TypeScript + Vite:** interface modular, tipada e rápida de desenvolver.
- **Supabase Auth:** login por e-mail e senha, sessão persistida e cadastro público desabilitável.
- **Supabase Postgres:** será incorporado somente quando existir o primeiro modelo de dados aprovado. Nenhuma tabela fictícia foi criada.
- **GitHub Pages:** hospeda exclusivamente a interface visual do aplicativo.
- **Supabase:** hospeda autenticação, banco de dados e, futuramente, arquivos. O Supabase não hospeda a interface do Red Jacket.
- **Variáveis de ambiente:** somente a URL e a chave pública (`anon`) chegam ao navegador. A chave `service_role` nunca pode ser usada no front-end.

## Organização

- `src/app`: rotas e navegação.
- `src/components`: componentes reutilizáveis e estrutura visual.
- `src/features`: funcionalidades isoladas, como autenticação e tema.
- `src/styles`: identidade visual e regras globais.

## Segurança futura dos dados

Toda tabela criada no Supabase deverá ter Row Level Security (RLS), políticas explícitas, migração versionada e validação de entrada. O front-end nunca será tratado como barreira de segurança.

## Responsabilidades dos serviços

| Serviço | Responsabilidade |
| --- | --- |
| GitHub | código, revisão e histórico de alterações |
| GitHub Actions | testes e publicação automática |
| GitHub Pages | telas e navegação do aplicativo |
| Supabase Auth | login, sessão e usuários |
| Supabase Postgres | dados do produto, quando aprovados |
