# T-005 — Arquitetura gratuita para os motores

ID: T-005  
Prioridade: P1  
Responsável: Backend/Gerente  
Status: proposta para documentar e validar; sem configuração de recursos

## Objetivo

Definir persistência e processamento compartilhados pelos cinco motores sem mudar o plano Firebase e sem custos obrigatórios. O usuário aceita persistir os dados tratados por base independente e descartar o arquivo original após processá-lo, desde que seja possível atualizar cada base isoladamente.

## Proposta

- Firebase Authentication e Cloud Firestore no Spark.
- Ler e processar o arquivo no navegador; gravar dados tipados e normalizados no Firestore.
- Representar cada arquivo/base como slot dentro do motor, com metadados, hash, versão ativa e candidata.
- Guardar somente dados tratados, mapeamentos e resultados de auditoria; descartar o original após processamento.
- Gerar Excel sanitizado e JSON no navegador.
- Não habilitar Firebase Storage, Functions, Cloud Run, Cloudflare R2 ou serviço pago nesta etapa.

## Limites e segurança

- A cota gratuita do Firestore documentada é 1 GiB de dados, 50 mil leituras/dia, 20 mil escritas/dia, 20 mil exclusões/dia e 10 GiB de saída/mês. Cotas podem mudar e não determinam que os arquivos do usuário caberão.
- Um documento Firestore tem limite de 1 MiB; dados tabulares devem ser particionados em documentos consultáveis/chunks, nunca um workbook inteiro em um documento.
- No Spark, ultrapassar cotas encerra o uso do produto correspondente até o período seguinte; o sistema não deve habilitar cobrança. Uma atualização que exceder cotas falha sem promover candidata.
- Security Rules devem exigir autenticação e restringir leitura/escrita às pessoas autorizadas. O provedor de login e os papéis ainda precisam ser definidos.
- A localização/região da base Firestore deve ser escolhida antes de criá-la; esta tarefa não cria banco nem recursos.

## Links oficiais consultados

- [Planos de preço Firebase](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans)
- [Cotas e preço do Firestore](https://firebase.google.com/docs/firestore/pricing)
- [Limites do Firestore](https://firebase.google.com/docs/firestore/quotas)
- [Regras de segurança do Firestore](https://firebase.google.com/docs/firestore/security/get-started)
- [Limites do Cloud Functions](https://firebase.google.com/docs/functions/quotas)
- [Requisito Blaze do Cloud Storage for Firebase](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024)

## Dependências e decisões pendentes

- Confirmar provedor e regras de cadastro/autorização para Firebase Authentication.
- Definir região do Firestore antes de criar a base.
- Receber amostras e tamanhos reais para estimar parsing no navegador, quantidade de registros, leituras/escritas, espaço e capacidade de exportação.
- Definir schema de validação por tipo de arquivo; não inventar layout.
- Medir no CI/browser remoto com fixtures sintéticas autorizadas antes de processar arquivos reais.

## Critérios de aceite

- O contrato permite substituir exatamente um slot e manter outros ativos.
- Importação candidata não altera a fonte ativa até passar validações.
- A substituição bem-sucedida descarta payload anterior desse slot; metadados mínimos preservam a trilha de importação.
- Falha de parsing, validação, escrita ou cota mantém a versão ativa.
- Dados permanecem acessíveis a partir de outros dispositivos autenticados.
- Sem custos/configurações de billing, sem guardar arquivos reais no repositório.
