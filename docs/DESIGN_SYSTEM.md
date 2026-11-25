# Sistema visual

Este documento é a referência obrigatória para qualquer nova tela do Red Jacket.

## Princípios

- A interface deve parecer intencional, humana e específica para o produto — nunca um painel genérico.
- Elementos são minimalistas e funcionais. Decoração só existe quando melhora orientação ou resposta.
- Componentes iguais mantêm comportamento, dimensão, tipografia e estado iguais em todo o sistema.

## Temas

| Tema   | Fundo     | Texto     | Destaque           |
| ------ | --------- | --------- | ------------------ |
| Claro  | `#FFFFFF` | `#000000` | vermelho `#FF2638` |
| Escuro | `#000000` | `#FFFFFF` | vermelho `#FF2638` |

O tema escolhido persiste entre sessões. O vermelho identifica ações e destaques nos dois temas. O azul `#3D82F7` representa dados, progresso e estados positivos nos painéis; não substitui o destaque da navegação.

## Tipografia

- Títulos, navegação, textos e dados: Manrope.
- Títulos usam sempre a mesma família de exibição.
- Rótulos dos menus principal e secundário são escritos em maiúsculas.

## Formas e estados

- Busca, filtros, seletores e navegação usam formato de pílula.
- Em espaços compactos, a pílula se reduz a um círculo.
- No item selecionado, o ícone mantém a cor normal do texto.
- O contorno e o rótulo do item selecionado usam a cor de destaque do tema.
- Cards de dados usam uma superfície levemente elevada em relação ao fundo, com bordas suaves e cantos arredondados.
- Gradientes decorativos não fazem parte da linguagem principal. Sombras discretas podem indicar elevação sem competir com o conteúdo.

## Navegação

- O menu lateral permanece recolhido mostrando somente ícones.
- Ao receber aproximação do ponteiro ou foco do teclado, ele se expande.
- Perfil e aparência ficam no topo; Red Jacket fica discretamente no rodapé.
- A navegação superior exibe somente as subáreas do módulo atual, sem título duplicado.
