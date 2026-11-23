# T-006 — Persistência e atualização dos motores

ID: T-006  
Prioridade: P1  
Responsável: Backend/Frontend  
Status: em desenvolvimento; Supabase real ainda não configurado

## Objetivo

Entregar um site funcional em que os dados importados dos cinco motores persistam no Supabase após recarregar ou reabrir a página. A interface não deve ficar limitada a uma demonstração local.

## Acesso aos dados

- Todos os usuários autenticados podem consultar os dados tratados compartilhados.
- Somente a conta proprietária e contas às quais ela conceder permissão podem atualizar os motores.
- A autorização de escrita deve ser aplicada no banco por RLS/policies; ocultar ou desabilitar botões na interface não conta como segurança.
- O proprietário inicial e a concessão/revogação de atualizadores devem ser configurados por procedimento seguro, sem UUID ou credencial hardcoded no código.

## Escopo

- Um dataset ativo por motor: Histórico, Movimentações, Clientes, Produtos e Chegada de NFs.
- Upload e processamento conforme parser e regras aprovados de cada fonte.
- Persistência dos dados normalizados no Supabase/Postgres.
- Botão **Atualizar** em cada cartão, para validar e substituir somente o motor selecionado.
- Botão global **Atualizar todos**, que processa os motores com arquivo selecionado, informa resultado por motor e não afeta motores sem arquivo ou com falha.
- Staging/versão candidata; validar antes de promover; falha preserva o dataset ativo anterior. A promoção deve ser atômica e segura contra concorrência.
- Após sucesso, descartar dados da versão substituída conforme política aprovada; manter metadados mínimos de importação, hash, resultado e horário.
- Na inicialização/reload, carregar do Supabase os dados persistidos e estado dos motores para a sessão autenticada.
- Timestamp gravado no servidor em UTC e formatado em pt-BR/fuso do usuário. Não usar `File.lastModified`; antes da primeira importação, mostrar “Sem atualização registrada”.
- Exportar Excel e JSON sanitizados a partir dos dados persistidos e processados reais.
- Nenhuma chave `service_role` no navegador ou repositório.

## Fora de escopo

- Guardar arquivos originais binários no banco.
- Processar formatos sem perfil/colunas reconhecidos ou inventar regra de negócio.
- Habilitar billing ou serviços pagos.
- Tratar validação puramente client-side como fronteira de segurança.

## Critérios de aceite

- Dados importados continuam disponíveis após reload, novo acesso autenticado e em outro dispositivo.
- Todos os autenticados podem ler; apenas proprietário e atualizadores concedidos podem escrever, e tentativa sem permissão é negada no banco.
- Atualizar um motor não altera os outros.
- Atualizar todos informa sucesso, falha ou ausência de arquivo por motor; uma falha não apaga versões ativas.
- Promoção concorrente não cria duas versões ativas nem duplica o mesmo hash.
- Rejeição/erro preserva a versão ativa; staging interrompida pode ser identificada e limpa com segurança.
- Timestamp só muda após ativação bem-sucedida e vem do servidor.
- Excel/JSON refletem dados persistidos, tipados e sanitizados; sem exportação fictícia.
- Testes cobrem reload, papéis de leitura/escrita, atualização isolada/global, RLS, concorrência, falhas, idempotência e exportação.
- Build reprodutível com lockfile e `npm ci`; QA independente aprova antes de integração real.
- A entrega é aplicação real, não mock/demonstração: Auth, migrations, políticas e fluxo completo verificados antes de declarar pronto.
