// backend/src/controllers/usuarios.js
// Usuários (administradores) do painel. E-mail repetido vira 409 no middlewares/erros.js.
const administradores = require('../repositories/administradores');
const { SENHA_MINIMA, gerarHashSenha, senhaCurta } = require('../services/senha');

const ERRO_SENHA_CURTA = `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`;

async function listar(req, res) {
  return res.json(await administradores.listar());
}

async function criar(req, res) {
  const { nome, email, senha } = req.body;
  if (!nome?.trim() || !email?.trim()) return res.status(400).json({ erro: 'Informe nome e e-mail.' });
  if (senhaCurta(senha)) return res.status(400).json({ erro: ERRO_SENHA_CURTA });
  const id = await administradores.criar({
    nome: nome.trim(),
    email: email.trim().toLowerCase(),
    senhaHash: await gerarHashSenha(senha),
  });
  return res.status(201).json({ id, mensagem: 'Usuário criado.' });
}

async function atualizar(req, res) {
  const { nome, email, senha, ativo } = req.body;
  const id = Number(req.params.id);
  if (!nome?.trim() || !email?.trim()) return res.status(400).json({ erro: 'Informe nome e e-mail.' });
  if (id === req.admin.id && ativo === false) return res.status(400).json({ erro: 'Você não pode desativar o próprio acesso.' });
  if (senha && senhaCurta(senha)) return res.status(400).json({ erro: ERRO_SENHA_CURTA });
  await administradores.atualizar(id, { nome: nome.trim(), email: email.trim().toLowerCase(), ativo: ativo !== false });
  if (senha) await administradores.atualizarSenha(id, await gerarHashSenha(senha));
  return res.json({ mensagem: 'Usuário atualizado.' });
}

async function excluir(req, res) {
  if (Number(req.params.id) === req.admin.id) return res.status(400).json({ erro: 'Você não pode excluir o próprio acesso.' });
  await administradores.excluir(req.params.id);
  return res.json({ mensagem: 'Usuário excluído.' });
}

module.exports = { listar, criar, atualizar, excluir };
