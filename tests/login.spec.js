const { test, expect } = require('@playwright/test');
const { exigirCredenciais, credenciais, login, preencherLogin, evidencia } = require('./support/helpers');

test.describe('Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('exibe a tela de login', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'Entrar' })).toBeVisible();
    await expect(page.locator('#username')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeEnabled();
    await evidencia(page, 'tela de login');
  });

  test('exige usuário e senha', async ({ page }) => {
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page.getByText('Informe seu usuário.')).toBeVisible();
    await expect(page.getByText('Informe sua senha.')).toBeVisible();
  });

  test('mostra erro com usuário ou senha inválidos', async ({ page }) => {
    await preencherLogin(page, 'usuario-inexistente-playwright', 'senha-errada');

    await expect(page.getByRole('alert')).toHaveText('Usuário ou senha inválidos.');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('entra no sistema com credenciais válidas', async ({ page }) => {
    exigirCredenciais();
    const { usuario, senha } = credenciais();

    await preencherLogin(page, usuario, senha);
    await expect(page).toHaveURL((url) => url.pathname === '/');
    await evidencia(page, 'entrou no sistema');
  });
});

test.describe('Rotas protegidas', () => {
  test('redireciona para o login quando não há sessão', async ({ page }) => {
    await page.goto('/relatorio-adocoes');

    await expect(page).toHaveURL((url) => url.pathname === '/login');
    await expect(page).toHaveURL(/returnUrl=%2Frelatorio-adocoes/);
  });

  test('acessa a página depois do login', async ({ page }) => {
    exigirCredenciais();

    await login(page);
    await page.goto('/relatorio-adocoes');
    await expect(page).toHaveURL((url) => url.pathname === '/relatorio-adocoes');
    await evidencia(page, 'relatório de adoções');
  });
});
