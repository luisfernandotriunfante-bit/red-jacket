# T-008 — Auditoria de dados e exportação de ajustes

ID: T-008  
Prioridade: P1  
Responsável: Backend/Frontend  
Status: planejado; critérios concretos dependem dos parsers e regras

## Objetivo

Centralizar avisos de inconsistência e indicar em termos diretos o que precisa ser ajustado.

## Escopo

- Reunir alertas gerados por parsing, validação, mapeamento e consolidação dos motores.
- Exibir motor, base/arquivo, linha ou registro, campo, valor recebido, motivo e ação sugerida, quando esses dados existirem.
- Filtrar/identificar resolvidas e pendentes sem deixar mensagens de auditoria espalhadas por outras abas.
- Exportar ajustes como JSON com versão de esquema, código de regra, referência da origem, valor atual, proposta de correção e justificativa.
- O arquivo será legível por IA e por pessoa; exportar não altera dados. Correção aplicada é um passo separado e validado.

## Fora de escopo

- Avisos fictícios.
- Correção automática ou alteração da base ativa sem validação e aprovação.
- Definir campos de correção antes de conhecer layouts/regras reais.

## Critérios de aceite

- Cada inconsistência aponta origem precisa sempre que disponível.
- Ao resolver um problema, auditoria registra o resultado e o conjunto ativo é revalidado.
- Exportação JSON validada por schema e casos teste.
- Nada é removido ou alterado silenciosamente.
- A tela segue o padrão visual aprovado e permanece em Configurações > Auditoria.
