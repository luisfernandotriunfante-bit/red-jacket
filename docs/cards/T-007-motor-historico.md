# T-007 — Motor Histórico piloto

ID: T-007  
Prioridade: P1  
Responsável: Backend  
Status: bloqueado até conhecer os formatos e regras dos arquivos reais

## Objetivo

Criar a fonte de verdade histórica que permite métricas por item/período sem misturar ERPs, duplicar meses ou tratar ausência de dado como zero.

## Fontes informadas pelo usuário

- Três arquivos antigos de movimentação.
- Dois arquivos do ERP anterior.
- Arquivo do ERP atual contendo meses passados (o intervalo varia conforme o arquivo).
- De-para de itens antigos para o cadastro atual.

Os layouts, formatos, campos e datas de cobertura ainda não foram observados. Não exigir amostras anonimizadas; o parser será definido com base nos arquivos reais quando a função de upload estiver pronta.

## Escopo

- Definir um slot por arquivo-base; substituições individuais não afetam os demais.
- Detectar dinamicamente período/competência pelos registros do arquivo. Não fixar meses de cobertura no código.
- Se período não puder ser identificado com segurança, pedir essa informação para o arquivo ou enviar a base à Auditoria e não usar os registros ambíguos nas métricas.
- Mapear identificador de item antigo ao cadastro atual, com vigência temporal quando os dados permitirem.
- Resolver a fonte por período e item, preservando origem/slot/linha.
- Normalizar datas, números, identificadores e textos conforme padrões brasileiros.
- Sinalizar em Auditoria: período incerto, mês sem fonte, sobreposição, de-para ausente/ambíguo, valores inválidos ou totais incompatíveis.
- Exportar a fonte consolidada em Excel e JSON.
- Consultas e métricas consomem apenas dados tratados/ativos do motor, não arquivos avulsos.

## Fora de escopo

- Inventar colunas, prioridade de sobreposição, datas fixas, métricas ou relações de itens.
- Descartar silenciosamente linhas, preencher ausência com zero ou escolher fonte concorrente sem regra aprovada.
- Aplicar correção automática à base sem fluxo de revisão/aprovação.

## Critérios de aceite

- Casos de teste com arquivos reais fornecidos pelo usuário reproduzem uma expectativa de saída conferida.
- Todo registro analítico contém período e proveniência suficientes para explicar a fonte escolhida.
- Sobreposição, lacuna e item sem mapeamento geram aviso e não produzem métrica enganosa.
- Reprocessar as bases ativas produz o mesmo resultado.
- Atualizar um arquivo não muda os outros slots.
- Exportação XLSX/JSON reconciliada com totais de controle.

## Regras ainda necessárias

- Prioridade quando fontes cobrem o mesmo período/item.
- Cardinalidade e tratamento de itens sem mapeamento.
- Métricas exatas esperadas (ex.: média de venda, período, dias sem venda, lojas/canais e unidade).
