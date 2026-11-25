# gerenciamento-adocoes-playwright

Testes end-to-end do [Gerenciamento de Adoções](https://github.com/giduol/gerenciamento-adocoes-app) com Playwright.

## Instalação

```bash
npm install
npx playwright install chromium
```

## Credenciais

Os testes que precisam de login leem o usuário e a senha de `.env`, que não vai para o Git:

```bash
cp .env.example .env
```

Sem esse arquivo, os testes que precisam de login são ignorados. Também dá para passar as variáveis `USUARIO` e `SENHA` direto no ambiente (útil em CI).

## Execução

| Comando | O que faz |
|---|---|
| `npm test` | Roda todos os testes no terminal, contra **produção** (`https://site--gerencimanto-adocoes-app--cj6ybc4ywxr4.code.run`) |
| `npm run test:local` | Roda todos os testes no terminal, contra o front **local** (`http://localhost:4200`) |
| `npm run test:ui` | Abre a interface do Playwright contra produção |
| `npm run test:ui:local` | Abre a interface do Playwright contra o front local |
| `npm run report` | Abre o relatório da última execução |

Para rodar contra o front local, suba o front antes com `npm start` no projeto `gerenciamento-adocoes-app`.

Os ambientes ficam em `playwright.config.js` (constante `AMBIENTES`), escolhidos pela variável `AMBIENTE`.

Cada teste roda em três navegadores: `chromium` (o do Playwright), `chrome` (Google Chrome) e `edge` (Microsoft Edge). Chrome e Edge precisam estar instalados na máquina. Para rodar em um só, use `--project`, por exemplo `npm test -- --project=edge`.

## GitHub Actions

O workflow `.github/workflows/playwright.yml` roda os testes contra produção a cada push e pull request na `main`. Também dá para rodar manualmente na aba **Actions** (botão **Run workflow**).

As credenciais vêm dos secrets `USUARIO` e `SENHA` do repositório (Settings → Secrets and variables → Actions). Para atualizá-los a partir do `.env`: `gh secret set -f .env`.

O relatório de cada execução fica disponível para download na página da execução, em **Artifacts**.

## Relatório

Toda execução gera `playwright-report/index.html`, com o resultado de cada teste. O título mostra o ambiente.

- **Falhas**: o Playwright anexa o print da tela e o trace (passo a passo navegável, com rede e console) ao teste que falhou.
- **Evidências**: as telas importantes são registradas com `evidencia(page, 'nome')`, que anexa o print da página inteira e a URL acessada.

O relatório é refeito a cada execução e não vai para o Git. Abra com `npm run report`, porque o trace não funciona abrindo o `index.html` direto do disco.

## Estrutura

```
tests/
  login.spec.js     testes (*.spec.js)
  support/
    helpers.js      login(), preencherLogin(), exigirCredenciais() e evidencia()
playwright.config.js
```

`login(page)` faz o login pela API (CSRF e depois login), e os cookies ficam no navegador do teste. Use-o em testes que não são da tela de login, para não repetir o formulário em todos.
