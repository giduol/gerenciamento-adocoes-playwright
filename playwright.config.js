const { defineConfig, devices } = require('@playwright/test');

// Credenciais locais (USUARIO e SENHA), se o arquivo .env existir.
try {
  process.loadEnvFile();
} catch {
  // Sem .env: os testes que precisam de login são ignorados.
}

// Endereço do front em cada ambiente.
// Escolha com a variável AMBIENTE (o padrão é "prod").
const AMBIENTES = {
  prod: 'https://site--gerencimanto-adocoes-app--cj6ybc4ywxr4.code.run',
  local: 'http://localhost:4200',
};

const ambiente = process.env.AMBIENTE || 'prod';
const baseURL = AMBIENTES[ambiente];

if (!baseURL) {
  throw new Error(
    `Ambiente "${ambiente}" desconhecido. Use um destes: ${Object.keys(AMBIENTES).join(', ')}`,
  );
}

// Sessão do usuário de testes, criada uma vez por execução pelo projeto "setup"
// (tests/auth.setup.js) e reaproveitada por todos os testes.
const { SESSAO } = require('./tests/support/sessao');

// Todos os navegadores começam já logados, com a sessão do setup.
const navegador = (dispositivo, extras = {}) => ({
  dependencies: ['setup'],
  use: { ...devices[dispositivo], viewport: { width: 1366, height: 768 }, storageState: SESSAO, ...extras },
});

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  // Os testes rodam contra produção, numa instância pequena: muitos em paralelo deixam o
  // backend lento para todo mundo. Na CI, o padrão do Playwright (metade dos núcleos) já é baixo.
  workers: process.env.CI ? undefined : 3,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 30000,
  expect: { timeout: 10000 },

  // Local: relatório HTML em playwright-report/index.html, com prints e trace das falhas.
  // CI: só o log. O relatório não é gerado nem publicado, porque traces e contexto de erro
  // registram o que é digitado nos campos, inclusive a senha, e o repositório é público.
  reporter: process.env.CI
    ? [['list'], ['github']]
    : [['list'], ['html', { open: 'never', title: `Gerenciamento de Adoções - E2E (${ambiente})` }]],

  use: {
    baseURL,
    viewport: { width: 1366, height: 768 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },

  projects: [
    { name: 'setup', testMatch: /auth\.setup\.js/ },
    { name: 'chromium', ...navegador('Desktop Chrome') },
    // Navegadores instalados de verdade (Google Chrome e Microsoft Edge), não o Chromium do Playwright.
    { name: 'chrome', ...navegador('Desktop Chrome', { channel: 'chrome' }) },
    { name: 'edge', ...navegador('Desktop Edge', { channel: 'msedge' }) },
    { name: 'firefox', ...navegador('Desktop Firefox') },
    // WebKit é o motor do Safari.
    { name: 'webkit', ...navegador('Desktop Safari') },
  ],
});
