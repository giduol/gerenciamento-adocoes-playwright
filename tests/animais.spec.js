const { test, expect } = require('@playwright/test');
const { exigirCredenciais, nomeDeTeste, requisicaoApi, evidencia } = require('./support/helpers');

test.describe('Cadastro de animais', () => {
  // Todos os testes daqui precisam de login, e o login não funciona no WebKit
  // enquanto o app estiver em *.code.run (veja "Falha conhecida no WebKit" no README).
  // O aviso de quando isso for corrigido fica a cargo dos testes de login.
  test.skip(({ browserName }) => browserName === 'webkit', 'Login não funciona no WebKit em *.code.run');

  // Ids dos animais criados no teste, apagados no final para não deixar lixo no banco.
  let criados = [];

  test.beforeEach(async ({ page }) => {
    exigirCredenciais();
    criados = [];
    await page.goto('/cadastro-animais');
  });

  test.afterEach(async ({ page }) => {
    for (const id of criados) {
      const resposta = await requisicaoApi(page, 'DELETE', `/api/animais/${id}`);
      expect(resposta.ok(), `Apagar o animal ${id} criado pelo teste (HTTP ${resposta.status()})`).toBeTruthy();
    }
  });

  test('exibe o formulário de cadastro', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'Cadastro de animal' })).toBeVisible();
    await expect(page.getByLabel('Nome:')).toBeVisible();
    await expect(page.getByLabel('Espécie:')).toBeVisible();
    await expect(page.getByLabel('Data de nascimento:')).toBeVisible();
    await expect(page.getByLabel('Raça:')).toBeVisible();
    await expect(page.getByLabel('Características especiais:')).toBeVisible();
    await expect(page.getByLabel('Doenças conhecidas:')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Salvar animal' })).toBeEnabled();
    await evidencia(page, 'cadastro de animal');
  });

  test('exige nome, espécie e data de nascimento', async ({ page }) => {
    let enviou = false;
    page.on('request', (r) => {
      if (r.method() === 'POST' && r.url().endsWith('/api/animais')) enviou = true;
    });

    await page.getByRole('button', { name: 'Salvar animal' }).click();

    await expect(page.getByText('Informe o nome do animal.')).toBeVisible();
    await expect(page.getByText('Informe a espécie.')).toBeVisible();
    await expect(page.getByText('Informe a data de nascimento.')).toBeVisible();
    expect(enviou, 'Não deve enviar o formulário incompleto').toBe(false);
  });

  test('limpa o formulário', async ({ page }) => {
    await page.getByLabel('Nome:').fill('Lua');
    await page.getByLabel('Espécie:').fill('Cachorro');
    await page.getByRole('button', { name: 'Limpar' }).click();

    await expect(page.getByLabel('Nome:')).toHaveValue('');
    await expect(page.getByLabel('Espécie:')).toHaveValue('');
  });

  test('cadastra um animal e mostra no relatório', async ({ page }) => {
    const animal = {
      nome: nomeDeTeste('Lua'),
      especie: 'Cachorro',
      nascimento: '2023-04-15',
      nascimentoNoRelatorio: '15/04/2023',
      raca: 'Sem raça definida',
      caracteristicas: 'Dócil, se dá bem com crianças',
      doencas: 'Nenhuma',
    };

    await page.getByLabel('Nome:').fill(animal.nome);
    await page.getByLabel('Espécie:').fill(animal.especie);
    await page.getByLabel('Data de nascimento:').fill(animal.nascimento);
    await page.getByLabel('Raça:').fill(animal.raca);
    await page.getByLabel('Características especiais:').fill(animal.caracteristicas);
    await page.getByLabel('Doenças conhecidas:').fill(animal.doencas);

    const [resposta] = await Promise.all([
      page.waitForResponse((r) => r.request().method() === 'POST' && r.url().endsWith('/api/animais')),
      page.getByRole('button', { name: 'Salvar animal' }).click(),
    ]);
    expect(resposta.status()).toBe(201);
    const { id } = await resposta.json();
    criados.push(id);

    await expect(page.getByRole('status')).toHaveText('Animal cadastrado com sucesso.');
    await expect(page.getByLabel('Nome:')).toHaveValue('');
    await evidencia(page, 'animal cadastrado');

    await page.goto('/relatorio-animais');
    const cartao = page
      .getByRole('article')
      .filter({ has: page.getByRole('heading', { level: 2, name: animal.nome, exact: true }) });

    await expect(cartao).toBeVisible();
    await expect(cartao).toContainText(`ANIMAL ${id}`);
    await expect(cartao).toContainText(animal.especie);
    await expect(cartao).toContainText(animal.nascimentoNoRelatorio);
    await expect(cartao).toContainText(animal.raca);
    await expect(cartao).toContainText(animal.caracteristicas);
    await expect(cartao).toContainText(animal.doencas);
    await cartao.scrollIntoViewIfNeeded();
    await evidencia(page, 'animal no relatório');
  });
});
