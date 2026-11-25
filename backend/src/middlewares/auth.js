// backend/src/middlewares/auth.js
// Protege as rotas do painel: exige "Authorization: Bearer <token>" e preenche req.admin.
const { verificarToken } = require('../services/token');

function exigirLogin(req, res, next) {
  const [tipo, token] = (req.headers.authorization || '').split(' ');
  if (tipo !== 'Bearer' || !token) {
    return res.status(401).json({ erro: 'Faça login para continuar.' });
  }
  try {
    req.admin = verificarToken(token);
    return next();
  } catch {
    return res.status(401).json({ erro: 'Sessão expirada. Entre novamente.' });
  }
}

module.exports = { exigirLogin };
