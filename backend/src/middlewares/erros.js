// backend/src/middlewares/erros.js
// Últimos middlewares da aplicação: rota inexistente e tratamento central de erros.
// Toda resposta de erro da API segue o formato { erro: 'mensagem' }.
const AppError = require('../utils/AppError');
const { ERRO_DUPLICADO } = require('../constants/postgres');

const EM_PRODUCAO = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
const MENSAGEM_ERRO_INTERNO = 'Erro interno no servidor. Tente novamente em instantes.';

// Valor único repetido -> mensagem amigável, conforme o índice/constraint violado (a ordem importa)
const MENSAGENS_DUPLICADO = [
  [/codigo_barras/, 'Já existe um produto com este código de barras.'],
  [/codigo/, 'Já existe um produto com este código.'],
  [/email/, 'Já existe um usuário com este e-mail.'],
];

function rotaNaoEncontrada(req, res) {
  res.status(404).json({ erro: 'Rota não encontrada.' });
}

// eslint-disable-next-line no-unused-vars -- o Express reconhece o tratador de erros pelos 4 parâmetros
function tratarErros(erro, req, res, next) {
  if (erro instanceof AppError) {
    return res.status(erro.status).json({ erro: erro.message });
  }
  if (erro.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON inválido no corpo da requisição.' });
  }
  if (erro.code === ERRO_DUPLICADO) {
    const conhecida = MENSAGENS_DUPLICADO.find(([padrao]) => padrao.test(erro.constraint || ''));
    if (conhecida) return res.status(409).json({ erro: conhecida[1] });
  }
  // Erro inesperado: o detalhe (SQL, tabelas, stack) fica só no log do servidor.
  // Em produção o cliente recebe uma mensagem genérica, para não expor a estrutura do banco.
  console.error(`[${req.method} ${req.originalUrl}]`, erro);
  return res.status(500).json({ erro: EM_PRODUCAO ? MENSAGEM_ERRO_INTERNO : erro.message || MENSAGEM_ERRO_INTERNO });
}

module.exports = { rotaNaoEncontrada, tratarErros };
