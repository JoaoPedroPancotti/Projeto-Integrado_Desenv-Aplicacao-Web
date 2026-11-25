// backend/src/utils/asyncHandler.js
// O Express 4 não captura erros de funções async: este wrapper repassa a rejeição
// para o middleware de erros (middlewares/erros.js).
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
