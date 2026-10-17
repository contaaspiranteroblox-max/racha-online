# RACHA · avisos de terceiros (THIRD_PARTY_NOTICES)

Gerado na auditoria de proveniência da v85 (17/10/2026) a partir de `app/package-lock.json` e da pasta `app/public/game/fontes/`.
O que é do RACHA e o que vem de terceiros, parte por parte:

| parte | código de terceiros | observação |
|---|---|---|
| o jogo (`app/public/game/`: `racha.html`, `*.js`, `*.css`) | nenhum | JavaScript e CSS próprios, sem bibliotecas; imagens geradas para o projeto (ver `PROVENIENCIA.md`); sons sintetizados no código |
| as fontes do jogo (`app/public/game/fontes/`) | Lilita One, Anton, Barlow, Barlow Condensed | SIL Open Font License 1.1; os `.ttf` originais e o `OFL-*.txt` de cada família (ver abaixo) |
| o servidor da turma (`server/`) | nenhum | Node.js puro, sem `npm install` (o WebSocket é próprio, RFC 6455) |
| a plataforma (`app/`: site, API, banco) | 679 pacotes npm (187 de execução, 492 só de desenvolvimento) | licenças abaixo; nenhuma copyleft (GPL/LGPL/AGPL/MPL) |

## Fontes (SIL Open Font License 1.1)

| família | pesos | direitos | origem |
|---|---|---|---|
| Lilita One | 400 | © 2011 Juan Montoreano — nome reservado "Lilita" | github.com/google/fonts `ofl/lilitaone` |
| Anton | 400 | © 2020 The Anton Project Authors | github.com/google/fonts `ofl/anton` |
| Barlow | 500, 600, 700 | © 2017 The Barlow Project Authors | github.com/google/fonts `ofl/barlow` |
| Barlow Condensed | 600, 700, 800 | © 2017 The Barlow Project Authors | github.com/google/fonts `ofl/barlowcondensed` |

Os arquivos são os originais (sem conversão nem recorte), com o texto da licença ao lado (`OFL-LilitaOne.txt`, `OFL-Anton.txt`,
`OFL-Barlow.txt`, `OFL-BarlowCondensed.txt`) e o SHA-256 de cada um em `app/public/game/fontes/LEIA-ME.txt`. A OFL deixa
distribuir as fontes junto com o jogo (inclusive pago); não deixa vender as fontes sozinhas nem usar o nome reservado
"Lilita" numa versão modificada.

## Plataforma (`app/`): licenças dos pacotes npm

Contagem por licença (todos os 679 pacotes do lock): MIT 603, ISC 31, Apache-2.0 27, BSD-2-Clause 8, BSD-3-Clause 5, Python-2.0 1, CC-BY-4.0 1, (AFL-2.1 OR BSD-3-Clause) 1, 0BSD 1, MIT AND ISC 1.
Só os de execução (os que vão para o servidor da plataforma): MIT 158, ISC 12, Apache-2.0 11, BSD-3-Clause 2, BSD-2-Clause 1, (AFL-2.1 OR BSD-3-Clause) 1, 0BSD 1, MIT AND ISC 1.

Notas: `CC-BY-4.0` é o `caniuse-lite` (dados do navegador, só desenvolvimento); `Python-2.0` é o `argparse` (só desenvolvimento);
`(AFL-2.1 OR BSD-3-Clause)` permite escolher a BSD-3. O texto completo de cada licença vem dentro do pacote (`node_modules/<pacote>/LICENSE`)
depois do `npm install`; quem publicar a plataforma deve juntar esses textos (por exemplo, com `npx license-checker --production`).
O `kimi-plugin-inspect-react` (ISC, só desenvolvimento) é um plugin do ambiente em que a plataforma foi gerada: ele marca os
componentes para o inspetor visual daquele ambiente e não é preciso para publicar (pode sair do `vite.config.ts` e do `package.json`).
Na v85 os endereços dos pacotes no `package-lock.json` foram apontados para o registro público (`registry.npmjs.org`): 272
deles apontavam para um espelho privado do ambiente de geração (`npm.mirrors.msh.team`); os hashes de integridade não mudaram.

### Dependências diretas de execução (`dependencies` do `app/package.json`)

| pacote | versão | licença |
|---|---|---|
| `@ai-sdk/openai-compatible` | 2.0.78 | Apache-2.0 |
| `@hono/node-server` | 1.19.17 | MIT |
| `@hookform/resolvers` | 5.2.2 | MIT |
| `@radix-ui/react-accordion` | 1.2.12 | MIT |
| `@radix-ui/react-alert-dialog` | 1.1.15 | MIT |
| `@radix-ui/react-aspect-ratio` | 1.1.8 | MIT |
| `@radix-ui/react-avatar` | 1.1.11 | MIT |
| `@radix-ui/react-checkbox` | 1.3.3 | MIT |
| `@radix-ui/react-collapsible` | 1.1.12 | MIT |
| `@radix-ui/react-context-menu` | 2.2.16 | MIT |
| `@radix-ui/react-dialog` | 1.1.15 | MIT |
| `@radix-ui/react-dropdown-menu` | 2.1.16 | MIT |
| `@radix-ui/react-hover-card` | 1.1.15 | MIT |
| `@radix-ui/react-label` | 2.1.8 | MIT |
| `@radix-ui/react-menubar` | 1.1.16 | MIT |
| `@radix-ui/react-navigation-menu` | 1.2.14 | MIT |
| `@radix-ui/react-popover` | 1.1.15 | MIT |
| `@radix-ui/react-progress` | 1.1.8 | MIT |
| `@radix-ui/react-radio-group` | 1.3.8 | MIT |
| `@radix-ui/react-scroll-area` | 1.2.10 | MIT |
| `@radix-ui/react-select` | 2.2.6 | MIT |
| `@radix-ui/react-separator` | 1.1.8 | MIT |
| `@radix-ui/react-slider` | 1.3.6 | MIT |
| `@radix-ui/react-slot` | 1.2.4 | MIT |
| `@radix-ui/react-switch` | 1.2.6 | MIT |
| `@radix-ui/react-tabs` | 1.1.13 | MIT |
| `@radix-ui/react-toggle` | 1.1.10 | MIT |
| `@radix-ui/react-toggle-group` | 1.1.11 | MIT |
| `@radix-ui/react-tooltip` | 1.2.8 | MIT |
| `@tanstack/react-query` | 5.103.2 | MIT |
| `@trpc/client` | 11.19.0 | MIT |
| `@trpc/react-query` | 11.19.0 | MIT |
| `@trpc/server` | 11.19.0 | MIT |
| `ai` | 6.0.290 | Apache-2.0 |
| `class-variance-authority` | 0.7.1 | Apache-2.0 |
| `clsx` | 2.1.1 | MIT |
| `cmdk` | 1.1.1 | MIT |
| `date-fns` | 4.1.0 | MIT |
| `dotenv` | 17.4.2 | BSD-2-Clause |
| `drizzle-orm` | 0.45.3 | Apache-2.0 |
| `embla-carousel-react` | 8.6.0 | MIT |
| `hono` | 4.13.9 | MIT |
| `input-otp` | 1.4.2 | MIT |
| `lucide-react` | 0.562.0 | ISC |
| `mysql2` | 3.24.4 | MIT |
| `next-themes` | 0.4.6 | MIT |
| `react` | 19.2.3 | MIT |
| `react-day-picker` | 9.13.0 | MIT |
| `react-dom` | 19.2.3 | MIT |
| `react-hook-form` | 7.70.0 | MIT |
| `react-resizable-panels` | 4.2.2 | MIT |
| `react-router` | 7.18.4 | MIT |
| `recharts` | 2.15.4 | MIT |
| `sonner` | 2.0.7 | MIT |
| `superjson` | 2.2.6 | MIT |
| `tailwind-merge` | 3.4.0 | MIT |
| `vaul` | 1.1.2 | MIT |
| `zod` | 4.3.5 | MIT |

