# T-006 — Persistência e atualização dos motores

ID: T-006  
Prioridade: P1  
Responsável: Backend/Frontend  
Status: bloqueado para uso real até Supabase Auth, schema/RLS e integração estarem implementados

## Objetivo

Entregar um site funcional em que os dados importados dos cinco motores persistam no Supabase após recarregar ou reabrir a página. A interface não deve ficar limitada a uma demonstração local.

## Escopo

- Um dataset ativo por motor: Histórico, Movimentações, Clientes, Produtos e Chegada de NFs.
- Upload e processamento no navegador, conforme parser e regras de cada fonte aprovados.
- Persistência dos dados normalizados no Supabase/Postgres sob o usuário autenticado via Supabase Auth, protegida por RLS.
- Botão **Atualizar** em cada cartão, para validar e substituir somente o motor selecionado.
- Botão global **Atualizar todos**, que processa os motores com arquivo selecionado, informa resultado por motor e não afeta motores sem arquivo ou com falha.
- Staging/versão candidata: validar antes de promover; falha preserva o dataset ativo anterior.
- Após sucesso, descartar dados da versão substituída conforme política de retenção aprovada; manter metadados mínimos de importação, hash, resultado e horário.
- Na inicialização/reload, carregar do Supabase os dados persistidos e estado dos motores para a sessão autenticada.
- Mostrar a data/hora da última atualização bem-sucedida a partir de timestamp gravado no servidor em UTC e formatado em pt-BR/fuso do usuário. Não usar `File.lastModified`; antes da primeira importação, mostrar “Sem atualização registrada”.
- Exportar Excel e JSON sanitizados a partir dos dados persistidos e processados reais.
- Site deve operar com Supabase Auth e banco configurado. Não aceitar armazenamento em memória/localStorage como substituto de persistência de produto.

## Fora de escopo

- Guardar arquivos originais binários no banco.
- Processar formatos sem perfil/colunas reconhecidos ou inventar regra de negócio.
- Habilitar billing ou serviços pagos.
- Expor chave `service_role` ao navegador ou ao repositório.

## Critérios de aceite

- Dados importados continuam disponíveis após reload, novo acesso autenticado e em outro dispositivo.
- RLS restringe cada operação ao usuário/dados autorizados.
- Atualizar um motor não altera os outros.
- Atualizar todos informa claramente sucesso, falha ou ausência de arquivo por motor; uma falha não apaga versões ativas.
- Arquivo igual (hash) não cria versão duplicada desnecessária.
- Timestamp só muda após ativação bem-sucedida e vem do servidor.
- Excel/JSON refletem dados persistidos, tipados e sanitizados; não há exportação fictícia.
- Testes automatizados cobrem reload, isolamento de usuário, atualização isolada e global, falhas, idempotência e exportação; CI verde e QA independente.
- Chaves públicas ficam em configuração cliente; `service_role` permanece somente em ambiente de servidor seguro, se necessária.
- A entrega é aplicação real, não mock/demonstração: integração Supabase configurada, migrations versionadas e fluxo completo verificado antes de declarar pronto.
