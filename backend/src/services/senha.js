// backend/src/services/senha.js
// Hash e conferência das senhas do painel (bcrypt).
const bcrypt = require('bcryptjs');

const SENHA_MINIMA = 6;
const CUSTO_BCRYPT = 10;

const gerarHashSenha = senha => bcrypt.hash(senha, CUSTO_BCRYPT);
const conferirSenha = (senha, hash) => bcrypt.compare(senha || '', hash);
const senhaCurta = senha => !senha || senha.length < SENHA_MINIMA;

module.exports = { SENHA_MINIMA, gerarHashSenha, conferirSenha, senhaCurta };
