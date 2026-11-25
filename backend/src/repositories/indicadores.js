// backend/src/repositories/indicadores.js
// Consultas agregadas (somente leitura): dashboard do painel, resumo do estoque e relatórios.
const db = require('../database/conexao');
const { SQL_PRODUTOS } = require('../database/queries/produtos');
const { DIA_LOCAL, HOJE } = require('../database/queries/datas');

// ---------- Dashboard ----------

async function pedidosPorStatus() {
  const [rows] = await db.query('SELECT status, COUNT(*) AS total FROM orcamentos GROUP BY status');
  return rows;
}

async function contagensDoPainel() {
  const [[contagens]] = await db.query(`
    SELECT
      (SELECT COUNT(*) FROM orcamentos WHERE ${DIA_LOCAL('criado_em')} = ${HOJE}) AS hoje,
      (SELECT COUNT(*) FROM orcamentos WHERE ${DIA_LOCAL('criado_em')} > ${HOJE} - 30) AS ultimos30,
      (SELECT COUNT(*) FROM orcamentos) AS total_pedidos,
      (SELECT COUNT(*) FROM clientes) AS clientes,
      (SELECT COUNT(*) FROM produtos WHERE ativo) AS produtos_ativos,
      (SELECT COUNT(*) FROM produtos WHERE ativo AND preco IS NULL) AS produtos_sem_preco,
      (SELECT COUNT(*) FROM produtos WHERE ativo AND controla_estoque AND estoque_minimo IS NOT NULL AND estoque <= estoque_minimo) AS estoque_baixo,
      (SELECT COUNT(*) FROM produtos WHERE controla_estoque AND estoque < 0) AS estoque_negativo,
      (SELECT COALESCE(SUM(estoque * custo), 0) FROM produtos WHERE controla_estoque AND estoque > 0) AS valor_estoque`);
  return contagens;
}

// Pedidos por dia nas últimas duas semanas
async function pedidosPorDia() {
  const [rows] = await db.query(`
    SELECT to_char(${DIA_LOCAL('criado_em')}, 'YYYY-MM-DD') AS dia, COUNT(*) AS total
    FROM orcamentos WHERE ${DIA_LOCAL('criado_em')} > ${HOJE} - 14
    GROUP BY dia ORDER BY dia`);
  return rows;
}

async function produtosMaisPedidos() {
  const [rows] = await db.query(`
    SELECT p.id, p.nome, p.imagem_url, COUNT(DISTINCT i.orcamento_id) AS pedidos, SUM(i.quantidade) AS quantidade
    FROM itens_orcamento i JOIN produtos p ON p.id = i.produto_id
    GROUP BY p.id ORDER BY pedidos DESC, quantidade DESC LIMIT 5`);
  return rows;
}

// ---------- Estoque ----------

async function resumoDoEstoque() {
  const [[resumo]] = await db.query(`
    SELECT
      COUNT(*) FILTER (WHERE p.controla_estoque) AS produtos_controlados,
      COALESCE(SUM(p.estoque * p.custo) FILTER (WHERE p.controla_estoque AND p.estoque > 0), 0) AS valor_custo,
      COALESCE(SUM(p.estoque * p.preco) FILTER (WHERE p.controla_estoque AND p.estoque > 0), 0) AS valor_venda,
      COUNT(*) FILTER (WHERE p.controla_estoque AND p.ativo AND p.estoque > 0 AND p.estoque_minimo IS NOT NULL AND p.estoque <= p.estoque_minimo) AS abaixo_minimo,
      COUNT(*) FILTER (WHERE p.controla_estoque AND p.ativo AND p.estoque = 0) AS zerados,
      COUNT(*) FILTER (WHERE p.controla_estoque AND p.estoque < 0) AS negativos,
      COUNT(*) FILTER (WHERE p.controla_estoque AND p.ativo AND p.estoque_minimo IS NOT NULL AND p.estoque <= p.estoque_minimo) AS precisa_repor,
      COUNT(*) FILTER (WHERE p.controla_estoque AND p.estoque_maximo IS NOT NULL AND p.estoque > p.estoque_maximo) AS acima_maximo,
      COUNT(*) FILTER (WHERE p.controla_estoque AND p.ativo AND p.custo IS NULL) AS sem_custo,
      COUNT(*) FILTER (WHERE p.controla_estoque AND p.ativo AND p.estoque_minimo IS NULL) AS sem_minimo,
      (SELECT COUNT(*) FROM movimentacoes_estoque) AS total_movimentacoes,
      (SELECT COUNT(*) FROM movimentacoes_estoque WHERE criado_em >= now() - interval '1 day') AS movimentacoes_24h,
      (SELECT COALESCE(SUM(i.quantidade), 0) FROM itens_orcamento i JOIN orcamentos o ON o.id = i.orcamento_id WHERE o.status = 'Aprovado') AS unidades_reservadas
    FROM produtos p`);
  return resumo;
}

