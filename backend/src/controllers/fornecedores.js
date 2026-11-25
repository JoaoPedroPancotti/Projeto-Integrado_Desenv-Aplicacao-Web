// backend/src/controllers/fornecedores.js
const fornecedores = require('../repositories/fornecedores');
const produtos = require('../repositories/produtos');
const { dadosFornecedor } = require('../validators/fornecedor');

async function listar(req, res) {
  return res.json(await fornecedores.listar());
}

async function detalhar(req, res) {
  const fornecedor = await fornecedores.buscar(req.params.id);
  if (!fornecedor) return res.status(404).json({ erro: 'Fornecedor não encontrado.' });
  const produtosDoFornecedor = await produtos.listarPorFornecedor(req.params.id);
  const compras = await fornecedores.listarCompras(req.params.id);
  return res.json({ ...fornecedor, produtos: produtosDoFornecedor, compras });
}

async function criar(req, res) {
  if (!req.body.nome?.trim()) return res.status(400).json({ erro: 'Informe o nome do fornecedor.' });
  const id = await fornecedores.criar(dadosFornecedor(req.body));
  return res.status(201).json({ id, mensagem: 'Fornecedor cadastrado.' });
}

async function atualizar(req, res) {
  if (!req.body.nome?.trim()) return res.status(400).json({ erro: 'Informe o nome do fornecedor.' });
  const alterados = await fornecedores.atualizar(req.params.id, dadosFornecedor(req.body));
  if (!alterados) return res.status(404).json({ erro: 'Fornecedor não encontrado.' });
  return res.json({ mensagem: 'Fornecedor atualizado.' });
}

async function excluir(req, res) {
  await fornecedores.excluir(req.params.id);
  return res.json({ mensagem: 'Fornecedor excluído. Os produtos e o histórico de compras foram mantidos.' });
}

module.exports = { listar, detalhar, criar, atualizar, excluir };
