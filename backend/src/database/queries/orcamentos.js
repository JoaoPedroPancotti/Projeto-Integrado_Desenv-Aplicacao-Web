// backend/src/database/queries/orcamentos.js
// Trechos SQL fixos, escritos no próprio código. Nunca interpole aqui valores da requisição:
// eles vão sempre como parâmetro ("?") em db.query(sql, params).
// Consulta-base dos pedidos: orçamento + cliente + totais calculados a partir dos itens
const SQL_ORCAMENTOS = `
  SELECT o.*, c.nome AS cliente_nome, c.telefone AS cliente_telefone, c.email AS cliente_email,
         COALESCE(t.qtd_itens, 0) AS qtd_itens, COALESCE(t.unidades, 0) AS unidades,
         t.subtotal, COALESCE(t.itens_sem_preco, 0) AS itens_sem_preco
  FROM orcamentos o
  JOIN clientes c ON c.id = o.cliente_id
  LEFT JOIN (
    SELECT orcamento_id, COUNT(*) AS qtd_itens, SUM(quantidade) AS unidades,
           SUM(quantidade * preco_unitario) AS subtotal, COUNT(*) FILTER (WHERE preco_unitario IS NULL) AS itens_sem_preco
    FROM itens_orcamento GROUP BY orcamento_id
  ) t ON t.orcamento_id = o.id`;

// Total do pedido = itens + frete - desconto (nunca negativo)
function comTotal(orcamento) {
  const subtotal = orcamento.subtotal || 0;
  const total = subtotal + (orcamento.valor_frete || 0) - (orcamento.desconto || 0);
  return { ...orcamento, subtotal, total: Math.max(total, 0) };
}

module.exports = { SQL_ORCAMENTOS, comTotal };
