# Escopo — Red Jacket

## Objetivo e público
Criar no repositório indicado pelo usuário uma aplicação web para análise comercial, com página inicial navegável que estabeleça o padrão visual do produto. Interface em português para uso do responsável comercial. Não copiar código, dados ou arquivos de outros projetos.

## Entregas
- T-000: base Vite e hospedagem Firebase Hosting, validadas por CI do GitHub.
- T-001: design system navegável e painel demonstrativo com dados fictícios.
- T-002: configurar projeto Firebase e políticas, após aprovação explícita das escolhas e custos.
- T-003: revisão independente de QA por PR e CI.
- T-004: autenticação real via Firebase Authentication, após T-002.

## Padrão visual de T-001
- Temas claro e escuro; superfícies preto/branco e acentos vermelho/azul.
- Componentes consistentes: botões, filtros, listas, gráficos, tabelas, linhas, tipografia, números, KPIs com bordas coloridas e efeito de vidro, indicadores e barras.
- Sidebar recolhida por padrão: abre quando o ponteiro entra pela lateral e fecha após breve atraso ao sair; foco de teclado expande, Escape recolhe; botão acessível oferece controle por teclado/toque e opção de fixar.
- Subabas centralizadas: Visão geral, Vendas, Produtos e Clientes.
- Tema salvo localmente; primeira visita respeita preferência do sistema, com claro como fallback.
- Gráfico sintético de tendência com alternativa textual/tabela; tabela horizontal rolável em 360 px.
- Acesso ilustrativo sem coleta de credenciais; login real em T-004.

## Fora de escopo
- Dados comerciais reais, importação, integrações e cálculos.
- Criar projeto Firebase, habilitar provedores, definir regras de acesso ou billing sem aprovação explícita.
- Deploy/publicação nesta fase.
- Copiar código, estilos, dados ou documentação de outros projetos.

## Qualidade e execução
- Teclado e toque, semântica acessível, foco visível, contraste WCAG AA; estado não pode depender só de cor.
- Conferir 360, 768 e 1280 px e respeitar prefers-reduced-motion.
- Dependências de runtime/teste precisam de aprovação do gerente.
- Toda criação, revisão, build e auditoria acontece no GitHub; nada de execução local.
- Sem merge ou deploy sem autorização explícita.
