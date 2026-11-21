# ADR 0001 — Stack de frontend: Vite + Firebase Hosting (Auth em T-004)

Status: Proposto (aguardando aprovação do gerente e do usuário)
Data: 2026-11-21
Autor: Desenvolvedor backend

## Contexto

Repositório novo, hoje só com `README.md`, branch `main` sem proteção. O
usuário escolheu Firebase e confirmou que o Firebase Hosting atende; pediu
login real já na primeira fase. Por decisão do gerente, todo trabalho deste
ciclo acontece só via GitHub (sem artefatos locais), e a dependência do SDK
de Firebase (pacote `firebase`, módulos `firebase/app`/`firebase/auth`) fica
para uma tarefa futura (T-004), porque o bootstrap desta entrega ainda não
importa nenhum código de Firebase.

## Decisão

- **Build:** Vite (`^8.3.8`, última versão estável). Exige Node
  `^20.19.0 || >=22.12.0` (mínimo oficial do Vite 8, conforme
  vite.dev/guide); `.nvmrc` fixado em `22.12.0`.
- **Hospedagem:** Firebase Hosting, servindo o conteúdo estático de `dist/`.
  `firebase.json` com `hosting.public = "dist"`, sem `.firebaserc` — nenhum
  projeto Firebase referenciado ainda.
- **Autenticação real (T-004, não nesta tarefa):** Firebase Authentication
  via SDK web modular. Confirmado em
  firebase.google.com/docs/auth/web/start e /docs/reference/js/auth que o
  SDK atual suporta `getAuth(app)` e emulador local para testes sem projeto
  de produção.
- **Dependência do SDK:** nenhuma, por ora. O pacote público `firebase`
  (recomendação oficial, import `firebase/app` / `firebase/auth`) só entra
  quando T-004 começar a implementar Auth de fato. Decisão tomada em
  revisão: pacotes `@firebase/app`/`@firebase/auth` isolados foram avaliados
  e descartados para esta entrega porque o bootstrap atual não importa
  nenhum deles — adicionar dependência não usada não se justifica.
- **Nota para quando T-004 instalar o pacote `firebase`:** o CI deste ADR
  (`.github/workflows/ci.yml`) só inclui Vite como dependência hoje — não há
  nenhum SDK de Firebase instalado nem `npm audit` atual que cubra suas
  dependências transitivas. Ao adicionar o pacote `firebase` (ou os módulos
  `firebase/app`/`firebase/auth`) em T-004, rodar `npm audit` nesse momento
  e revisar os avisos oficiais das dependências transitivas antes de seguir;
  decidir então entre aceitar risco documentado, usar módulos com escopo
  oficial sem o pacote guarda-chuva, ou aguardar correção upstream.

## Fora de escopo desta ADR

- Criar ou configurar projeto Firebase, provedores de Auth, regras de
  segurança, billing ou segredos.
- Deploy real (`firebase deploy`).
- Instalar o SDK de Firebase (fica para T-004).
- Qualquer merge antes de revisão do gerente.

## Consequências

- Positivo: Hosting do Firebase é gratuito no tier Spark para sites
  estáticos; caminho natural para login real em T-004 sem troca de stack;
  bootstrap atual não carrega dependências não usadas.
- Negativo: acopla a hospedagem a um provedor específico (Firebase/Google);
  T-004 vai precisar revisitar a decisão de pacote do SDK (ver nota acima)
  antes de instalar.
- Risco: enquanto não houver projeto Firebase, qualquer tentativa de
  configurar Hosting/Auth real antes da aprovação do usuário deve ser
  bloqueada.

## Alternativas consideradas

- GitHub Pages: descartada a pedido do usuário em favor do Firebase Hosting.
- Pacotes `@firebase/app`/`@firebase/auth` isolados nesta entrega: avaliados
  e descartados por não haver uso ainda (ver nota acima).
- Static site sem build tool: descartada por dificultar organização de
  componentes do design system.

Backlog e split de cartões (T-001 em diante) são mantidos pelo gerente
técnico fora desta ADR.
