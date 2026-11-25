# T-005 — Arquitetura gratuita para os motores

ID: T-005  
Prioridade: P1  
Responsável: Backend/Gerente  
Status: proposta aprovada para seguir sem recursos pagos; capacidade ainda depende de arquivos reais

## Objetivo

Definir persistência e processamento compartilhados pelos cinco motores sem mudar o plano Firebase e sem custo obrigatório. O usuário aceita persistir os dados tratados por base independente e descartar o arquivo original depois do parsing, desde que seja possível atualizar cada base isoladamente.

## Proposta

- Firebase Authentication e Cloud Firestore no Spark.
- Ler e processar o arquivo no navegador; gravar dados tipados e normalizados no Firestore.
- Representar cada arquivo/base como slot dentro do motor, com metadados, hash, versão ativa e candidata.
- Guardar dados tratados, mapeamentos e resultados de auditoria; descartar o original depois do processamento.
- Gerar Excel sanitizado e JSON no navegador.
- Não habilitar Firebase Storage, Functions, Cloud Run, Cloudflare R2, billing ou serviço pago nesta etapa.

## Limites e segurança

- Cota gratuita documentada do Firestore: 1 GiB armazenado, 50 mil leituras/dia, 20 mil escritas/dia, 20 mil exclusões/dia e 10 GiB de saída/mês.
- As cotas de leitura/escrita/exclusão do Firestore são diárias e reiniciam por volta da meia-noite do Pacífico. O plano Spark também informa que, se a cota gratuita de um produto for excedida no mês, o uso daquele produto pode ser interrompido até o fim do mês. A aplicação deve falhar com segurança e nunca habilitar billing.
- Há exatamente uma base Firestore gratuita por projeto. A região precisa ser escolhida antes de criar a base; não criar uma base adicional para tentar ganhar outra cota gratuita.
- Um documento Firestore tem limite de 1 MiB; tabelas devem ser particionadas em documentos/chunks abaixo desse limite, nunca um workbook em um documento.
- Security Rules devem exigir autenticação e restringir leitura/escrita a usuários autorizados. Provedor de login e papéis ainda precisam ser definidos.
- Nenhuma base Firestore ou regra foi criada/configurada nesta etapa.

## Links oficiais consultados

- [Planos de preço Firebase](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans)
- [Cotas e preço do Firestore](https://firebase.google.com/docs/firestore/pricing)
- [Limites do Firestore](https://firebase.google.com/docs/firestore/quotas)
- [Regras de segurança do Firestore](https://firebase.google.com/docs/firestore/security/get-started)
- [Requisito Blaze do Cloud Storage for Firebase](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024)

## Dependências e decisões pendentes

- Confirmar provedor e regras de cadastro/autorização para Firebase Authentication.
- Definir região do Firestore antes de criar a base.
- Receber os arquivos reais e tamanhos para estimar parsing no navegador, volume de registros, leituras/escritas, espaço e exportação; não exigir amostra anonimizada.
- Definir schema de validação por tipo de arquivo a partir dos próprios documentos; não inventar layout.

## Critérios de aceite

- Contrato permite substituir exatamente um slot e manter os outros ativos.
- Importação candidata não altera a fonte ativa até passar validações.
- Após sucesso, o novo payload passa a ativo e o payload tratado anterior do mesmo slot é descartado; ficam metadados mínimos. Falha mantém a base ativa.
- Dados ficam acessíveis em dispositivos autenticados.
- Sem cobrança/configurações de billing, sem guardar arquivos reais no repositório.
