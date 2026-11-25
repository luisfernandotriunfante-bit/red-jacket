# Backlog — Red Jacket

| ID | Título | Status | Responsável | Dependências |
|---|---|---|---|---|
| T-000 | Base Vite + Firebase Hosting e ADR | QA aprovado; PR #1 draft, sem merge | Backend/Gerente | Nenhuma |
| T-001 | Navegação, padrão visual e Uploads funcionais | PRs #4/#8/#9 ainda drafts; consolidar em uma única entrega integrada | Frontend | T-000 |
| T-002 | Configurar Firebase Hosting e Supabase Auth | Projeto Supabase Free criado; Auth/domínio pendentes | Usuário/gerente | T-000 |
| T-003 | Revisão integrada de qualidade | Aplicada a cada entrega de implementação | Revisor QA | Cartão correspondente |
| T-004 | Autenticação real com Supabase Auth | Provedor escolhido; implementação pendente | Backend/Frontend | T-000 e T-002 |
| T-005 | Arquitetura gratuita dos motores | Histórico em Supabase; migração de Auditoria/metadados proposta e pendente de aprovação | Backend/Gerente | T-004; arquivos reais |
| T-006 | Persistência, permissões de leitura/escrita e atualização individual/global | PR #10 em revisão de segurança; migração não aplicada; leitura autenticada compartilhada, escrita só proprietário/usuários autorizados | Backend/Frontend | T-004, T-005, schemas e configuração segura |
| T-007 | Motor Histórico piloto | Bloqueado por arquivos reais, de-para e regra para sobreposição | Backend | T-006 |
| T-008 | Auditoria de inconsistências e exportação IA | Regras e esquema do ajuste pendentes | Backend/Frontend | T-006 e decisão de armazenamento |
| T-009 | Especificar motores Movimentações, Clientes, Produtos e Chegada de NFs | Um motor por vez após conhecer seus arquivos e regras | Backend/Frontend | T-006 e arquivos por motor |

## Regras atuais do produto

- O usuário prefere opções sem custo e proibiu alteração do plano Firebase. Não associar billing nem habilitar serviços pagos.
- O usuário decidiu usar Supabase Auth como login próprio da aplicação.
- O objetivo é um site real, funcional e acessível ao usuário, não uma demonstração nem preview temporário.
- O usuário autorizou atualizar o site real após integração completa e aprovação de QA; consolidar o trabalho em uma entrega integrada, sem PRs funcionais fragmentadas.
- Dados dos motores persistem no Supabase após reload/reacesso. Todos os usuários autenticados podem ler os dados tratados; só o proprietário e usuários autorizados podem atualizar.
- Os cinco motores têm atualização individual e comando global “Atualizar todos”.
- Substituições são validadas em staging e só promovidas atomicamente após sucesso; falha preserva versão ativa. O original binário é descartado após parsing.
- A faixa de datas não será fixa: detectar período/competência em cada arquivo. Se não houver evidência suficiente ou houver sobreposição sem regra, enviar para Auditoria e não gerar métrica sobre essa parte.
- Capacidade depende dos arquivos reais e do banco disponível. Falha explícita preserva a versão ativa; nunca ativar upgrade.
- Motor Histórico será o primeiro piloto; não implementar parser com colunas/regras inventadas.
- Toda a construção continua no GitHub. Não publicar preview; atualizar o site real somente depois de QA e fluxo funcional verificado.