### Dependências diretas de desenvolvimento (`devDependencies`)

| pacote | versão | licença |
|---|---|---|
| `@eslint/js` | 9.39.2 | MIT |
| `@hono/vite-dev-server` | 0.19.1 | MIT |
| `@types/node` | 24.10.4 | MIT |
| `@types/react` | 19.2.7 | MIT |
| `@types/react-dom` | 19.2.3 | MIT |
| `@vitejs/plugin-react` | 5.1.2 | MIT |
| `autoprefixer` | 10.4.23 | MIT |
| `drizzle-kit` | 0.31.11 | MIT |
| `esbuild` | 0.27.2 | MIT |
| `eslint` | 9.39.2 | MIT |
| `eslint-plugin-react-hooks` | 7.0.1 | MIT |
| `eslint-plugin-react-refresh` | 0.4.26 | MIT |
| `globals` | 16.5.0 | MIT |
| `kimi-plugin-inspect-react` | 1.0.3 | ISC |
| `postcss` | 8.5.6 | MIT |
| `prettier` | 3.9.9 | MIT |
| `tailwindcss` | 3.4.19 | MIT |
| `tailwindcss-animate` | 1.0.7 | MIT |
| `tw-animate-css` | 1.4.0 | MIT |
| `typescript` | 5.9.3 | Apache-2.0 |
| `typescript-eslint` | 8.52.0 | MIT |
| `vite` | 7.3.0 | MIT |
| `vitest` | 4.1.11 | MIT |

### Todos os pacotes do lock (679)

