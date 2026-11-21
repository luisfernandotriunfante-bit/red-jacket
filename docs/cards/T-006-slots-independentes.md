# T-006 — Slots independentes de arquivo por motor

ID: T-006  
Prioridade: P1  
Responsável: Backend/Frontend  
Status: planejado; implementação depende de Auth, proposta T-005 e amostras

## Objetivo

Permitir atualizar somente as bases selecionadas e manter as demais bases ativas.

## Escopo

- Cada arquivo/base pertence a um slot explícito dentro de um dos cinco motores.
- Ler o arquivo no navegador, gerar dados candidatos normalizados e gravá-los no Firestore em staging.
- Validar formato e regras do slot antes de ativar.
- Promover só o slot validado; os demais slots não mudam.
- Em erro, preservar a base ativa e apresentar o erro real no painel Auditoria.
- Após a promoção, descartar os dados da versão anterior do slot. Manter metadados de importação, hash, resultado e tempo; rollback completo é decisão futura do usuário.
- Listar estado de cada base e oferecer substituição individual.
- Exportar fonte consolidada do motor em Excel e JSON a partir dos dados ativos.

## Fora de escopo

- Processar arquivo sem perfil/colunas aprovados.
- Guardar originais binários, usar Firebase Storage/Functions ou alterar o plano.
- Substituir bases de outros slots por uma importação.

## Critérios de aceite

- Atualizar slot A não altera slots B–Z.
- Arquivo igual (hash) não duplica dados nem dispara falsa nova versão.
- Arquivo inválido ou quota excedida não altera base ativa.
- Repetir consolidação resulta no mesmo conjunto ativo, sem duplicar linhas.
- Cada linha exportada mantém referência ao motor, slot e origem necessários para auditoria.
- Excel usa apresentação pt-BR; JSON mantém campos tipados para leitura por software, formato final documentado.
- Suíte automatizada cobre substituição isolada, falhas, idempotência e exportação; CI verde e QA remoto aprovado.
