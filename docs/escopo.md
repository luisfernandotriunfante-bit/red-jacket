# Escopo — Red Jacket

## Objetivo

Aplicação web de análise comercial em português, com dados empresariais consolidados em motores independentes. Cada motor é a fonte única de verdade do assunto e todas as telas devem consumir seus dados tratados.

## Navegação e padrão visual aprovado

- Navegação principal nesta ordem: Sell out, Estoque, Clientes, Campanhas, Configurações.
- Sell out: Painel, Gerencial, Clientes. Configurações: Uploads, Auditoria.
- O canvas fica vazio até o usuário pedir conteúdo específico.
- Tema claro usa destaque azul vibrante; escuro usa fundo preto absoluto e destaque vermelho vibrante.
- Ícones monocromáticos, controles arredondados e padronizados, subabas com transição visível; sem texto, dados, avisos ou decoração não solicitados.
- Toda nova tela/ação visual consulta o Designer e segue os componentes existentes.

## Motores

A aba Configurações > Uploads terá cinco motores independentes, construídos individualmente sob um contrato comum:

1. Histórico
2. Movimentações
3. Clientes
4. Produtos
5. Chegada de NFs

Cada base/arquivo ocupa um slot identificável. A substituição atualiza somente aquele slot; as demais bases continuam ativas. Um arquivo novo é processado em staging; somente após validação substitui a base ativa. Falha mantém a base anterior. Depois de uma substituição bem-sucedida, os dados tratados da versão anterior são descartados; metadados mínimos de importação/auditoria permanecem. O original binário é descartado após o processamento, conforme aceito pelo usuário. O usuário confirmou que o payload anterior também deve ser descartado depois da validação bem-sucedida.

## Datas e histórico

O período de cada arquivo será detectado dinamicamente pelos dados/competência encontrados no próprio arquivo, não por uma faixa fixa pré-configurada. Se não houver informação de período confiável ou houver conflito, registrar em Auditoria e não usar aquela parte em métricas até resolver. A regra para sobreposição de fontes e o significado das métricas também precisam ser confirmados.

Primeiro piloto informado pelo usuário: três arquivos antigos de movimentação, dois arquivos do ERP anterior, dados dos meses passados do ERP atual e um de-para de itens antigos para o cadastro atual. Parser, formatos, campos e relações serão definidos a partir dos próprios arquivos; não exigir amostras anonimizadas como pré-condição.

## Auditoria

Configurações > Auditoria centraliza inconsistências com descrição direta, origem/linha/campo quando disponível e ajuste recomendado. A exportação será estruturada e legível por IA. Exportar um diagnóstico não altera dados.

## Arquitetura proposta sem upgrade de plano

- Firebase Authentication e Cloud Firestore no plano Spark; parsing, validação, consolidação e geração dos arquivos ocorrem no navegador.
- Cloud Firestore guarda os dados normalizados separados por motor/base, metadados de importação, auditoria e mapeamentos. O original do Excel não é persistido.
- Excel sanitizado e JSON são exportados pelo navegador a partir dos dados ativos armazenados.
- Não usar Firebase Storage, Cloud Functions, Cloud Run ou Cloud Billing nesta arquitetura proposta.
- Provedor de login e localização/região da base Firestore ainda precisam ser decididos antes de criar/configurar a base.
- Cotas gratuitas são limites, não garantia de capacidade para qualquer volume. Se uma gravação falhar por cota, manter a base ativa e não habilitar billing.

## Fora de escopo até autorização/dados

- Alterar o plano Firebase, associar billing, criar recursos pagos, habilitar serviço de armazenamento de binários ou contratar outro provedor.
- Implementar parser específico sem conhecer os arquivos e as regras necessárias.
- Inventar colunas, dados, métricas, períodos, contagens ou avisos.

## Qualidade e processo

- Testar atualização isolada de slot, falha sem troca da base ativa, consolidação repetível, proveniência, normalização pt-BR, auditoria e exportação XLSX/JSON.
- Conferir teclado, foco, toque, temas, movimento reduzido e larguras 360/768/1280 px.
- Trabalho, documentação, revisão e checks apenas pelo GitHub; sem execução ou cópias locais.
- Sem merge ou publicação em produção sem autorização explícita.
