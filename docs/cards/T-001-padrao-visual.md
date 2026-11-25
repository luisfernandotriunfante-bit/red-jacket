# T-001 — navegação Red Jacket

## Complemento aprovado pelo usuário — cartões de Uploads por motor

A tela de Uploads deve apresentar cinco cartões compactos em uma grade de duas colunas em telas largas, com o último cartão ocupando a posição restante; em telas estreitas, os cartões empilham sem overflow.

Um cartão por motor:
- Histórico
- Movimentações
- Clientes
- Produtos
- Chegada de NFs

Cada cartão mostra o nome do motor destacado pela cor do tema, o estado/data e hora da última atualização quando houver timestamp real persistido, ação Adicionar arquivo e ações de exportação Excel e JSON sanitizados. Nunca exibir data fictícia. Quando não houver dados processados reais para exportar, as ações ficam indisponíveis com estado explicativo; não gerar arquivo fictício.

Os arquivos de ERP antigo/atual são fontes de Movimentações, não destinos adicionais no Histórico. Remover os sete destinos históricos duplicados anteriormente listados. Upload local, processamento, persistência e exportação real só entram no escopo quando suportados por dados e implementação; não simular processamento.

### Critérios de aceitação atualizados
- Cinco cartões simultâneos, um por motor, com a informação e ações descritas acima.
- Grade de duas colunas em telas largas; uma coluna em telas estreitas.
- Última atualização aparece apenas com timestamp real persistido.
- Excel/JSON disponíveis somente para dados processados reais e sanitizados.
- Sem destinos duplicados de ERP dentro do Histórico.
