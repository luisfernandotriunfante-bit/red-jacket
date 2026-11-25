# Arquitetura

## Decisões da fundação

- **React + TypeScript + Vite:** interface modular, tipada e rápida de desenvolver.
- **Supabase Auth:** login por e-mail e senha, sessão persistida e cadastro público desabilitável.
- **Supabase Postgres e Storage:** armazenam as bases processadas, execuções, arquivos de origem e ocorrências de auditoria dos motores.
- **GitHub Pages:** hospeda exclusivamente a interface visual do aplicativo.
- **Supabase:** hospeda autenticação, banco de dados e, futuramente, arquivos. O Supabase não hospeda a interface do Red Jacket.
- **Variáveis de ambiente:** somente a URL e a chave pública (`anon`) chegam ao navegador. A chave `service_role` nunca pode ser usada no front-end.

## Organização

- `src/app`: rotas e navegação.
- `src/components`: componentes reutilizáveis e estrutura visual.
- `src/features`: funcionalidades isoladas, como autenticação, tema, Sell Out e Configurações.
- `src/engines`: leitura, validação, processamento e persistência das fontes comerciais.
- `src/features/settings`: configurações, auditoria e cadastro manual de equipes e vendedores.
- `supabase/migrations`: estrutura versionada do banco, funções transacionais e políticas de acesso.
- `src/styles`: identidade visual e regras globais.

## Segurança futura dos dados

Toda tabela criada no Supabase deverá ter Row Level Security (RLS), políticas explícitas, migração versionada e validação de entrada. O front-end nunca será tratado como barreira de segurança.

## Responsabilidades dos serviços

| Serviço           | Responsabilidade                          |
| ----------------- | ----------------------------------------- |
| GitHub            | código, revisão e histórico de alterações |
| GitHub Actions    | testes e publicação automática            |
| GitHub Pages      | telas e navegação do aplicativo           |
| Supabase Auth     | login, sessão e usuários                  |
| Supabase Postgres | bases processadas, execuções e auditoria  |
| Supabase Storage  | arquivos de origem dos motores            |

## Equipes comerciais

- `commercial_teams` guarda o supervisor; seu código identifica a equipe.
- `commercial_sellers` guarda CPF, códigos antigo e novo, contrato, região e metas de cada vendedor.
- Somente o CEO inclui, altera, inativa ou exclui. Admin e gerente consultam tudo; supervisor consulta sua equipe e vendedor consulta o próprio cadastro.
- Inativação preserva o histórico. A exclusão de uma equipe é bloqueada enquanto ainda houver vendedores vinculados.

## Primeiro acesso de novos usuários

1. Um administrador cadastra e-mail, função e equipe em uma área protegida.
2. O sistema gera um acesso temporário por uma função segura, fora do navegador.
3. O usuário é obrigado a definir uma senha pessoal no primeiro acesso.
4. Nenhuma senha permanente fica visível para o administrador ou armazenada no código.
