# Red Jacket

Base do aplicativo comercial Red Jacket, criada do zero para evoluir de forma segura e consistente.

## Nesta primeira etapa

- interface responsiva e padronizada;
- navegação modular sem dados fictícios;
- autenticação com Supabase;
- interface hospedada no GitHub Pages;
- tema claro e escuro;
- testes, validações de código e build automatizados;
- deploy de prévia em pull requests e produção a partir da branch `main`.

## Como executar

1. Copie `.env.example` para `.env.local` e informe a URL e a chave pública do Supabase.
2. Execute `npm install`.
3. Execute `npm run dev`.

Consulte [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) para as decisões técnicas e [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) para o fluxo de desenvolvimento.
sistema de analise comercial
