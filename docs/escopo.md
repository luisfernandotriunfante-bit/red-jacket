# Escopo — Red Jacket

## Objetivo e público
Criar no repositório indicado pelo usuário uma aplicação web para análise comercial, com página inicial navegável que estabeleça o padrão visual do produto. Interface em português para uso do responsável comercial. Não copiar código, dados ou arquivos de outros projetos.

## Entregas
- T-000: base de aplicação e arquitetura Vite + Firebase Hosting, com validação remota no GitHub.
- T-001: design system e painel demonstrativo com dados fictícios.
- T-002: verificação independente de QA por PR e CI.
- T-003: configuração administrativa do projeto Firebase, após aprovação explícita das escolhas e custos.
- T-004: autenticação real via Firebase Authentication, após T-003.

## Requisitos visuais de T-001
- Temas claro e escuro, superfícies preto/branco e acentos vermelho/azul.
- Componentes coerentes: botões, filtros, listas, gráficos, tabelas, linhas, tipografia, números, KPIs com bordas coloridas e efeito de vidro, indicadores e barras.
- Sidebar recolhida por padrão: abre ao entrar o ponteiro na lateral e fecha ao sair com breve atraso; foco de teclado expande, Escape recolhe; botão acessível permite toque/clique e fixação.
- Subabas centralizadas: Visão geral, Vendas, Produtos e Clientes.
- Tema salvo localmente; primeira visita respeita preferência do sistema, com claro como fallback.
- Gráfico de tendência com dados sintéticos e alternativa textual/tabela.
- Tabela rolável horizontalmente em 360 px sem quebrar a página.
- Acesso apenas ilustrativo na demo, sem coletar credenciais; login real é T-004.

## Fora de escopo
- Dados comerciais reais, importação, integrações e cálculos.
- Criar projeto Firebase, habilitar provedores, definir regras de acesso ou billing sem aprovação explícita.
- Deploy/publicação nesta tarefa.
- Copiar código, estilos, dados ou documentação de outros projetos.

## Requisitos não funcionais
- Teclado e toque, semântica acessível, foco visível, contraste WCAG AA, estados não indicados apenas por cor.
- Verificação visual em 360, 768 e 1280 px e respeito a prefers-reduced-motion.
- Dependências de runtime ou teste precisam de aprovação do gerente.
- Builds e auditorias devem ocorrer no GitHub CI, sem execução local.

## Decisões
- Hospedagem escolhida: Firebase Hosting.
- Auth real desejado pelo usuário, por meio do Firebase Authentication; projeto e políticas aguardam T-003.
- A página padrão visual é T-001; login real, parte da entrega final solicitada, é T-004 após decisões de conta e acesso.
- Nenhum deploy está autorizado.
