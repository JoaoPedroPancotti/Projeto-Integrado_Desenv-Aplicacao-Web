// backend/src/repositories/fornecedores.js
const db = require('../database/conexao');

async function listar() {
  const [rows] = await db.query(`
    SELECT f.*,
           (SELECT COUNT(*) FROM produtos p WHERE p.fornecedor_id = f.id) AS produtos,
           (SELECT MAX(criado_em) FROM movimentacoes_estoque m WHERE m.fornecedor_id = f.id AND m.tipo = 'entrada') AS ultima_compra,
           (SELECT COALESCE(SUM(quantidade * COALESCE(custo_unitario, 0)), 0) FROM movimentacoes_estoque m
             WHERE m.fornecedor_id = f.id AND m.tipo = 'entrada' AND m.criado_em >= now() - interval '365 days') AS comprado_12m
    FROM fornecedores f ORDER BY f.ativo DESC, f.nome`);
  return rows;
}

async function buscar(id) {
  const [[fornecedor]] = await db.query('SELECT * FROM fornecedores WHERE id = ?', [id]);
  return fornecedor || null;
}

// Notas de entrada do fornecedor (agrupadas por documento e minuto do lançamento)
async function listarCompras(id) {
  const [rows] = await db.query(`
    SELECT m.documento, MIN(m.criado_em) AS data, COUNT(*) AS itens, SUM(m.quantidade * COALESCE(m.custo_unitario, 0)) AS valor
    FROM movimentacoes_estoque m
    WHERE m.fornecedor_id = ? AND m.tipo = 'entrada'
    GROUP BY m.documento, date_trunc('minute', m.criado_em)
    ORDER BY data DESC LIMIT 50`, [id]);
  return rows;
}

// valores: array na ordem de COLUNAS
async function criar(valores) {
  const [resultado] = await db.query(
    `INSERT INTO fornecedores (nome, cnpj, telefone, email, contato, endereco, prazo_entrega_dias, observacoes, ativo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`, valores);
  return resultado.insertId;
}

async function atualizar(id, valores) {
  const [resultado] = await db.query(
    `UPDATE fornecedores SET nome = ?, cnpj = ?, telefone = ?, email = ?, contato = ?, endereco = ?,
       prazo_entrega_dias = ?, observacoes = ?, ativo = ? WHERE id = ?`,
    [...valores, id]);
  return resultado.affectedRows;
}

// Produtos e histórico de compras ficam (ON DELETE SET NULL)
async function excluir(id) {
  await db.query('DELETE FROM fornecedores WHERE id = ?', [id]);
}

module.exports = { listar, buscar, listarCompras, criar, atualizar, excluir };
