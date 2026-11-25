const { test: setup } = require('@playwright/test');
const { credenciais, login } = require('./support/helpers');
const { SESSAO } = require('./support/sessao');

// Faz login uma única vez e salva a sessão em SESSAO, para os testes começarem já logados.
// Antes, cada teste fazia o próprio login; com muitos em paralelo, o backend (BCrypt numa
// instância pequena) passava dos 10 s para responder e os testes falhavam por tempo.
setup('login do usuário de testes', async ({ request }) => {
  const { usuario, senha } = credenciais();
  if (usuario && senha) {
    await login(request);
  }
  // Sem credenciais, salva uma sessão vazia: os testes que precisam de login são ignorados.
  await request.storageState({ path: SESSAO });
});
