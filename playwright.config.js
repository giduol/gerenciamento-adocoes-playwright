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

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 30000,
  expect: { timeout: 10000 },

  // Relatório HTML em playwright-report/index.html, com os prints anexados.
  reporter: [['list'], ['html', { open: 'never', title: `Gerenciamento de Adoções - E2E (${ambiente})` }]],

  use: {
    baseURL,
    viewport: { width: 1366, height: 768 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 } },
    },
    // Navegadores instalados de verdade (Google Chrome e Microsoft Edge), não o Chromium do Playwright.
    {
      name: 'chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1366, height: 768 } },
    },
    {
      name: 'edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge', viewport: { width: 1366, height: 768 } },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'], viewport: { width: 1366, height: 768 } },
    },
    // WebKit é o motor do Safari.
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'], viewport: { width: 1366, height: 768 } },
    },
  ],
});
