// backend/src/controllers/catalogo.js
// Catálogo público do site (/api/produtos): só produtos ativos e só os campos públicos.
const produtos = require('../repositories/produtos');

async function listar(req, res) {
  return res.json(await produtos.listarPublicos());
}

async function detalhar(req, res) {
  const produto = await produtos.buscarPublico(req.params.id);
  if (!produto) return res.status(404).json({ erro: 'Produto não encontrado.' });
  return res.json(produto);
}

// ------------------------------------------------------------------
// LEGADO: escrita simplificada da primeira versão da API (exige login).
// O painel usa /api/admin/produtos (controllers/produtos.js); estas rotas
// não são chamadas pelo frontend e ficam só por compatibilidade.
// ------------------------------------------------------------------

async function criarLegado(req, res) {
  const id = await produtos.criarSimples(req.body);
  return res.status(201).json({ id, mensagem: 'Produto criado com sucesso!' });
}

async function atualizarLegado(req, res) {
  const alterados = await produtos.atualizarSimples(req.params.id, req.body);
  if (!alterados) return res.status(404).json({ erro: 'Produto não encontrado.' });
  return res.json({ mensagem: 'Produto atualizado com sucesso!' });
}

async function excluirLegado(req, res) {
  const apagados = await produtos.excluir(req.params.id);
  if (!apagados) return res.status(404).json({ erro: 'Produto não encontrado.' });
  return res.json({ mensagem: 'Produto excluído com sucesso!' });
}

module.exports = { listar, detalhar, criarLegado, atualizarLegado, excluirLegado };
