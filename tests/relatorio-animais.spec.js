const { test, expect } = require('@playwright/test');
const { exigirCredenciais, nomeDeTeste, requisicaoApi, evidencia } = require('./support/helpers');

// Resposta da API de animais pedida pela própria tela.
const listagemDeAnimais = (r) => r.request().method() === 'GET' && new URL(r.url()).pathname === '/api/animais';

// Valor (<dd>) de um campo do cartão do animal, pelo rótulo (<dt>).
function campo(cartao, rotulo) {
  return cartao.locator('.record-field').filter({ has: cartao.page().getByText(rotulo, { exact: true }) }).locator('dd');
}

const doisDigitos = (n) => String(n).padStart(2, '0');

// Texto que a tela deve mostrar para um campo de texto da API.
function textoEsperado(valor) {
  return valor ? String(valor) : 'Não informado';
}

// Texto que a tela deve mostrar para uma data da API: "15/04/2023" ou, com hora,
// "18/11/2026, 18:05:39". A API (Java LocalDate/LocalDateTime) devolve as datas como
// lista de números, [2023, 4, 15] ou [2026, 11, 18, 18, 5, 39, 29412000], ou como texto
// "2023-04-15" / "2026-11-18T18:05:39.029".
function dataEsperada(valor) {
  if (valor === null || valor === undefined || valor === '') return 'Não informado';

  let partes;
  if (Array.isArray(valor)) {
    partes = valor;
  } else {
    const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?)?$/.exec(String(valor));
    if (!m) throw new Error(`Formato de data da API não previsto pelo teste: ${JSON.stringify(valor)}`);
    partes = m.slice(1).filter((p) => p !== undefined).map(Number);
  }

  const [ano, mes, dia, hora, minuto, segundo = 0] = partes;
  const data = `${doisDigitos(dia)}/${doisDigitos(mes)}/${ano}`;
  if (partes.length === 3) return data;
  if (partes.length >= 5) return `${data}, ${doisDigitos(hora)}:${doisDigitos(minuto)}:${doisDigitos(segundo)}`;
  throw new Error(`Formato de data da API não previsto pelo teste: ${JSON.stringify(valor)}`);
}

// Confere todos os campos de um cartão com os dados do animal vindos da API.
async function conferirCartao(cartao, animal) {
  await expect(cartao.getByRole('heading', { level: 2 })).toHaveText(animal.name);
  await expect(campo(cartao, 'Espécie')).toHaveText(textoEsperado(animal.species));
  await expect(campo(cartao, 'Data de nascimento')).toHaveText(dataEsperada(animal.birthDate));
  await expect(campo(cartao, 'Raça')).toHaveText(textoEsperado(animal.breed));
  await expect(campo(cartao, 'Características especiais')).toHaveText(textoEsperado(animal.specialCharacteristics));
  await expect(campo(cartao, 'Doenças conhecidas')).toHaveText(textoEsperado(animal.knownDiseases));
  await expect(campo(cartao, 'Data de cadastro')).toHaveText(dataEsperada(animal.registrationDate));
}

function cartaoDoAnimal(page, nome) {
  return page.getByRole('article').filter({ has: page.getByRole('heading', { level: 2, name: nome, exact: true }) });
}

