# T-005 — Arquitetura gratuita para os motores

ID: T-005  
Prioridade: P1  
Responsável: Backend/Gerente  
Status: Histórico em Supabase aprovado; migração de Auditoria/metadados proposta, pendente de aprovação; capacidade depende de arquivos reais

## Objetivo

Definir persistência e processamento compartilhados pelos cinco motores sem custo obrigatório e sem alterar o plano Firebase. Os dados tratados são persistidos por base independente; cada base pode ser atualizada isoladamente.

## Proposta

- Supabase Auth é o login único da aplicação, conforme decisão do usuário.
- Supabase Postgres armazena os dados item a item do motor Histórico; projeto `red-jacket`, plano Free, região us-east-2.
- Migrar também Auditoria e metadados hoje previstos para Firestore para tabelas Supabase com RLS é a recomendação de segurança, ainda pendente de aprovação do usuário.
- Ler e processar arquivos no navegador; gravar dados tipados e normalizados por slot/versão. Descartar o arquivo original após processamento, conforme requisito do usuário.
- Reimportações usam uma versão candidata e só ativam após validação. Histórico de versões e retenção serão definidos no contrato de dados antes da implementação.
- Gerar Excel sanitizado e JSON no navegador.
- Firebase permanece para Hosting estático. Não habilitar billing, Functions, Cloud Run, Storage ou serviços pagos nesta etapa.

## Limites e segurança

- Supabase Free informa limite de 500 MB de banco. A estimativa anterior para a carga de Histórico de ~535 mil linhas foi 160–215 MB; é uma estimativa e precisa ser medida após carga real.
- O Free pode pausar projeto após período de inatividade; monitorar o uso e o tamanho real.
- RLS deve exigir autenticação e restringir leitura/escrita a usuários autorizados; nenhuma política ou tabela foi criada nesta etapa.
- Não manter Firestore com regras abertas ou fracas para dados comerciais caso o login seja Supabase Auth. O token do Supabase não é validado nativamente pelas Security Rules do Firestore.
- Nenhuma cobrança/billing deve ser ativada sem decisão explícita do usuário.

## Fontes oficiais

- [Planos Supabase](https://supabase.com/pricing)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)

## Dependências e decisões pendentes

- Aprovar ou rejeitar a recomendação de migrar Auditoria/metadados do Firestore para Supabase.
- Definir política de cadastro, provedores de login e autorização de usuários.
- Receber arquivos reais e tamanhos para estimar parsing, volume e consumo do banco.
- Definir schema de validação por tipo de arquivo com base nos documentos reais; não inventar layout.

## Critérios de aceite

- Contrato permite substituir exatamente um slot e manter os demais ativos.
- Importação candidata não altera a versão ativa até passar validações.
- Falha mantém a versão ativa anterior.
- Acesso a dados é autenticado e protegido por RLS.
- Capacidade e consumo medidos com carga real antes de produção; falha de cota preserva dados ativos.
- Sem cobrança/configurações de billing e sem guardar arquivos reais no repositório.
