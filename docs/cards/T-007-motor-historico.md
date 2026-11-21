# T-007 — Motor Histórico piloto

ID: T-007  
Prioridade: P1  
Responsável: Backend  
Status: bloqueado até receber amostras e regras do usuário

## Objetivo

Criar a fonte de verdade histórica que permite métricas por item/período sem misturar ERPs, duplicar meses ou tratar ausência de dado como zero.

## Fontes informadas pelo usuário

- Três arquivos antigos de movimentação.
- Dois arquivos do ERP anterior.
- Arquivo do ERP atual contendo somente meses passados.
- De-para de itens antigos para o cadastro atual.

Layouts, formatos, campos e limites de cada fonte ainda não foram recebidos.

## Escopo

- Definir um slot por arquivo-base; substituições individuais não afetam os demais.
- Mapear identificador de item antigo ao cadastro atual com as vigências que os arquivos permitirem.
- Resolver a fonte por período e item, preservando origem/slot/linha.
- Normalizar datas, números, identificadores e textos conforme padrões brasileiros, preservando campos brutos relevantes para auditoria durante o processamento.
- Sinalizar no painel Auditoria: mês sem fonte, período sobreposto, de-para ausente/ambíguo, valores inválidos ou totais incompatíveis.
- Exportar a fonte consolidada em Excel e JSON.
- Consultas e métricas consomem apenas dados ativos/consolidados do motor, não arquivos avulsos.

## Fora de escopo

- Inventar colunas, regras de prioridade, meses de corte, métricas ou relações de itens.
- Descartar silenciosamente linhas, preencher ausência com zero ou escolher uma fonte concorrente sem regra aprovada.
- Aplicar correção automática à base sem fluxo de revisão/aprovação.

## Critérios de aceite

- Casos de teste com amostras aprovadas reproduzem uma expectativa de saída fornecida pelo usuário.
- Todo registro analítico contém período e proveniência suficientes para explicar a fonte escolhida.
- Sobreposição, lacuna e item sem mapeamento geram alerta claro e não produzem métrica enganosa.
- Reprocessar as bases ativas produz o mesmo resultado.
- A atualização de um arquivo não muda os outros slots.
- Exportação XLSX/JSON reconciliada com totais de controle.

## Bloqueios a resolver com as amostras

- Colunas/tipos/abas/separadores/encodings e tamanho dos seis arquivos e de-para.
- Mês exato de início/fim de cada ERP e prioridade em sobreposição.
- Cardinalidade do de-para e regra para itens sem correspondência.
- Métricas que o usuário espera (ex.: média de venda: definição de média, período, dias sem venda, lojas/canais e unidade).
