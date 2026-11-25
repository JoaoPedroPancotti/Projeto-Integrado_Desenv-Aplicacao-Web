// backend/src/controllers/clientes.js
const clientes = require('../repositories/clientes');
const pedidos = require('../repositories/pedidos');
const { comTotal } = require('../database/queries/orcamentos');
const { padraoBusca } = require('../validators/consulta');

async function listar(req, res) {
  return res.json(await clientes.listar(padraoBusca(req.query.busca) ?? '%'));
}

async function detalhar(req, res) {
  const cliente = await clientes.buscar(req.params.id);
  if (!cliente) return res.status(404).json({ erro: 'Cliente não encontrado.' });
  const pedidosDoCliente = await pedidos.listarPorCliente(req.params.id);
  return res.json({ ...cliente, pedidos: pedidosDoCliente.map(comTotal) });
}

async function atualizar(req, res) {
  const { nome, email, telefone } = req.body;
  if (!nome?.trim() || !telefone?.trim()) return res.status(400).json({ erro: 'Nome e telefone são obrigatórios.' });
  await clientes.atualizar(req.params.id, { nome: nome.trim(), email: email || '', telefone: telefone.trim() });
  return res.json({ mensagem: 'Cliente atualizado.' });
}

// Exclusão a pedido do cliente (LGPD): apaga também os pedidos dele
async function excluir(req, res) {
  await clientes.excluir(req.params.id);
  return res.json({ mensagem: 'Cliente e pedidos excluídos.' });
}

module.exports = { listar, detalhar, atualizar, excluir };
