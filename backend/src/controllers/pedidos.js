// backend/src/controllers/pedidos.js
// Pedidos de orçamento: criação pelo site e gestão no painel.
const pedidos = require('../repositories/pedidos');
const pedidosService = require('../services/pedidos');
const { comTotal } = require('../database/queries/orcamentos');
const { STATUS } = require('../constants/pedidos');
const { idValido, opcaoDaQuery, padraoBusca, textoDaQuery } = require('../validators/consulta');

// POST /api/orcamentos (público, checkout do site)
async function criarDoSite(req, res) {
  const protocolo = await pedidosService.criarOrcamentoDoSite(req.body);
  return res.status(201).json({ mensagem: 'Orçamento gravado com sucesso!', protocolo });
}

async function listar(req, res) {
  const busca = textoDaQuery(req.query.busca);
  const lista = await pedidos.listar({
    status: opcaoDaQuery(req.query.status, STATUS, 'status'),
    busca: busca && padraoBusca(busca),
    // "#000123" ou "123" também encontram o pedido pelo número
    numero: busca ? idValido(busca.replace(/\D/g, '')) : null,
  });
  return res.json(lista.map(comTotal));
}

async function detalhar(req, res) {
  const pedido = await pedidos.buscar(req.params.id);
  if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado.' });
  const itens = await pedidos.listarItens(req.params.id);
  const historico = await pedidos.listarHistorico(req.params.id);
  return res.json({ ...comTotal(pedido), itens, historico });
}

async function atualizar(req, res) {
  await pedidosService.atualizarPedido(req.params.id, req.body, req.admin.id);
  return res.json({ mensagem: 'Pedido atualizado.' });
}

async function adicionarItem(req, res) {
  await pedidosService.adicionarItem(req.params.id, req.body, req.admin.id);
  return res.status(201).json({ mensagem: 'Item adicionado.' });
}

async function removerItem(req, res) {
  await pedidosService.removerItem(req.params.id, req.params.itemId, req.admin.id);
  return res.json({ mensagem: 'Item removido.' });
}

async function excluir(req, res) {
  await pedidosService.excluirPedido(req.params.id, req.admin.id);
  return res.json({ mensagem: 'Pedido excluído.' });
}

module.exports = { criarDoSite, listar, detalhar, atualizar, adicionarItem, removerItem, excluir };
