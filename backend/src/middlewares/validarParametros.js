// backend/src/middlewares/validarParametros.js
// Garante que :id e :itemId das rotas são inteiros positivos antes de chegar ao controller.
// Uso: router.param('id', validarIdDaRota);
const AppError = require('../utils/AppError');
const { idValido } = require('../validators/consulta');

function validarIdDaRota(req, res, next, valor) {
  if (!idValido(valor)) return next(new AppError('Identificador inválido.', 400));
  return next();
}

module.exports = { validarIdDaRota };