| pacote | versão | licença | uso |
|---|---|---|---|
| `@ai-sdk/gateway` | 3.0.200 | Apache-2.0 | execução |
| `@ai-sdk/openai-compatible` | 2.0.78 | Apache-2.0 | execução |
| `@ai-sdk/provider` | 3.0.17 | Apache-2.0 | execução |
| `@ai-sdk/provider-utils` | 4.0.54 | Apache-2.0 | execução |
| `@alloc/quick-lru` | 5.2.0 | MIT | dev |
| `@babel/code-frame` | 7.29.7 | MIT | dev |
| `@babel/compat-data` | 7.29.7 | MIT | dev |
| `@babel/core` | 7.28.5 | MIT | dev |
| `@babel/generator` | 7.29.8 | MIT | dev |
| `@babel/helper-annotate-as-pure` | 7.29.7 | MIT | dev |
| `@babel/helper-compilation-targets` | 7.29.7 | MIT | dev |
| `@babel/helper-create-class-features-plugin` | 7.29.7 | MIT | dev |
| `@babel/helper-create-regexp-features-plugin` | 7.29.7 | MIT | dev |
| `@babel/helper-define-polyfill-provider` | 0.6.8 | MIT | dev |
| `@babel/helper-globals` | 7.29.7 | MIT | dev |
| `@babel/helper-member-expression-to-functions` | 7.29.7 | MIT | dev |
| `@babel/helper-module-imports` | 7.29.7 | MIT | dev |
| `@babel/helper-module-transforms` | 7.29.7 | MIT | dev |
| `@babel/helper-optimise-call-expression` | 7.29.7 | MIT | dev |
| `@babel/helper-plugin-utils` | 7.29.7 | MIT | dev |
| `@babel/helper-remap-async-to-generator` | 7.29.7 | MIT | dev |
| `@babel/helper-replace-supers` | 7.29.7 | MIT | dev |
| `@babel/helper-skip-transparent-expression-wrappers` | 7.29.7 | MIT | dev |
| `@babel/helper-string-parser` | 7.29.7 | MIT | dev |
| `@babel/helper-validator-identifier` | 7.29.7 | MIT | dev |
| `@babel/helper-validator-option` | 7.29.7 | MIT | dev |
| `@babel/helper-wrap-function` | 7.29.7 | MIT | dev |
| `@babel/helpers` | 7.28.4 | MIT | dev |
| `@babel/parser` | 7.29.9 | MIT | dev |
| `@babel/plugin-bugfix-firefox-class-in-computed-class-key` | 7.29.7 | MIT | dev |
| `@babel/plugin-bugfix-safari-class-field-initializer-scope` | 7.29.7 | MIT | dev |
| `@babel/plugin-bugfix-safari-id-destructuring-collision-in-function-expression` | 7.29.7 | MIT | dev |
| `@babel/plugin-bugfix-safari-rest-destructuring-rhs-array` | 7.29.7 | MIT | dev |
| `@babel/plugin-bugfix-v8-spread-parameters-in-optional-chaining` | 7.29.7 | MIT | dev |
| `@babel/plugin-bugfix-v8-static-class-fields-redefine-readonly` | 7.29.7 | MIT | dev |
| `@babel/plugin-proposal-decorators` | 7.29.7 | MIT | dev |
| `@babel/plugin-proposal-private-property-in-object` | 7.21.0-placeholder-for-preset-env.2 | MIT | dev |
| `@babel/plugin-syntax-decorators` | 7.29.7 | MIT | dev |
| `@babel/plugin-syntax-import-assertions` | 7.29.7 | MIT | dev |
| `@babel/plugin-syntax-import-attributes` | 7.29.7 | MIT | dev |
| `@babel/plugin-syntax-jsx` | 7.29.7 | MIT | dev |
| `@babel/plugin-syntax-typescript` | 7.29.7 | MIT | dev |
| `@babel/plugin-syntax-unicode-sets-regex` | 7.18.6 | MIT | dev |
| `@babel/plugin-transform-arrow-functions` | 7.29.7 | MIT | dev |
| `@babel/plugin-transform-async-generator-functions` | 7.29.7 | MIT | dev |
| `@babel/plugin-transform-async-to-generator` | 7.29.7 | MIT | dev |
| `@babel/plugin-transform-block-scoped-functions` | 7.29.7 | MIT | dev |
| `@babel/plugin-transform-block-scoping` | 7.29.7 | MIT | dev |
| `@babel/plugin-transform-class-properties` | 7.29.7 | MIT | dev |
| `@babel/plugin-transform-class-static-block` | 7.29.7 | MIT | dev |
| `@babel/plugin-transform-classes` | 7.29.7 | MIT | dev |
| `@babel/plugin-transform-computed-properties` | 7.29.7 | MIT | dev |
| `@babel/plugin-transform-destructuring` | 7.29.7 | MIT | dev |
| `@babel/plugin-transform-dotall-regex` | 7.29.7 | MIT | dev |
| `@babel/plugin-transform-duplicate-keys` | 7.29.7 | MIT | dev |
| `@babel/plugin-transform-duplicate-named-capturing-groups-regex` | 7.29.7 | MIT | dev |
| `@babel/plugin-transform-dynamic-import` | 7.29.7 | MIT | dev |
| `@babel/plugin-transform-explicit-resource-management` | 7.29.7 | MIT | dev |
| `@babel/plugin-transform-exponentiation-operator` | 7.29.7 | MIT | dev |
| `@babel/plugin-transform-export-namespace-from` | 7.29.7 | MIT | dev |
| `@babel/plugin-transform-for-of` | 7.29.7 | MIT | dev |
| `@babel/plugin-transform-function-name` | 7.29.7 | MIT | dev |
| `@babel/plugin-transform-json-strings` | 7.29.7 | MIT | dev |
| `@babel/plugin-transform-literals` | 7.29.7 | MIT | dev |
| `@babel/plugin-transform-logical-assignment-operators` | 7.29.7 | MIT | dev |
| `@babel/plugin-transform-member-expression-literals` | 7.29.7 | MIT | dev |
| `@babel/plugin-transform-modules-amd` | 7.29.7 | MIT | dev |
| `@babel/plugin-transform-modules-commonjs` | 7.29.7 | MIT | dev |
| `@babel/plugin-transform-modules-systemjs` | 7.29.8 | MIT | dev |
| `@babel/plugin-transform-modules-umd` | 7.29.7 | MIT | dev |
| `@babel/plugin-transform-named-capturing-groups-regex` | 7.29.7 | MIT | dev |
| `@babel/plugin-transform-new-target` | 7.29.7 | MIT | dev |
| `@babel/plugin-transform-nullish-coalescing-operator` | 7.29.7 | MIT | dev |
| `@babel/plugin-transform-numeric-separator` | 7.29.7 | MIT | dev |
| `@babel/plugin-transform-object-rest-spread` | 7.29.7 | MIT | dev |
| `@babel/plugin-transform-object-super` | 7.29.7 | MIT | dev |
| `@babel/plugin-transform-optional-catch-binding` | 7.29.7 | MIT | dev |
| `@babel/plugin-transform-optional-chaining` | 7.29.7 | MIT | dev |
| `@babel/plugin-transform-parameters` | 7.29.7 | MIT | dev |
| `@babel/plugin-transform-private-methods` | 7.29.7 | MIT | dev |
| `@babel/plugin-transform-private-property-in-object` | 7.29.7 | MIT | dev |
| `@babel/plugin-transform-property-literals` | 7.29.7 | MIT | dev |
| `@babel/plugin-transform-react-display-name` | 7.29.7 | MIT | dev |
| `@babel/plugin-transform-react-jsx` | 7.29.7 | MIT | dev |
| `@babel/plugin-transform-react-jsx-development` | 7.29.7 | MIT | dev |
| `@babel/plugin-transform-react-jsx-self` | 7.27.1 | MIT | dev |
| `@babel/plugin-transform-react-jsx-source` | 7.27.1 | MIT | dev |
| `@babel/plugin-transform-react-pure-annotations` | 7.29.7 | MIT | dev |
| `@babel/plugin-transform-regenerator` | 7.29.8 | MIT | dev |
| `@babel/plugin-transform-regexp-modifiers` | 7.29.7 | MIT | dev |
| `@babel/plugin-transform-reserved-words` | 7.29.7 | MIT | dev |
| `@babel/plugin-transform-shorthand-properties` | 7.29.7 | MIT | dev |
| `@babel/plugin-transform-spread` | 7.29.8 | MIT | dev |
| `@babel/plugin-transform-sticky-regex` | 7.29.7 | MIT | dev |
| `@babel/plugin-transform-template-literals` | 7.29.7 | MIT | dev |
| `@babel/plugin-transform-typeof-symbol` | 7.29.7 | MIT | dev |
| `@babel/plugin-transform-typescript` | 7.29.9 | MIT | dev |
| `@babel/plugin-transform-unicode-escapes` | 7.29.7 | MIT | dev |
| `@babel/plugin-transform-unicode-property-regex` | 7.29.7 | MIT | dev |
| `@babel/plugin-transform-unicode-regex` | 7.29.7 | MIT | dev |
| `@babel/plugin-transform-unicode-sets-regex` | 7.29.7 | MIT | dev |
| `@babel/preset-env` | 7.29.7 | MIT | dev |
| `@babel/preset-modules` | 0.1.6-no-external-plugins | MIT | dev |
| `@babel/preset-react` | 7.29.7 | MIT | dev |
| `@babel/preset-typescript` | 7.29.7 | MIT | dev |
| `@babel/runtime` | 7.28.4 | MIT | execução |
| `@babel/template` | 7.29.7 | MIT | dev |
| `@babel/traverse` | 7.29.8 | MIT | dev |
| `@babel/types` | 7.29.8 | MIT | dev |
| `@date-fns/tz` | 1.4.1 | MIT | execução |
| `@drizzle-team/brocli` | 0.10.2 | Apache-2.0 | dev |
| `@esbuild-kit/core-utils` | 3.3.2 | MIT | dev |
| `@esbuild-kit/esm-loader` | 2.6.5 | MIT | dev |
| `@esbuild/aix-ppc64` | 0.25.12 | MIT | dev |
| `@esbuild/aix-ppc64` | 0.27.2 | MIT | dev |
| `@esbuild/aix-ppc64` | 0.28.2 | MIT | dev |
| `@esbuild/android-arm` | 0.18.20 | MIT | dev |
| `@esbuild/android-arm` | 0.25.12 | MIT | dev |
| `@esbuild/android-arm` | 0.27.2 | MIT | dev |
| `@esbuild/android-arm` | 0.28.2 | MIT | dev |
| `@esbuild/android-arm64` | 0.18.20 | MIT | dev |
| `@esbuild/android-arm64` | 0.25.12 | MIT | dev |
| `@esbuild/android-arm64` | 0.27.2 | MIT | dev |
| `@esbuild/android-arm64` | 0.28.2 | MIT | dev |
| `@esbuild/android-x64` | 0.18.20 | MIT | dev |
| `@esbuild/android-x64` | 0.25.12 | MIT | dev |
| `@esbuild/android-x64` | 0.27.2 | MIT | dev |
| `@esbuild/android-x64` | 0.28.2 | MIT | dev |
| `@esbuild/darwin-arm64` | 0.18.20 | MIT | dev |
| `@esbuild/darwin-arm64` | 0.25.12 | MIT | dev |
| `@esbuild/darwin-arm64` | 0.27.2 | MIT | dev |
| `@esbuild/darwin-arm64` | 0.28.2 | MIT | dev |
| `@esbuild/darwin-x64` | 0.18.20 | MIT | dev |
| `@esbuild/darwin-x64` | 0.25.12 | MIT | dev |
| `@esbuild/darwin-x64` | 0.27.2 | MIT | dev |
| `@esbuild/darwin-x64` | 0.28.2 | MIT | dev |
| `@esbuild/freebsd-arm64` | 0.18.20 | MIT | dev |
| `@esbuild/freebsd-arm64` | 0.25.12 | MIT | dev |
| `@esbuild/freebsd-arm64` | 0.27.2 | MIT | dev |
| `@esbuild/freebsd-arm64` | 0.28.2 | MIT | dev |
| `@esbuild/freebsd-x64` | 0.18.20 | MIT | dev |
| `@esbuild/freebsd-x64` | 0.25.12 | MIT | dev |
| `@esbuild/freebsd-x64` | 0.27.2 | MIT | dev |
| `@esbuild/freebsd-x64` | 0.28.2 | MIT | dev |
| `@esbuild/linux-arm` | 0.18.20 | MIT | dev |
| `@esbuild/linux-arm` | 0.25.12 | MIT | dev |
| `@esbuild/linux-arm` | 0.27.2 | MIT | dev |
| `@esbuild/linux-arm` | 0.28.2 | MIT | dev |
| `@esbuild/linux-arm64` | 0.18.20 | MIT | dev |
| `@esbuild/linux-arm64` | 0.25.12 | MIT | dev |
| `@esbuild/linux-arm64` | 0.27.2 | MIT | dev |
| `@esbuild/linux-arm64` | 0.28.2 | MIT | dev |
| `@esbuild/linux-ia32` | 0.18.20 | MIT | dev |
| `@esbuild/linux-ia32` | 0.25.12 | MIT | dev |
| `@esbuild/linux-ia32` | 0.27.2 | MIT | dev |
| `@esbuild/linux-ia32` | 0.28.2 | MIT | dev |
| `@esbuild/linux-loong64` | 0.18.20 | MIT | dev |
| `@esbuild/linux-loong64` | 0.25.12 | MIT | dev |
| `@esbuild/linux-loong64` | 0.27.2 | MIT | dev |
| `@esbuild/linux-loong64` | 0.28.2 | MIT | dev |
| `@esbuild/linux-mips64el` | 0.18.20 | MIT | dev |
| `@esbuild/linux-mips64el` | 0.25.12 | MIT | dev |
| `@esbuild/linux-mips64el` | 0.27.2 | MIT | dev |
| `@esbuild/linux-mips64el` | 0.28.2 | MIT | dev |
| `@esbuild/linux-ppc64` | 0.18.20 | MIT | dev |
| `@esbuild/linux-ppc64` | 0.25.12 | MIT | dev |
| `@esbuild/linux-ppc64` | 0.27.2 | MIT | dev |
| `@esbuild/linux-ppc64` | 0.28.2 | MIT | dev |
| `@esbuild/linux-riscv64` | 0.18.20 | MIT | dev |
| `@esbuild/linux-riscv64` | 0.25.12 | MIT | dev |
| `@esbuild/linux-riscv64` | 0.27.2 | MIT | dev |
| `@esbuild/linux-riscv64` | 0.28.2 | MIT | dev |
| `@esbuild/linux-s390x` | 0.18.20 | MIT | dev |
| `@esbuild/linux-s390x` | 0.25.12 | MIT | dev |
| `@esbuild/linux-s390x` | 0.27.2 | MIT | dev |
| `@esbuild/linux-s390x` | 0.28.2 | MIT | dev |
| `@esbuild/linux-x64` | 0.18.20 | MIT | dev |
| `@esbuild/linux-x64` | 0.25.12 | MIT | dev |
| `@esbuild/linux-x64` | 0.27.2 | MIT | dev |
| `@esbuild/linux-x64` | 0.28.2 | MIT | dev |
| `@esbuild/netbsd-arm64` | 0.25.12 | MIT | dev |
| `@esbuild/netbsd-arm64` | 0.27.2 | MIT | dev |
| `@esbuild/netbsd-arm64` | 0.28.2 | MIT | dev |
| `@esbuild/netbsd-x64` | 0.18.20 | MIT | dev |
| `@esbuild/netbsd-x64` | 0.25.12 | MIT | dev |
| `@esbuild/netbsd-x64` | 0.27.2 | MIT | dev |
| `@esbuild/netbsd-x64` | 0.28.2 | MIT | dev |
| `@esbuild/openbsd-arm64` | 0.25.12 | MIT | dev |
| `@esbuild/openbsd-arm64` | 0.27.2 | MIT | dev |
| `@esbuild/openbsd-arm64` | 0.28.2 | MIT | dev |
| `@esbuild/openbsd-x64` | 0.18.20 | MIT | dev |
| `@esbuild/openbsd-x64` | 0.25.12 | MIT | dev |
| `@esbuild/openbsd-x64` | 0.27.2 | MIT | dev |
| `@esbuild/openbsd-x64` | 0.28.2 | MIT | dev |
| `@esbuild/openharmony-arm64` | 0.25.12 | MIT | dev |
| `@esbuild/openharmony-arm64` | 0.27.2 | MIT | dev |
| `@esbuild/openharmony-arm64` | 0.28.2 | MIT | dev |
| `@esbuild/sunos-x64` | 0.18.20 | MIT | dev |
| `@esbuild/sunos-x64` | 0.25.12 | MIT | dev |
| `@esbuild/sunos-x64` | 0.27.2 | MIT | dev |
| `@esbuild/sunos-x64` | 0.28.2 | MIT | dev |
| `@esbuild/win32-arm64` | 0.18.20 | MIT | dev |
| `@esbuild/win32-arm64` | 0.25.12 | MIT | dev |
| `@esbuild/win32-arm64` | 0.27.2 | MIT | dev |
| `@esbuild/win32-arm64` | 0.28.2 | MIT | dev |
| `@esbuild/win32-ia32` | 0.18.20 | MIT | dev |
| `@esbuild/win32-ia32` | 0.25.12 | MIT | dev |
| `@esbuild/win32-ia32` | 0.27.2 | MIT | dev |
| `@esbuild/win32-ia32` | 0.28.2 | MIT | dev |
| `@esbuild/win32-x64` | 0.18.20 | MIT | dev |
| `@esbuild/win32-x64` | 0.25.12 | MIT | dev |
| `@esbuild/win32-x64` | 0.27.2 | MIT | dev |
| `@esbuild/win32-x64` | 0.28.2 | MIT | dev |
| `@eslint-community/eslint-utils` | 4.9.1 | MIT | dev |
| `@eslint-community/regexpp` | 4.12.2 | MIT | dev |
| `@eslint/config-array` | 0.21.1 | Apache-2.0 | dev |
| `@eslint/config-helpers` | 0.4.2 | Apache-2.0 | dev |
| `@eslint/core` | 0.17.0 | Apache-2.0 | dev |
| `@eslint/eslintrc` | 3.3.3 | MIT | dev |
| `@eslint/js` | 9.39.2 | MIT | dev |
| `@eslint/object-schema` | 2.1.7 | Apache-2.0 | dev |
| `@eslint/plugin-kit` | 0.4.1 | Apache-2.0 | dev |
| `@floating-ui/core` | 1.7.3 | MIT | execução |
| `@floating-ui/dom` | 1.7.4 | MIT | execução |
| `@floating-ui/react-dom` | 2.1.6 | MIT | execução |
| `@floating-ui/utils` | 0.2.10 | MIT | execução |
| `@hono/node-server` | 1.19.17 | MIT | execução |
| `@hono/vite-dev-server` | 0.19.1 | MIT | dev |
| `@hookform/resolvers` | 5.2.2 | MIT | execução |
| `@humanfs/core` | 0.19.1 | Apache-2.0 | dev |
| `@humanfs/node` | 0.16.7 | Apache-2.0 | dev |
| `@humanwhocodes/module-importer` | 1.0.1 | Apache-2.0 | dev |
| `@humanwhocodes/retry` | 0.4.3 | Apache-2.0 | dev |
| `@jridgewell/gen-mapping` | 0.3.13 | MIT | dev |
| `@jridgewell/remapping` | 2.3.5 | MIT | dev |
| `@jridgewell/resolve-uri` | 3.1.2 | MIT | dev |
| `@jridgewell/sourcemap-codec` | 1.5.5 | MIT | dev |
| `@jridgewell/trace-mapping` | 0.3.31 | MIT | dev |
| `@nodelib/fs.scandir` | 2.1.5 | MIT | dev |
| `@nodelib/fs.stat` | 2.0.5 | MIT | dev |
| `@nodelib/fs.walk` | 1.2.8 | MIT | dev |
| `@opentelemetry/api` | 1.9.1 | Apache-2.0 | execução |
| `@radix-ui/number` | 1.1.1 | MIT | execução |
| `@radix-ui/primitive` | 1.1.3 | MIT | execução |
| `@radix-ui/react-accordion` | 1.2.12 | MIT | execução |
| `@radix-ui/react-alert-dialog` | 1.1.15 | MIT | execução |
| `@radix-ui/react-arrow` | 1.1.7 | MIT | execução |
| `@radix-ui/react-aspect-ratio` | 1.1.8 | MIT | execução |
| `@radix-ui/react-avatar` | 1.1.11 | MIT | execução |
| `@radix-ui/react-checkbox` | 1.3.3 | MIT | execução |
| `@radix-ui/react-collapsible` | 1.1.12 | MIT | execução |
| `@radix-ui/react-collection` | 1.1.7 | MIT | execução |
| `@radix-ui/react-compose-refs` | 1.1.2 | MIT | execução |
| `@radix-ui/react-context` | 1.1.2 | MIT | execução |
| `@radix-ui/react-context` | 1.1.3 | MIT | execução |
| `@radix-ui/react-context` | 1.1.3 | MIT | execução |
| `@radix-ui/react-context-menu` | 2.2.16 | MIT | execução |
| `@radix-ui/react-dialog` | 1.1.15 | MIT | execução |
| `@radix-ui/react-direction` | 1.1.1 | MIT | execução |
| `@radix-ui/react-dismissable-layer` | 1.1.11 | MIT | execução |
| `@radix-ui/react-dropdown-menu` | 2.1.16 | MIT | execução |
| `@radix-ui/react-focus-guards` | 1.1.3 | MIT | execução |
| `@radix-ui/react-focus-scope` | 1.1.7 | MIT | execução |
| `@radix-ui/react-hover-card` | 1.1.15 | MIT | execução |
| `@radix-ui/react-id` | 1.1.1 | MIT | execução |
| `@radix-ui/react-label` | 2.1.8 | MIT | execução |
| `@radix-ui/react-menu` | 2.1.16 | MIT | execução |
| `@radix-ui/react-menubar` | 1.1.16 | MIT | execução |
| `@radix-ui/react-navigation-menu` | 1.2.14 | MIT | execução |
| `@radix-ui/react-popover` | 1.1.15 | MIT | execução |
| `@radix-ui/react-popper` | 1.2.8 | MIT | execução |
| `@radix-ui/react-portal` | 1.1.9 | MIT | execução |
| `@radix-ui/react-presence` | 1.1.5 | MIT | execução |
| `@radix-ui/react-primitive` | 2.1.3 | MIT | execução |
| `@radix-ui/react-primitive` | 2.1.4 | MIT | execução |
| `@radix-ui/react-primitive` | 2.1.4 | MIT | execução |
| `@radix-ui/react-primitive` | 2.1.4 | MIT | execução |
| `@radix-ui/react-primitive` | 2.1.4 | MIT | execução |
| `@radix-ui/react-primitive` | 2.1.4 | MIT | execução |
| `@radix-ui/react-progress` | 1.1.8 | MIT | execução |
| `@radix-ui/react-radio-group` | 1.3.8 | MIT | execução |
| `@radix-ui/react-roving-focus` | 1.1.11 | MIT | execução |
| `@radix-ui/react-scroll-area` | 1.2.10 | MIT | execução |
| `@radix-ui/react-select` | 2.2.6 | MIT | execução |
| `@radix-ui/react-separator` | 1.1.8 | MIT | execução |
| `@radix-ui/react-slider` | 1.3.6 | MIT | execução |
| `@radix-ui/react-slot` | 1.2.3 | MIT | execução |
| `@radix-ui/react-slot` | 1.2.3 | MIT | execução |
| `@radix-ui/react-slot` | 1.2.3 | MIT | execução |
| `@radix-ui/react-slot` | 1.2.3 | MIT | execução |
| `@radix-ui/react-slot` | 1.2.3 | MIT | execução |
| `@radix-ui/react-slot` | 1.2.3 | MIT | execução |
| `@radix-ui/react-slot` | 1.2.3 | MIT | execução |
| `@radix-ui/react-slot` | 1.2.3 | MIT | execução |
| `@radix-ui/react-slot` | 1.2.4 | MIT | execução |
| `@radix-ui/react-switch` | 1.2.6 | MIT | execução |
| `@radix-ui/react-tabs` | 1.1.13 | MIT | execução |
| `@radix-ui/react-toggle` | 1.1.10 | MIT | execução |
| `@radix-ui/react-toggle-group` | 1.1.11 | MIT | execução |
| `@radix-ui/react-tooltip` | 1.2.8 | MIT | execução |
| `@radix-ui/react-use-callback-ref` | 1.1.1 | MIT | execução |
| `@radix-ui/react-use-controllable-state` | 1.2.2 | MIT | execução |
| `@radix-ui/react-use-effect-event` | 0.0.2 | MIT | execução |
| `@radix-ui/react-use-escape-keydown` | 1.1.1 | MIT | execução |
| `@radix-ui/react-use-is-hydrated` | 0.1.0 | MIT | execução |
| `@radix-ui/react-use-layout-effect` | 1.1.1 | MIT | execução |
| `@radix-ui/react-use-previous` | 1.1.1 | MIT | execução |
| `@radix-ui/react-use-rect` | 1.1.1 | MIT | execução |
| `@radix-ui/react-use-size` | 1.1.1 | MIT | execução |
| `@radix-ui/react-visually-hidden` | 1.2.3 | MIT | execução |
| `@radix-ui/rect` | 1.1.1 | MIT | execução |
| `@rolldown/pluginutils` | 1.0.0-beta.53 | MIT | dev |
| `@rollup/rollup-android-arm-eabi` | 4.55.1 | MIT | dev |
| `@rollup/rollup-android-arm64` | 4.55.1 | MIT | dev |
| `@rollup/rollup-darwin-arm64` | 4.55.1 | MIT | dev |
| `@rollup/rollup-darwin-x64` | 4.55.1 | MIT | dev |
| `@rollup/rollup-freebsd-arm64` | 4.55.1 | MIT | dev |
| `@rollup/rollup-freebsd-x64` | 4.55.1 | MIT | dev |
| `@rollup/rollup-linux-arm-gnueabihf` | 4.55.1 | MIT | dev |
| `@rollup/rollup-linux-arm-musleabihf` | 4.55.1 | MIT | dev |
| `@rollup/rollup-linux-arm64-gnu` | 4.55.1 | MIT | dev |
| `@rollup/rollup-linux-arm64-musl` | 4.55.1 | MIT | dev |
| `@rollup/rollup-linux-loong64-gnu` | 4.55.1 | MIT | dev |
| `@rollup/rollup-linux-loong64-musl` | 4.55.1 | MIT | dev |
| `@rollup/rollup-linux-ppc64-gnu` | 4.55.1 | MIT | dev |
| `@rollup/rollup-linux-ppc64-musl` | 4.55.1 | MIT | dev |
| `@rollup/rollup-linux-riscv64-gnu` | 4.55.1 | MIT | dev |
| `@rollup/rollup-linux-riscv64-musl` | 4.55.1 | MIT | dev |
| `@rollup/rollup-linux-s390x-gnu` | 4.55.1 | MIT | dev |
| `@rollup/rollup-linux-x64-gnu` | 4.55.1 | MIT | dev |
| `@rollup/rollup-linux-x64-musl` | 4.55.1 | MIT | dev |
| `@rollup/rollup-openbsd-x64` | 4.55.1 | MIT | dev |
| `@rollup/rollup-openharmony-arm64` | 4.55.1 | MIT | dev |
| `@rollup/rollup-win32-arm64-msvc` | 4.55.1 | MIT | dev |
| `@rollup/rollup-win32-ia32-msvc` | 4.55.1 | MIT | dev |
| `@rollup/rollup-win32-x64-gnu` | 4.55.1 | MIT | dev |
| `@rollup/rollup-win32-x64-msvc` | 4.55.1 | MIT | dev |
| `@standard-schema/spec` | 1.1.0 | MIT | execução |
| `@standard-schema/utils` | 0.3.0 | MIT | execução |
| `@tanstack/query-core` | 5.103.2 | MIT | execução |
| `@tanstack/react-query` | 5.103.2 | MIT | execução |
| `@trpc/client` | 11.19.0 | MIT | execução |
| `@trpc/react-query` | 11.19.0 | MIT | execução |
| `@trpc/server` | 11.19.0 | MIT | execução |
| `@types/babel__core` | 7.20.5 | MIT | dev |
| `@types/babel__generator` | 7.27.0 | MIT | dev |
| `@types/babel__template` | 7.4.4 | MIT | dev |
| `@types/babel__traverse` | 7.28.0 | MIT | dev |
| `@types/chai` | 5.2.3 | MIT | dev |
| `@types/d3-array` | 3.2.2 | MIT | execução |
| `@types/d3-color` | 3.1.3 | MIT | execução |
| `@types/d3-ease` | 3.0.2 | MIT | execução |
| `@types/d3-interpolate` | 3.0.4 | MIT | execução |
| `@types/d3-path` | 3.1.1 | MIT | execução |
| `@types/d3-scale` | 4.0.9 | MIT | execução |
| `@types/d3-shape` | 3.1.7 | MIT | execução |
| `@types/d3-time` | 3.0.4 | MIT | execução |
| `@types/d3-timer` | 3.0.2 | MIT | execução |
| `@types/deep-eql` | 4.0.2 | MIT | dev |
| `@types/estree` | 1.0.8 | MIT | dev |
| `@types/json-schema` | 7.0.15 | MIT | dev |
| `@types/node` | 24.10.4 | MIT | execução |
| `@types/react` | 19.2.7 | MIT | execução |
| `@types/react-dom` | 19.2.3 | MIT | execução |
| `@typescript-eslint/eslint-plugin` | 8.52.0 | MIT | dev |
| `@typescript-eslint/parser` | 8.52.0 | MIT | dev |
| `@typescript-eslint/project-service` | 8.52.0 | MIT | dev |
| `@typescript-eslint/scope-manager` | 8.52.0 | MIT | dev |
| `@typescript-eslint/tsconfig-utils` | 8.52.0 | MIT | dev |
| `@typescript-eslint/type-utils` | 8.52.0 | MIT | dev |
| `@typescript-eslint/types` | 8.52.0 | MIT | dev |
| `@typescript-eslint/typescript-estree` | 8.52.0 | MIT | dev |
| `@typescript-eslint/utils` | 8.52.0 | MIT | dev |
| `@typescript-eslint/visitor-keys` | 8.52.0 | MIT | dev |
| `@vercel/oidc` | 3.2.0 | Apache-2.0 | execução |
| `@vitejs/plugin-react` | 5.1.2 | MIT | dev |
| `@vitest/expect` | 4.1.11 | MIT | dev |
| `@vitest/mocker` | 4.1.11 | MIT | dev |
| `@vitest/pretty-format` | 4.1.11 | MIT | dev |
| `@vitest/runner` | 4.1.11 | MIT | dev |
| `@vitest/snapshot` | 4.1.11 | MIT | dev |
| `@vitest/spy` | 4.1.11 | MIT | dev |
| `@vitest/utils` | 4.1.11 | MIT | dev |
| `acorn` | 8.15.0 | MIT | dev |
| `acorn-jsx` | 5.3.2 | MIT | dev |
| `ai` | 6.0.290 | Apache-2.0 | execução |
| `ajv` | 6.12.6 | MIT | dev |
| `ansi-styles` | 4.3.0 | MIT | dev |
| `any-promise` | 1.3.0 | MIT | dev |
| `anymatch` | 3.1.3 | ISC | dev |
| `arg` | 5.0.2 | MIT | dev |
| `argparse` | 2.0.1 | Python-2.0 | dev |
| `aria-hidden` | 1.2.6 | MIT | execução |
| `assertion-error` | 2.0.1 | MIT | dev |
| `autoprefixer` | 10.4.23 | MIT | dev |
| `aws-ssl-profiles` | 1.1.2 | MIT | execução |
| `babel-plugin-polyfill-corejs2` | 0.4.17 | MIT | dev |
| `babel-plugin-polyfill-corejs3` | 0.14.2 | MIT | dev |
| `babel-plugin-polyfill-regenerator` | 0.6.8 | MIT | dev |
| `balanced-match` | 1.0.2 | MIT | dev |
| `baseline-browser-mapping` | 2.11.26 | Apache-2.0 | dev |
| `binary-extensions` | 2.3.0 | MIT | dev |
| `brace-expansion` | 1.1.12 | MIT | dev |
| `brace-expansion` | 2.0.2 | MIT | dev |
| `brace-expansion` | 2.1.7 | MIT | dev |
| `braces` | 3.0.3 | MIT | dev |
| `browserslist` | 4.29.1 | MIT | dev |
| `buffer-from` | 1.1.2 | MIT | dev |
| `callsites` | 3.1.0 | MIT | dev |
| `camelcase-css` | 2.0.1 | MIT | dev |
| `caniuse-lite` | 1.0.30001812 | CC-BY-4.0 | dev |
| `chai` | 6.2.2 | MIT | dev |
| `chalk` | 4.1.2 | MIT | dev |
| `chokidar` | 3.6.0 | MIT | dev |
| `class-variance-authority` | 0.7.1 | Apache-2.0 | execução |
| `clsx` | 2.1.1 | MIT | execução |
| `cmdk` | 1.1.1 | MIT | execução |
| `color-convert` | 2.0.1 | MIT | dev |
| `color-name` | 1.1.4 | MIT | dev |
| `commander` | 4.1.1 | MIT | dev |
| `concat-map` | 0.0.1 | MIT | dev |
| `convert-source-map` | 2.0.0 | MIT | dev |
| `cookie` | 1.1.1 | MIT | execução |
| `copy-anything` | 4.1.1 | MIT | execução |
| `core-js-compat` | 3.50.0 | MIT | dev |
| `cross-spawn` | 7.0.6 | MIT | dev |
| `cssesc` | 3.0.0 | MIT | dev |
| `csstype` | 3.2.3 | MIT | execução |
| `d3-array` | 3.2.4 | ISC | execução |
| `d3-color` | 3.1.0 | ISC | execução |
| `d3-ease` | 3.0.1 | BSD-3-Clause | execução |
| `d3-format` | 3.1.0 | ISC | execução |
| `d3-interpolate` | 3.0.1 | ISC | execução |
| `d3-path` | 3.1.0 | ISC | execução |
| `d3-scale` | 4.0.2 | ISC | execução |
| `d3-shape` | 3.2.0 | ISC | execução |
| `d3-time` | 3.1.0 | ISC | execução |
| `d3-time-format` | 4.1.0 | ISC | execução |
| `d3-timer` | 3.0.1 | ISC | execução |
| `date-fns` | 4.1.0 | MIT | execução |
| `date-fns-jalali` | 4.1.0-0 | MIT | execução |
| `debug` | 4.4.3 | MIT | dev |
| `decimal.js-light` | 2.5.1 | MIT | execução |
| `deep-is` | 0.1.4 | MIT | dev |
| `detect-node-es` | 1.1.0 | MIT | execução |
| `didyoumean` | 1.2.2 | Apache-2.0 | dev |
| `dlv` | 1.1.3 | MIT | dev |
| `dom-helpers` | 5.2.1 | MIT | execução |
| `dotenv` | 17.4.2 | BSD-2-Clause | execução |
| `drizzle-kit` | 0.31.11 | MIT | dev |
| `drizzle-orm` | 0.45.3 | Apache-2.0 | execução |
| `electron-to-chromium` | 1.5.439 | ISC | dev |
| `embla-carousel` | 8.6.0 | MIT | execução |
| `embla-carousel-react` | 8.6.0 | MIT | execução |
| `embla-carousel-reactive-utils` | 8.6.0 | MIT | execução |
| `es-module-lexer` | 2.3.2 | MIT | dev |
| `esbuild` | 0.18.20 | MIT | dev |
| `esbuild` | 0.25.12 | MIT | dev |
| `esbuild` | 0.27.2 | MIT | dev |
| `esbuild` | 0.28.2 | MIT | dev |
| `escalade` | 3.2.0 | MIT | dev |
| `escape-string-regexp` | 4.0.0 | MIT | dev |
| `eslint` | 9.39.2 | MIT | dev |
| `eslint-plugin-react-hooks` | 7.0.1 | MIT | dev |
| `eslint-plugin-react-refresh` | 0.4.26 | MIT | dev |
| `eslint-scope` | 8.4.0 | BSD-2-Clause | dev |
| `eslint-visitor-keys` | 3.4.3 | Apache-2.0 | dev |
| `eslint-visitor-keys` | 4.2.1 | Apache-2.0 | dev |
| `espree` | 10.4.0 | BSD-2-Clause | dev |
| `esquery` | 1.7.0 | BSD-3-Clause | dev |
| `esrecurse` | 4.3.0 | BSD-2-Clause | dev |
| `estraverse` | 5.3.0 | BSD-2-Clause | dev |
| `estree-walker` | 3.0.3 | MIT | dev |
| `esutils` | 2.0.3 | BSD-2-Clause | dev |
| `eventemitter3` | 4.0.7 | MIT | execução |
| `eventsource-parser` | 3.1.1 | MIT | execução |
| `expect-type` | 1.4.0 | Apache-2.0 | dev |
| `fast-deep-equal` | 3.1.3 | MIT | dev |
| `fast-equals` | 5.4.0 | MIT | execução |
| `fast-glob` | 3.3.3 | MIT | dev |
| `fast-json-stable-stringify` | 2.1.0 | MIT | dev |
| `fast-levenshtein` | 2.0.6 | MIT | dev |
| `fastq` | 1.20.1 | ISC | dev |
| `fdir` | 6.5.0 | MIT | dev |
| `file-entry-cache` | 8.0.0 | MIT | dev |
| `fill-range` | 7.1.1 | MIT | dev |
| `find-up` | 5.0.0 | MIT | dev |
| `flat-cache` | 4.0.1 | MIT | dev |
| `flatted` | 3.3.3 | ISC | dev |
| `fraction.js` | 5.3.4 | MIT | dev |
| `fsevents` | 2.3.3 | MIT | dev |
| `function-bind` | 1.1.2 | MIT | dev |
| `generate-function` | 2.3.1 | MIT | execução |
| `gensync` | 1.0.0-beta.2 | MIT | dev |
| `get-nonce` | 1.0.1 | MIT | execução |
| `get-tsconfig` | 4.14.3 | MIT | dev |
| `glob-parent` | 5.1.2 | ISC | dev |
| `glob-parent` | 5.1.2 | ISC | dev |
| `glob-parent` | 6.0.2 | ISC | dev |
| `globals` | 14.0.0 | MIT | dev |
| `globals` | 16.5.0 | MIT | dev |
| `has-flag` | 4.0.0 | MIT | dev |
| `hasown` | 2.0.2 | MIT | dev |
| `hermes-estree` | 0.25.1 | MIT | dev |
| `hermes-parser` | 0.25.1 | MIT | dev |
| `hono` | 4.13.9 | MIT | execução |
| `iconv-lite` | 0.7.3 | MIT | execução |
| `ignore` | 5.3.2 | MIT | dev |
| `ignore` | 7.0.5 | MIT | dev |
| `import-fresh` | 3.3.1 | MIT | dev |
| `imurmurhash` | 0.1.4 | MIT | dev |
| `input-otp` | 1.4.2 | MIT | execução |
| `internmap` | 2.0.3 | ISC | execução |
| `is-binary-path` | 2.1.0 | MIT | dev |
| `is-core-module` | 2.16.1 | MIT | dev |
| `is-extglob` | 2.1.1 | MIT | dev |
| `is-glob` | 4.0.3 | MIT | dev |
| `is-number` | 7.0.0 | MIT | dev |
| `is-property` | 1.0.2 | MIT | execução |
| `isexe` | 2.0.0 | ISC | dev |
| `jiti` | 1.21.7 | MIT | dev |
| `js-tokens` | 4.0.0 | MIT | execução |
| `js-yaml` | 4.1.1 | MIT | dev |
| `jsesc` | 3.1.0 | MIT | dev |
| `json-buffer` | 3.0.1 | MIT | dev |
| `json-schema` | 0.4.0 | (AFL-2.1 OR BSD-3-Clause) | execução |
| `json-schema-traverse` | 0.4.1 | MIT | dev |
| `json-stable-stringify-without-jsonify` | 1.0.1 | MIT | dev |
| `json5` | 2.2.3 | MIT | dev |
| `keyv` | 4.5.4 | MIT | dev |
| `kimi-plugin-inspect-react` | 1.0.3 | ISC | dev |
| `levn` | 0.4.1 | MIT | dev |
| `lilconfig` | 3.1.3 | MIT | dev |
| `lines-and-columns` | 1.2.4 | MIT | dev |
| `locate-path` | 6.0.0 | MIT | dev |
| `lodash` | 4.17.21 | MIT | execução |
| `lodash.debounce` | 4.0.8 | MIT | dev |
| `lodash.merge` | 4.6.2 | MIT | dev |
| `long` | 5.3.2 | Apache-2.0 | execução |
| `loose-envify` | 1.4.0 | MIT | execução |
| `lru-cache` | 5.1.1 | ISC | dev |
| `lru.min` | 1.1.5 | MIT | execução |
| `lucide-react` | 0.562.0 | ISC | execução |
| `magic-string` | 0.30.21 | MIT | dev |
| `merge2` | 1.4.1 | MIT | dev |
| `micromatch` | 4.0.8 | MIT | dev |
| `minimatch` | 3.1.2 | ISC | dev |
| `minimatch` | 9.0.5 | ISC | dev |
| `minimatch` | 9.0.9 | ISC | dev |
| `ms` | 2.1.3 | MIT | dev |
| `mysql2` | 3.24.4 | MIT | execução |
| `mz` | 2.7.0 | MIT | dev |
| `named-placeholders` | 1.1.6 | MIT | execução |
| `nanoid` | 3.3.11 | MIT | dev |
| `natural-compare` | 1.4.0 | MIT | dev |
| `next-themes` | 0.4.6 | MIT | execução |
| `node-releases` | 2.0.57 | MIT | dev |
| `normalize-path` | 3.0.0 | MIT | dev |
| `object-assign` | 4.1.1 | MIT | execução |
| `object-hash` | 3.0.0 | MIT | dev |
| `obug` | 2.2.1 | MIT | dev |
| `optionator` | 0.9.4 | MIT | dev |
| `p-limit` | 3.1.0 | MIT | dev |
| `p-locate` | 5.0.0 | MIT | dev |
| `parent-module` | 1.0.1 | MIT | dev |
| `path-exists` | 4.0.0 | MIT | dev |
| `path-key` | 3.1.1 | MIT | dev |
| `path-parse` | 1.0.7 | MIT | dev |
| `pathe` | 2.0.3 | MIT | dev |
| `picocolors` | 1.1.1 | ISC | dev |
| `picomatch` | 2.3.1 | MIT | dev |
| `picomatch` | 2.3.1 | MIT | dev |
| `picomatch` | 2.3.1 | MIT | dev |
| `picomatch` | 4.0.3 | MIT | dev |
| `pify` | 2.3.0 | MIT | dev |
| `pirates` | 4.0.7 | MIT | dev |
| `postcss` | 8.5.6 | MIT | dev |
| `postcss-import` | 15.1.0 | MIT | dev |
| `postcss-js` | 4.1.0 | MIT | dev |
| `postcss-load-config` | 6.0.1 | MIT | dev |
| `postcss-nested` | 6.2.0 | MIT | dev |
| `postcss-selector-parser` | 6.1.2 | MIT | dev |
| `postcss-value-parser` | 4.2.0 | MIT | dev |
| `prelude-ls` | 1.2.1 | MIT | dev |
| `prettier` | 3.9.9 | MIT | dev |
| `prop-types` | 15.8.1 | MIT | execução |
| `punycode` | 2.3.1 | MIT | dev |
| `queue-microtask` | 1.2.3 | MIT | dev |
| `react` | 19.2.3 | MIT | execução |
| `react-day-picker` | 9.13.0 | MIT | execução |
| `react-dom` | 19.2.3 | MIT | execução |
| `react-hook-form` | 7.70.0 | MIT | execução |
| `react-is` | 16.13.1 | MIT | execução |
| `react-is` | 18.3.1 | MIT | execução |
| `react-refresh` | 0.18.0 | MIT | dev |
| `react-remove-scroll` | 2.7.2 | MIT | execução |
| `react-remove-scroll-bar` | 2.3.8 | MIT | execução |
| `react-resizable-panels` | 4.2.2 | MIT | execução |
| `react-router` | 7.18.4 | MIT | execução |
| `react-smooth` | 4.0.4 | MIT | execução |
| `react-style-singleton` | 2.2.3 | MIT | execução |
| `react-transition-group` | 4.4.5 | BSD-3-Clause | execução |
| `read-cache` | 1.0.0 | MIT | dev |
| `readdirp` | 3.6.0 | MIT | dev |
| `recharts` | 2.15.4 | MIT | execução |
| `recharts-scale` | 0.4.5 | MIT | execução |
| `regenerate` | 1.4.2 | MIT | dev |
| `regenerate-unicode-properties` | 10.2.2 | MIT | dev |
| `regexpu-core` | 6.4.0 | MIT | dev |
| `regjsgen` | 0.8.0 | MIT | dev |
| `regjsparser` | 0.13.3 | BSD-2-Clause | dev |
| `resolve` | 1.22.11 | MIT | dev |
| `resolve-from` | 4.0.0 | MIT | dev |
| `resolve-pkg-maps` | 1.0.0 | MIT | dev |
| `reusify` | 1.1.0 | MIT | dev |
| `rollup` | 4.55.1 | MIT | dev |
| `run-parallel` | 1.2.0 | MIT | dev |
| `safer-buffer` | 2.1.2 | MIT | execução |
| `scheduler` | 0.27.0 | MIT | execução |
| `semver` | 6.3.1 | ISC | dev |
| `semver` | 7.7.3 | ISC | dev |
| `set-cookie-parser` | 2.7.2 | MIT | execução |
| `shebang-command` | 2.0.0 | MIT | dev |
| `shebang-regex` | 3.0.0 | MIT | dev |
| `siginfo` | 2.0.0 | ISC | dev |
| `sonner` | 2.0.7 | MIT | execução |
| `source-map` | 0.6.1 | BSD-3-Clause | dev |
| `source-map-js` | 1.2.1 | BSD-3-Clause | dev |
| `source-map-support` | 0.5.21 | MIT | dev |
| `sql-escaper` | 1.5.2 | MIT | execução |
| `stackback` | 0.0.2 | MIT | dev |
| `std-env` | 4.2.0 | MIT | dev |
| `strip-json-comments` | 3.1.1 | MIT | dev |
| `sucrase` | 3.35.1 | MIT | dev |
| `superjson` | 2.2.6 | MIT | execução |
| `supports-color` | 7.2.0 | MIT | dev |
| `supports-preserve-symlinks-flag` | 1.0.0 | MIT | dev |
| `tailwind-merge` | 3.4.0 | MIT | execução |
| `tailwindcss` | 3.4.19 | MIT | dev |
| `tailwindcss-animate` | 1.0.7 | MIT | dev |
| `thenify` | 3.3.1 | MIT | dev |
| `thenify-all` | 1.6.0 | MIT | dev |
| `tiny-invariant` | 1.3.3 | MIT | execução |
| `tinybench` | 2.9.0 | MIT | dev |
| `tinyexec` | 1.3.1 | MIT | dev |
| `tinyglobby` | 0.2.15 | MIT | dev |
| `tinyrainbow` | 3.1.1 | MIT | dev |
| `to-regex-range` | 5.0.1 | MIT | dev |
| `ts-api-utils` | 2.4.0 | MIT | dev |
| `ts-interface-checker` | 0.1.13 | Apache-2.0 | dev |
| `tslib` | 2.8.1 | 0BSD | execução |
| `tsx` | 4.23.15 | MIT | dev |
| `tw-animate-css` | 1.4.0 | MIT | dev |
| `type-check` | 0.4.0 | MIT | dev |
| `typescript` | 5.9.3 | Apache-2.0 | execução |
| `typescript-eslint` | 8.52.0 | MIT | dev |
| `undici` | 6.28.1 | MIT | execução |
| `undici-types` | 7.16.0 | MIT | execução |
| `unicode-canonical-property-names-ecmascript` | 2.0.1 | MIT | dev |
| `unicode-match-property-ecmascript` | 2.0.0 | MIT | dev |
| `unicode-match-property-value-ecmascript` | 2.2.1 | MIT | dev |
| `unicode-property-aliases-ecmascript` | 2.2.0 | MIT | dev |
| `update-browserslist-db` | 1.3.3 | MIT | dev |
| `uri-js` | 4.4.1 | BSD-2-Clause | dev |
| `use-callback-ref` | 1.3.3 | MIT | execução |
| `use-sidecar` | 1.1.3 | MIT | execução |
| `use-sync-external-store` | 1.6.0 | MIT | execução |
| `util-deprecate` | 1.0.2 | MIT | dev |
| `vaul` | 1.1.2 | MIT | execução |
| `victory-vendor` | 36.9.2 | MIT AND ISC | execução |
| `vite` | 7.3.0 | MIT | dev |
| `vitest` | 4.1.11 | MIT | dev |
| `which` | 2.0.2 | ISC | dev |
| `why-is-node-running` | 2.3.0 | MIT | dev |
| `word-wrap` | 1.2.5 | MIT | dev |
| `yallist` | 3.1.1 | ISC | dev |
| `yocto-queue` | 0.1.0 | MIT | dev |
| `zod` | 4.3.5 | MIT | execução |
| `zod-validation-error` | 4.0.2 | MIT | dev |
