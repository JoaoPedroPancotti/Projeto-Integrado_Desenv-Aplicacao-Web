// backend/src/services/pedidos.js
// Regras dos pedidos de orçamento: criação pelo site, edição no painel,
// histórico de mudanças e baixa/estorno automático do estoque.
const { emTransacao } = require('../database/transacao');
const pedidosRepository = require('../repositories/pedidos');
const clientesRepository = require('../repositories/clientes');
const produtosRepository = require('../repositories/produtos');
const AppError = require('../utils/AppError');
const { numero } = require('../utils/conversores');
const { STATUS } = require('../constants/pedidos');
const { sincronizarPedido } = require('./estoque');

// Baixa/estorno automático do estoque e registro no histórico do pedido
async function registrarEstoque(conexao, orcamentoId, administradorId, status) {
  const { baixados, estornados } = await sincronizarPedido(conexao, orcamentoId, administradorId);
  if (!baixados && !estornados) return;
  const partes = [];
  if (baixados) partes.push(`baixa de ${baixados} ${baixados === 1 ? 'produto' : 'produtos'}`);
  if (estornados) partes.push(`estorno de ${estornados} ${estornados === 1 ? 'produto' : 'produtos'}`);
  const atual = status || await pedidosRepository.buscarStatus(orcamentoId, conexao);
  await pedidosRepository.registrarHistorico(
    { orcamentoId, administradorId, status: atual, descricao: `Estoque: ${partes.join(' e ')}` },
    conexao
  );
}

/**
 * Pedido enviado pelo checkout do site. Reaproveita o cliente com o mesmo telefone
 * e grava os itens com o preço de referência do produto (a loja pode ajustar no painel).
 * Devolve o número do protocolo.
 */
async function criarOrcamentoDoSite({ cliente, itens, observacoes }) {
  if (!itens || itens.length === 0) throw new AppError('O carrinho está vazio.');
  if (!cliente?.nome?.trim() || !cliente?.telefone?.trim()) throw new AppError('Informe nome e telefone.');

  const contato = { nome: cliente.nome.trim(), email: cliente.email || '', telefone: cliente.telefone.trim() };

  return emTransacao(async conexao => {
    let clienteId = await clientesRepository.buscarIdPorTelefone(cliente.telefone.replace(/\D/g, ''), conexao);
    if (clienteId) await clientesRepository.atualizarContato(clienteId, contato, conexao);
    else clienteId = await clientesRepository.criar(contato, conexao);

    const orcamentoId = await pedidosRepository.criar(clienteId, observacoes || '', conexao);
    for (const item of itens) {
      await pedidosRepository.inserirItemComPrecoAtual(orcamentoId, item.produto_id, item.quantidade || 1, conexao);
    }
    await pedidosRepository.registrarHistorico(
      { orcamentoId, administradorId: null, status: 'Pendente', descricao: 'Pedido recebido pelo site' },
      conexao
    );
    return orcamentoId;
  });
}

/**
 * Edição do pedido no painel: status, valores, mensagem ao cliente e preço/quantidade dos itens.
 */
async function atualizarPedido(id, dados, administradorId) {
  const { status, valor_frete, desconto, forma_pagamento, resposta, notas_internas, itens = [] } = dados;
  if (status && !STATUS.includes(status)) throw new AppError('Status inválido.');

  await emTransacao(async conexao => {
    const statusAtual = await pedidosRepository.travarStatus(id, conexao);
    if (!statusAtual) throw new AppError('Pedido não encontrado.', 404);
    const novoStatus = status || statusAtual;

    await pedidosRepository.atualizar(id, {
      status: novoStatus,
      valor_frete: numero(valor_frete),
      desconto: numero(desconto),
      forma_pagamento: forma_pagamento || null,
      resposta: resposta || null,
      notas_internas: notas_internas || null,
    }, conexao);
    for (const item of itens) {
      await pedidosRepository.atualizarItem(id, {
        id: item.id,
        quantidade: Number(item.quantidade) || 1,
        precoUnitario: numero(item.preco_unitario),
      }, conexao);
    }

    const descricao = status && status !== statusAtual
      ? `Status alterado de "${statusAtual}" para "${status}"`
      : 'Valores e informações atualizados';
    await pedidosRepository.registrarHistorico({ orcamentoId: id, administradorId, status: novoStatus, descricao }, conexao);
    await registrarEstoque(conexao, id, administradorId, novoStatus);
  });
}

async function adicionarItem(orcamentoId, { produto_id: produtoId, quantidade }, administradorId) {
  const produto = await produtosRepository.buscarPreco(produtoId);
  if (!produto) throw new AppError('Produto não encontrado.', 404);
  await emTransacao(async conexao => {
    await pedidosRepository.inserirItem(orcamentoId, {
      produtoId,
      quantidade: Number(quantidade) || 1,
      precoUnitario: produto.preco,
    }, conexao);
    await registrarEstoque(conexao, orcamentoId, administradorId);
  });
}

async function removerItem(orcamentoId, itemId, administradorId) {
  await emTransacao(async conexao => {
    await pedidosRepository.removerItem(orcamentoId, itemId, conexao);
    await registrarEstoque(conexao, orcamentoId, administradorId);
  });
}

// Excluir um pedido concluído devolve ao estoque o que tinha sido baixado
async function excluirPedido(id, administradorId) {
  const apagados = await emTransacao(async conexao => {
    await sincronizarPedido(conexao, id, administradorId, { excluindo: true });
    return pedidosRepository.excluir(id, conexao);
  });
  if (!apagados) throw new AppError('Pedido não encontrado.', 404);
}

module.exports = {
  criarOrcamentoDoSite,
  atualizarPedido,
  adicionarItem,
  removerItem,
  excluirPedido,
};
