// backend/src/repositories/movimentacoes.js
// Acesso ao kardex (tabela movimentacoes_estoque).
const db = require('../database/conexao');

const LIMITE_LISTAGEM = 1000;
const LIMITE_KARDEX_PRODUTO = 300;

async function inserir(mov, executor) {
  const [resultado] = await executor.query(
    `INSERT INTO movimentacoes_estoque
       (produto_id, tipo, quantidade, saldo_anterior, saldo_posterior, custo_unitario,
        documento, fornecedor_id, orcamento_id, administrador_id, observacao)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    [mov.produto_id, mov.tipo, mov.quantidade, mov.saldo_anterior, mov.saldo_posterior, mov.custo_unitario,
      mov.documento, mov.fornecedor_id, mov.orcamento_id, mov.administrador_id, mov.observacao]
  );
  return resultado.insertId;
}

/**
 * Listagem com filtros já validados (validators/consulta.js).
 * Os filtros entram só como trechos SQL fixos; os valores vão em `params`.
 * @param {{tipo?, produtoId?, fornecedorId?, de?, ate?, busca?}} filtros  busca = padrão ILIKE já escapado
 */
async function listar({ tipo, produtoId, fornecedorId, de, ate, busca } = {}) {
  const condicoes = [];
  const params = [];
  if (tipo) { condicoes.push('m.tipo = ?'); params.push(tipo); }
  if (produtoId) { condicoes.push('m.produto_id = ?'); params.push(produtoId); }
  if (fornecedorId) { condicoes.push('m.fornecedor_id = ?'); params.push(fornecedorId); }
  if (de) { condicoes.push("m.criado_em >= (?::date AT TIME ZONE 'America/Sao_Paulo')"); params.push(de); }
  if (ate) { condicoes.push("m.criado_em < ((?::date + 1) AT TIME ZONE 'America/Sao_Paulo')"); params.push(ate); }
  if (busca) {
    condicoes.push('(p.nome ILIKE ? OR p.codigo ILIKE ? OR p.codigo_barras ILIKE ? OR m.documento ILIKE ? OR m.observacao ILIKE ?)');
    params.push(...Array(5).fill(busca));
  }
  const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';
  const [rows] = await db.query(`
    SELECT m.*, p.nome AS produto_nome, p.codigo AS produto_codigo, p.unidade, p.imagem_url,
           a.nome AS administrador_nome, f.nome AS fornecedor_nome
    FROM movimentacoes_estoque m
    JOIN produtos p ON p.id = m.produto_id
    LEFT JOIN administradores a ON a.id = m.administrador_id
    LEFT JOIN fornecedores f ON f.id = m.fornecedor_id
    ${where}
    ORDER BY m.criado_em DESC, m.id DESC LIMIT ${LIMITE_LISTAGEM}`, params);
  return rows;
}

// Kardex do produto (ficha do produto)
async function listarPorProduto(produtoId) {
  const [rows] = await db.query(`
    SELECT m.*, a.nome AS administrador_nome, f.nome AS fornecedor_nome
    FROM movimentacoes_estoque m
    LEFT JOIN administradores a ON a.id = m.administrador_id
    LEFT JOIN fornecedores f ON f.id = m.fornecedor_id
    WHERE m.produto_id = ? ORDER BY m.criado_em DESC, m.id DESC LIMIT ${LIMITE_KARDEX_PRODUTO}`, [produtoId]);
  return rows;
}

// Vendido, comprado e perdido nos últimos 90 dias
async function giroDoProduto(produtoId) {
  const [[giro]] = await db.query(`
    SELECT COALESCE(-SUM(quantidade) FILTER (WHERE tipo IN ('venda', 'estorno')), 0) AS vendido_90d,
           COALESCE(SUM(quantidade) FILTER (WHERE tipo = 'entrada'), 0) AS comprado_90d,
           COALESCE(-SUM(quantidade) FILTER (WHERE tipo = 'perda'), 0) AS perdas_90d
    FROM movimentacoes_estoque WHERE produto_id = ? AND criado_em >= now() - interval '90 days'`, [produtoId]);
  return giro;
}

// Quanto de cada produto já foi baixado/estornado por um pedido
async function somarBaixasDoPedido(orcamentoId, executor) {
  const [rows] = await executor.query(
    `SELECT produto_id, SUM(quantidade) AS quantidade FROM movimentacoes_estoque
     WHERE orcamento_id = ? AND tipo IN ('venda', 'estorno') GROUP BY produto_id`, [orcamentoId]
  );
  return rows;
}

module.exports = { inserir, listar, listarPorProduto, giroDoProduto, somarBaixasDoPedido };
