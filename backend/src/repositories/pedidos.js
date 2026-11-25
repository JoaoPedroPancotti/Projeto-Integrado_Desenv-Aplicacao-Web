// backend/src/repositories/pedidos.js
// Acesso aos pedidos de orçamento: orcamentos, itens_orcamento e orcamento_historico.
const db = require('../database/conexao');
const { SQL_ORCAMENTOS } = require('../database/queries/orcamentos');
const { INICIO_DO_MES } = require('../database/queries/datas');

const LIMITE_LISTAGEM = 500;

// ---------- Consultas ----------

/**
 * Listagem do painel com filtros já validados.
 * @param {{status?, busca?, numero?}} filtros  busca = padrão ILIKE já escapado; numero = id do pedido (ou 0)
 */
async function listar({ status, busca, numero } = {}) {
  const condicoes = [];
  const params = [];
  if (status) { condicoes.push('o.status = ?'); params.push(status); }
  if (busca) {
    condicoes.push('(c.nome ILIKE ? OR c.telefone ILIKE ? OR c.email ILIKE ? OR o.id = ?)');
    params.push(busca, busca, busca, numero || 0);
  }
  const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';
  const [rows] = await db.query(`${SQL_ORCAMENTOS} ${where} ORDER BY o.criado_em DESC LIMIT ${LIMITE_LISTAGEM}`, params);
  return rows;
}

async function buscar(id) {
  const [[pedido]] = await db.query(`${SQL_ORCAMENTOS} WHERE o.id = ?`, [id]);
  return pedido || null;
}

async function listarItens(orcamentoId) {
  const [rows] = await db.query(`
    SELECT i.*, p.nome, p.codigo, p.imagem_url, p.unidade, p.preco AS preco_referencia,
           p.estoque, p.controla_estoque, p.localizacao
    FROM itens_orcamento i JOIN produtos p ON p.id = i.produto_id
    WHERE i.orcamento_id = ? ORDER BY i.id`, [orcamentoId]);
  return rows;
}

async function listarHistorico(orcamentoId) {
  const [rows] = await db.query(`
    SELECT h.*, a.nome AS administrador_nome
    FROM orcamento_historico h LEFT JOIN administradores a ON a.id = h.administrador_id
    WHERE h.orcamento_id = ? ORDER BY h.criado_em DESC, h.id DESC`, [orcamentoId]);
  return rows;
}

async function listarPorCliente(clienteId) {
  const [rows] = await db.query(`${SQL_ORCAMENTOS} WHERE o.cliente_id = ? ORDER BY o.criado_em DESC`, [clienteId]);
  return rows;
}

async function listarRecentes() {
  const [rows] = await db.query(`${SQL_ORCAMENTOS} ORDER BY o.criado_em DESC LIMIT 6`);
  return rows;
}

// Aprovados ou concluídos com última alteração no mês corrente
async function listarFechadosNoMes() {
  const [rows] = await db.query(`${SQL_ORCAMENTOS}
    WHERE o.status IN ('Aprovado', 'Concluído')
      AND o.atualizado_em >= ${INICIO_DO_MES}`);
  return rows;
}

// ---------- Escrita (dentro de transação) ----------

async function criar(clienteId, observacoes, executor) {
  const [resultado] = await executor.query(
    'INSERT INTO orcamentos (cliente_id, observacoes) VALUES (?, ?) RETURNING id',
    [clienteId, observacoes]
  );
  return resultado.insertId;
}

// Trava o pedido até o fim da transação e devolve o status atual
async function travarStatus(id, executor) {
  const [[pedido]] = await executor.query('SELECT status FROM orcamentos WHERE id = ? FOR UPDATE', [id]);
  return pedido?.status ?? null;
}

async function buscarStatus(id, executor) {
  const [[pedido]] = await executor.query('SELECT status FROM orcamentos WHERE id = ?', [id]);
  return pedido?.status ?? null;
}

