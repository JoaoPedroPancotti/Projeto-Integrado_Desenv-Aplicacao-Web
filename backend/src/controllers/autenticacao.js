// backend/src/controllers/autenticacao.js
// Login do painel, dados do usuário logado e troca da própria senha.
const administradores = require('../repositories/administradores');
const { gerarToken } = require('../services/token');
const { SENHA_MINIMA, gerarHashSenha, conferirSenha, senhaCurta } = require('../services/senha');

async function login(req, res) {
  const { email, senha } = req.body;
  const admin = await administradores.buscarAtivoPorEmail((email || '').trim().toLowerCase());
  if (!admin || !(await conferirSenha(senha, admin.senha_hash))) {
    return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
  }
  await administradores.registrarAcesso(admin.id);
  return res.json({ token: gerarToken(admin), admin: { id: admin.id, nome: admin.nome, email: admin.email } });
}

function perfil(req, res) {
  return res.json(req.admin);
}

async function alterarMinhaSenha(req, res) {
  const { senha_atual, nova_senha } = req.body;
  const hashAtual = await administradores.buscarHashSenha(req.admin.id);
  if (!hashAtual || !(await conferirSenha(senha_atual, hashAtual))) {
    return res.status(400).json({ erro: 'A senha atual está incorreta.' });
  }
  if (senhaCurta(nova_senha)) {
    return res.status(400).json({ erro: `A nova senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.` });
  }
  await administradores.atualizarSenha(req.admin.id, await gerarHashSenha(nova_senha));
  return res.json({ mensagem: 'Senha alterada.' });
}

module.exports = { login, perfil, alterarMinhaSenha };
