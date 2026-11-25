const { test } = require('@playwright/test');

// Lê o usuário e a senha do .env (ou das variáveis de ambiente USUARIO e SENHA).
function credenciais() {
  return { usuario: process.env.USUARIO, senha: process.env.SENHA };
}

// Tempo de espera pela resposta do login. O backend confere a senha com BCrypt numa instância
// pequena: um login leva de 1,5 a 3 s sozinho, e passa de 10 s com vários ao mesmo tempo.
const TEMPO_LOGIN = 30000;

// Ignora o teste quando as credenciais não estão configuradas.
function exigirCredenciais() {
  const { usuario, senha } = credenciais();
  test.skip(!usuario || !senha, 'Sem credenciais no .env: teste ignorado');
}

// Falha conhecida: o domínio code.run da Northflank está na Public Suffix List (*.code.run),
// e o WebKit (motor do Safari) não guarda cookies nesse tipo de domínio. Sem o cookie de CSRF,
// o login é recusado (HTTP 403). Marca o teste como falha esperada no WebKit; quando o app
// passar a usar um domínio próprio, o Playwright avisa que o teste voltou a passar, e esta
// marcação pode ser removida.
// Com { excetoNoWindows: true }, não marca no Windows: lá o WebKit aceita o cookie quando o
// login é feito pela API (login()), só recusa no formulário da tela.
function falhaEsperadaNoWebKit({ excetoNoWindows = false } = {}) {
  test.fail(
    test.info().project.name === 'webkit' && !(excetoNoWindows && process.platform === 'win32'),
    'WebKit não guarda cookies em *.code.run (Public Suffix List): login recusado com 403',
  );
}

// Chama a API com os cookies do navegador do teste, como o front faz:
// pega o token CSRF e o envia no header. Ex.: requisicaoApi(page, 'DELETE', '/api/animais/1').
// Aceita uma página (usa os cookies dela) ou um APIRequestContext (fixture "request").
async function requisicaoApi(alvo, metodo, caminho, dados) {
  const api = alvo.request ?? alvo;
  const csrf = await (await api.get('/api/auth/csrf')).json();
  return api.fetch(caminho, {
    method: metodo,
    headers: { [csrf.headerName]: csrf.token },
    data: dados,
  });
}

// Faz login pela API (mais rápido que pela tela). Os cookies ficam no navegador do teste.
// Os testes já começam logados (veja tests/auth.setup.js); use só onde o teste começa sem sessão.
async function login(alvo) {
  const { usuario, senha } = credenciais();
  if (!usuario || !senha) {
    throw new Error('Credenciais não configuradas. Crie o arquivo .env (veja .env.example).');
  }

  const resposta = await requisicaoApi(alvo, 'POST', '/api/auth/login', { username: usuario, password: senha });
  if (!resposta.ok()) {
    throw new Error(`Login pela API falhou: HTTP ${resposta.status()}`);
  }
}

// Nome único para registros criados pelos testes, fácil de achar no banco: "[E2E] Lua 1764078000000-123".
function nomeDeTeste(nome) {
  return `[E2E] ${nome} ${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

// Preenche e envia o formulário da tela de login.
async function preencherLogin(page, usuario, senha) {
  if (usuario) await page.locator('#username').fill(usuario);
  if (senha) await page.locator('#password').fill(senha);
  await page.getByRole('button', { name: 'Entrar' }).click();
}

// Anexa ao relatório um print da página inteira e a URL acessada, como evidência.
async function evidencia(page, nome = 'evidência') {
  await test.info().attach(`${nome} - URL`, { body: page.url(), contentType: 'text/plain' });
  await test.info().attach(nome, {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
}

module.exports = {
  TEMPO_LOGIN,
  credenciais,
  exigirCredenciais,
  falhaEsperadaNoWebKit,
  requisicaoApi,
  login,
  nomeDeTeste,
  preencherLogin,
  evidencia,
};
