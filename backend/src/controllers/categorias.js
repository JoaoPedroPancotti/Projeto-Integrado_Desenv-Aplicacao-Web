// backend/src/controllers/categorias.js
const categorias = require('../repositories/categorias');

async function listar(req, res) {
  return res.json(await categorias.listar());
}

async function criar(req, res) {
  const { nome, descricao } = req.body;
  if (!nome?.trim()) return res.status(400).json({ erro: 'Informe o nome da categoria.' });
  const id = await categorias.criar({ nome: nome.trim(), descricao: descricao || null });
  return res.status(201).json({ id, mensagem: 'Categoria criada.' });
}

async function atualizar(req, res) {
  const { nome, descricao } = req.body;
  if (!nome?.trim()) return res.status(400).json({ erro: 'Informe o nome da categoria.' });
  await categorias.atualizar(req.params.id, { nome: nome.trim(), descricao: descricao || null });
  return res.json({ mensagem: 'Categoria atualizada.' });
}

async function excluir(req, res) {
  await categorias.excluir(req.params.id);
  return res.json({ mensagem: 'Categoria excluída. Os produtos dela ficaram sem categoria.' });
}

module.exports = { listar, criar, atualizar, excluir };
