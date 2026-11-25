// backend/src/controllers/dashboard.js
// Números da tela inicial do painel.
const indicadores = require('../repositories/indicadores');
const pedidos = require('../repositories/pedidos');
const { comTotal } = require('../database/queries/orcamentos');
const { STATUS } = require('../constants/pedidos');

async function resumo(req, res) {
  const porStatus = await indicadores.pedidosPorStatus();
  const contagens = await indicadores.contagensDoPainel();
  const porDia = await indicadores.pedidosPorDia();
  const maisPedidos = await indicadores.produtosMaisPedidos();
  const recentes = await pedidos.listarRecentes();
  const fechadosMes = await pedidos.listarFechadosNoMes();

  return res.json({
    ...contagens,
    por_status: Object.fromEntries(STATUS.map(s => [s, porStatus.find(r => r.status === s)?.total || 0])),
    por_dia: porDia,
    mais_pedidos: maisPedidos,
    recentes: recentes.map(comTotal),
    vendido_mes: fechadosMes.map(comTotal).reduce((soma, o) => soma + o.total, 0),
  });
}

module.exports = { resumo };