async function atualizar(id, dados, executor) {
  await executor.query(
    `UPDATE orcamentos SET status = ?, valor_frete = ?, desconto = ?, forma_pagamento = ?, resposta = ?, notas_internas = ?
       WHERE id = ?`,
    [dados.status, dados.valor_frete, dados.desconto, dados.forma_pagamento, dados.resposta, dados.notas_internas, id]
  );
}

async function excluir(id, executor) {
  const [resultado] = await executor.query('DELETE FROM orcamentos WHERE id = ?', [id]);
  return resultado.affectedRows;
}

// ---------- Itens ----------

async function inserirItem(orcamentoId, { produtoId, quantidade, precoUnitario }, executor) {
  await executor.query(
    'INSERT INTO itens_orcamento (orcamento_id, produto_id, quantidade, preco_unitario) VALUES (?, ?, ?, ?)',
    [orcamentoId, produtoId, quantidade, precoUnitario]
  );
}

// Item do checkout: o preço de referência é copiado do produto no próprio INSERT
async function inserirItemComPrecoAtual(orcamentoId, produtoId, quantidade, executor) {
  await executor.query(
    `INSERT INTO itens_orcamento (orcamento_id, produto_id, quantidade, preco_unitario)
         SELECT ?::int, id, ?::numeric, preco FROM produtos WHERE id = ?`,
    [orcamentoId, quantidade, produtoId]
  );
}

async function atualizarItem(orcamentoId, { id, quantidade, precoUnitario }, executor) {
  await executor.query(
    'UPDATE itens_orcamento SET preco_unitario = ?, quantidade = ? WHERE id = ? AND orcamento_id = ?',
    [precoUnitario, quantidade, id, orcamentoId]
  );
}

async function removerItem(orcamentoId, itemId, executor) {
  await executor.query('DELETE FROM itens_orcamento WHERE id = ? AND orcamento_id = ?', [itemId, orcamentoId]);
}

// ---------- Histórico ----------

async function registrarHistorico({ orcamentoId, administradorId, status, descricao }, executor) {
  await executor.query(
    'INSERT INTO orcamento_historico (orcamento_id, administrador_id, status, descricao) VALUES (?, ?, ?, ?)',
    [orcamentoId, administradorId, status, descricao]
  );
}

// ---------- Integração com o estoque ----------

async function buscarSituacaoDoEstoque(id, executor) {
  const [[pedido]] = await executor.query(
    'SELECT id, status, estoque_baixado, estoque_legado FROM orcamentos WHERE id = ?',
    [id]
  );
  return pedido || null;
}

// Quantidade de cada produto (com controle de estoque) nos itens do pedido
async function somarItensComEstoque(id, executor) {
  const [rows] = await executor.query(
    `SELECT i.produto_id, SUM(i.quantidade) AS quantidade
       FROM itens_orcamento i JOIN produtos p ON p.id = i.produto_id
       WHERE i.orcamento_id = ? AND p.controla_estoque
       GROUP BY i.produto_id`, [id]);
  return rows;
}

async function marcarEstoqueBaixado(id, baixado, executor) {
  // "now()"/"NULL" são escolhidos pelo código (booleano), nunca vêm da requisição
  await executor.query(
    `UPDATE orcamentos SET estoque_baixado = ?, concluido_em = ${baixado ? 'now()' : 'NULL'} WHERE id = ?`,
    [baixado, id]
  );
}

module.exports = {
  listar,
  buscar,
  listarItens,
  listarHistorico,
  listarPorCliente,
  listarRecentes,
  listarFechadosNoMes,
  criar,
  travarStatus,
  buscarStatus,
  atualizar,
  excluir,
  inserirItem,
  inserirItemComPrecoAtual,
  atualizarItem,
  removerItem,
  registrarHistorico,
  buscarSituacaoDoEstoque,
  somarItensComEstoque,
  marcarEstoqueBaixado,
};
