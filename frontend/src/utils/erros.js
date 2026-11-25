// frontend/src/utils/erros.js

// Erros 4xx trazem mensagens de validação escritas para o usuário ({ erro });
// em falhas do servidor (5xx) ou de rede, usa o texto padrão da tela.
export function mensagemErro(erro, padrao) {
  const status = erro.response?.status;
  if (status >= 400 && status < 500) return erro.response.data?.erro || padrao;
  return padrao;
}
