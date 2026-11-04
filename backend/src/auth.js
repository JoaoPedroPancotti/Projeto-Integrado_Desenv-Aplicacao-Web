// backend/src/auth.js
// Login do painel: gera e confere o token (JWT) enviado no cabeçalho Authorization.
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const SEGREDO = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
if (!process.env.JWT_SECRET) {
  console.warn('⚠️  JWT_SECRET não definido no .env: os logins do painel caem a cada reinício do servidor.');
}

function gerarToken(admin) {
  return jwt.sign({ id: admin.id, nome: admin.nome, email: admin.email }, SEGREDO, { expiresIn: '12h' });
}

function exigirLogin(req, res, next) {
  const [tipo, token] = (req.headers.authorization || '').split(' ');
  if (tipo !== 'Bearer' || !token) {
    return res.status(401).json({ erro: 'Faça login para continuar.' });
  }
  try {
    req.admin = jwt.verify(token, SEGREDO);
    return next();
  } catch {
    return res.status(401).json({ erro: 'Sessão expirada. Entre novamente.' });
  }
}

module.exports = { gerarToken, exigirLogin };
