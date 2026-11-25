# T-006 — Slots independentes de arquivo por motor

ID: T-006  
Prioridade: P1  
Responsável: Backend/Frontend  
Status: planejado; implementação depende de Auth, proposta T-005 e formatos reais

## Objetivo

Permitir atualizar somente as bases selecionadas e manter as demais bases ativas.

## Escopo

- Cada arquivo/base pertence a um slot explícito dentro de um dos cinco motores.
- Ler o arquivo no navegador, gerar dados candidatos normalizados e gravá-los no Firestore em staging.
- Validar formato e regras do slot antes de ativar.
- Promover só o slot validado; os demais slots não mudam.
- Em erro, preservar a base ativa e apresentar o erro real no painel Auditoria.
- Após a promoção, descartar os dados tratados da versão anterior do slot, conforme confirmação do usuário. Manter metadados mínimos de importação, hash, resultado e horário; rollback completo é decisão futura.
- Mostrar, em cada base/slot, a data e a hora da última ativação bem-sucedida, com formatação brasileira (dd/mm/aaaa HH:mm) e fuso horário do usuário. Registrar o instante de ativação no servidor em UTC; não usar a data de modificação do arquivo local como data de atualização. Antes da primeira ativação, não inventar uma data.
- Listar estado de cada base e oferecer substituição individual.
- Exportar dados ativos do motor em Excel e JSON.

## Fora de escopo

- Processar arquivo sem perfil/colunas reconhecidos.
- Guardar originais binários, usar Firebase Storage/Functions ou alterar o plano.
- Substituir bases de outros slots por uma importação.

## Critérios de aceite

- Atualizar slot A não altera slots B–Z.
- Arquivo igual (hash) não duplica dados nem dispara nova versão desnecessária.
- Arquivo inválido ou cota excedida não altera base ativa.
- Repetir consolidação resulta no mesmo conjunto, sem duplicar linhas.
- Cada linha exportada mantém referência ao motor, slot e origem necessários para auditoria.
- Excel usa apresentação pt-BR; JSON mantém campos tipados para leitura por software, formato final documentado.
- Suíte automatizada cobre substituição isolada, falhas, idempotência e exportação; CI verde e QA remoto aprovado.
- A interface mostra data e hora real da última ativação bem-sucedida de cada slot e não apresenta um horário fictício para base ainda não atualizada.
