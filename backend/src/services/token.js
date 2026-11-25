// backend/src/services/token.js
// Token (JWT) do login do painel, enviado no cabeçalho Authorization.
require('../config/env');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const SEGREDO = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
if (!process.env.JWT_SECRET) {
  console.warn('JWT_SECRET não definido no .env: os logins do painel caem a cada reinício do servidor.');
}

const VALIDADE = '12h';

function gerarToken(admin) {
  return jwt.sign({ id: admin.id, nome: admin.nome, email: admin.email }, SEGREDO, { expiresIn: VALIDADE });
}

// Devolve os dados do administrador ou lança erro se o token for inválido/expirado
function verificarToken(token) {
  return jwt.verify(token, SEGREDO);
}

module.exports = { gerarToken, verificarToken };