// ---------- Relatórios (dias = período já validado) ----------

// Reposição: disponível (saldo - reservado) no mínimo ou abaixo
async function produtosParaRepor() {
  const [rows] = await db.query(`
    SELECT * FROM (${SQL_PRODUTOS}) x
    WHERE x.ativo AND x.controla_estoque AND x.estoque_minimo IS NOT NULL AND x.disponivel <= x.estoque_minimo
    ORDER BY x.fornecedor_nome NULLS LAST, x.nome`);
  return rows;
}

// Faturamento por produto dos pedidos concluídos no período (base da curva ABC)
async function vendasPorProduto(dias) {
  const [rows] = await db.query(`
    SELECT p.id, p.codigo, p.nome, p.unidade, p.estoque, c.nome AS categoria_nome,
           SUM(i.quantidade) AS quantidade,
           SUM(i.quantidade * COALESCE(i.preco_unitario, 0)) AS faturamento,
           SUM(i.quantidade * COALESCE(p.custo, 0)) AS custo_estimado,
           COUNT(DISTINCT o.id) AS pedidos
    FROM itens_orcamento i
    JOIN orcamentos o ON o.id = i.orcamento_id
    JOIN produtos p ON p.id = i.produto_id
    LEFT JOIN categorias c ON c.id = p.categoria_id
    WHERE o.status = 'Concluído' AND COALESCE(o.concluido_em, o.atualizado_em) >= now() - make_interval(days => ?::int)
    GROUP BY p.id, c.nome ORDER BY faturamento DESC, quantidade DESC`, [dias]);
  return rows;
}

// Parados: têm saldo, mas nenhuma saída no período
async function produtosParados(dias) {
  const [rows] = await db.query(`
    SELECT p.id, p.codigo, p.nome, p.unidade, p.estoque, p.custo, p.localizacao, c.nome AS categoria_nome,
           p.estoque * COALESCE(p.custo, 0) AS valor_parado,
           (SELECT MAX(criado_em) FROM movimentacoes_estoque m WHERE m.produto_id = p.id AND m.quantidade < 0 AND m.tipo IN ('venda', 'saida', 'perda')) AS ultima_saida
    FROM produtos p LEFT JOIN categorias c ON c.id = p.categoria_id
    WHERE p.controla_estoque AND p.estoque > 0
      AND NOT EXISTS (SELECT 1 FROM movimentacoes_estoque m
                      WHERE m.produto_id = p.id AND m.quantidade < 0 AND m.tipo IN ('venda', 'saida', 'perda')
                        AND m.criado_em >= now() - make_interval(days => ?::int))
    ORDER BY valor_parado DESC, p.nome`, [dias]);
  return rows;
}

async function valorDoEstoquePorCategoria() {
  const [rows] = await db.query(`
    SELECT COALESCE(c.nome, 'Sem categoria') AS categoria, COUNT(p.id) AS produtos,
           COALESCE(SUM(p.estoque * p.custo) FILTER (WHERE p.estoque > 0), 0) AS valor_custo,
           COALESCE(SUM(p.estoque * p.preco) FILTER (WHERE p.estoque > 0), 0) AS valor_venda
    FROM produtos p LEFT JOIN categorias c ON c.id = p.categoria_id
    WHERE p.controla_estoque
    GROUP BY c.nome ORDER BY valor_custo DESC`);
  return rows;
}

// Custo das mercadorias vendidas (custo médio na hora da baixa), perdas, compras e ajustes
async function resultadoDoPeriodo(dias) {
  const [[resultado]] = await db.query(`
    SELECT
      COALESCE(-SUM(quantidade * COALESCE(custo_unitario, 0)) FILTER (WHERE tipo IN ('venda', 'estorno')), 0) AS cmv,
      COALESCE(-SUM(quantidade * COALESCE(custo_unitario, 0)) FILTER (WHERE tipo = 'perda'), 0) AS perdas,
      COALESCE(SUM(quantidade * COALESCE(custo_unitario, 0)) FILTER (WHERE tipo = 'entrada'), 0) AS compras,
      COALESCE(SUM(quantidade * COALESCE(custo_unitario, 0)) FILTER (WHERE tipo IN ('inventario', 'ajuste')), 0) AS ajustes
    FROM movimentacoes_estoque WHERE criado_em >= now() - make_interval(days => ?::int)`, [dias]);
  return resultado;
}

module.exports = {
  pedidosPorStatus,
  contagensDoPainel,
  pedidosPorDia,
  produtosMaisPedidos,
  resumoDoEstoque,
  produtosParaRepor,
  vendasPorProduto,
  produtosParados,
  valorDoEstoquePorCategoria,
  resultadoDoPeriodo,
};
