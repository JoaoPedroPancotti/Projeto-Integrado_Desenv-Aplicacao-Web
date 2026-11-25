// backend/src/utils/AppError.js
// Erro esperado (validação, não encontrado, conflito). O middleware de erros
// responde com o status e a mensagem dele, sem registrar no log.
class AppError extends Error {
  constructor(mensagem, status = 400) {
    super(mensagem);
    this.name = 'AppError';
    this.status = status;
  }
}

module.exports = AppError;