test.describe('Relatório de animais', () => {
  // Precisa de login, que não funciona no WebKit em *.code.run (veja o README).
  test.skip(({ browserName }) => browserName === 'webkit', 'Login não funciona no WebKit em *.code.run');

  // Ids dos animais criados no teste, apagados no final para não deixar lixo no banco.
  let criados = [];

  test.beforeEach(() => {
    exigirCredenciais();
    criados = [];
  });

  test.afterEach(async ({ page }) => {
    for (const id of criados) {
      const resposta = await requisicaoApi(page, 'DELETE', `/api/animais/${id}`);
      expect(resposta.ok(), `Apagar o animal ${id} criado pelo teste (HTTP ${resposta.status()})`).toBeTruthy();
    }
  });

  test('mostra todos os animais com os mesmos dados da API', async ({ page }) => {
    const [resposta] = await Promise.all([page.waitForResponse(listagemDeAnimais), page.goto('/relatorio-animais')]);
    const animais = await resposta.json();

    await expect(page.getByRole('heading', { level: 1, name: 'Relatório de animais' })).toBeVisible();

    // Compara com o que a própria tela recebeu, porque outros testes podem cadastrar e apagar
    // animais ao mesmo tempo.
    if (animais.length === 0) {
      await expect(page.getByText('Nenhum animal foi encontrado.')).toBeVisible();
    } else {
      await expect(page.getByRole('region', { name: 'Animais cadastrados' }).getByRole('article')).toHaveCount(animais.length);
      for (const animal of animais) {
        const cartao = page.getByRole('article').filter({ has: page.getByText(`ANIMAL ${animal.id}`, { exact: true }) });
        await test.step(`ANIMAL ${animal.id}: ${animal.name}`, () => conferirCartao(cartao, animal));
      }
    }
    await evidencia(page, 'relatório de animais');
  });

  test('mostra os dados do animal, com "Não informado" nos campos vazios', async ({ page }) => {
    const animal = {
      name: nomeDeTeste('Tobias'),
      species: 'Gato',
      birthDate: '2021-12-03',
      breed: 'Siamês',
      specialCharacteristics: '',
      knownDiseases: '',
    };
    const criacao = await requisicaoApi(page, 'POST', '/api/animais', animal);
    expect(criacao.status(), 'Cadastrar o animal pela API').toBe(201);
    const { id } = await criacao.json();
    criados.push(id);

    const [resposta] = await Promise.all([page.waitForResponse(listagemDeAnimais), page.goto('/relatorio-animais')]);
    const daApi = (await resposta.json()).find((a) => a.id === id);
    expect(daApi, `A API deve listar o animal ${id}`).toBeTruthy();

    const cartao = cartaoDoAnimal(page, animal.name);
    await expect(cartao).toBeVisible();
    await expect(cartao).toContainText(`ANIMAL ${id}`);

    // Valores fixos: o que foi cadastrado, com "Não informado" nos campos vazios.
    await expect(campo(cartao, 'Espécie')).toHaveText('Gato');
    await expect(campo(cartao, 'Data de nascimento')).toHaveText('03/12/2021');
    await expect(campo(cartao, 'Raça')).toHaveText('Siamês');
    await expect(campo(cartao, 'Características especiais')).toHaveText('Não informado');
    await expect(campo(cartao, 'Doenças conhecidas')).toHaveText('Não informado');
    // A data de cadastro é gerada pelo backend: confere com a que a API devolveu.
    await expect(campo(cartao, 'Data de cadastro')).toHaveText(dataEsperada(daApi.registrationDate));

    await cartao.scrollIntoViewIfNeeded();
    await evidencia(page, 'dados do animal');
  });

  test('mostra "Carregando" enquanto a API não responde', async ({ page }) => {
    let liberar;
    const respostaLiberada = new Promise((resolve) => (liberar = resolve));
    await page.route('**/api/animais', async (route) => {
      await respostaLiberada;
      await route.fulfill({ json: [] });
    });

    await page.goto('/relatorio-animais');
    await expect(page.getByRole('status')).toHaveText('Carregando animais...');

    liberar();
    await expect(page.getByRole('status')).toBeHidden();
    await expect(page.getByText('Nenhum animal foi encontrado.')).toBeVisible();
  });

  test('mostra mensagem quando não há animais', async ({ page }) => {
    await page.route('**/api/animais', (route) => route.fulfill({ json: [] }));

    await page.goto('/relatorio-animais');

    await expect(page.getByText('Nenhum animal foi encontrado.')).toBeVisible();
    await expect(page.getByRole('article')).toHaveCount(0);
  });

  test('mostra erro quando a API falha', async ({ page }) => {
    await page.route('**/api/animais', (route) => route.fulfill({ status: 500, json: { error: 'Erro simulado' } }));

    await page.goto('/relatorio-animais');

    await expect(page.getByRole('alert')).toHaveText(
      'Não foi possível carregar o relatório. Confira o backend e tente novamente.',
    );
    await expect(page.getByRole('article')).toHaveCount(0);
    await evidencia(page, 'erro no relatório');
  });

  test('volta para o início', async ({ page }) => {
    await page.goto('/relatorio-animais');
    await page.getByRole('link', { name: 'Voltar ao início' }).click();

    await expect(page).toHaveURL((url) => url.pathname === '/');
  });
});
