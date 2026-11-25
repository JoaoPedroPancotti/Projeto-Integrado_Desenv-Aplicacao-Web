// backend/src/services/relatorios.js
// Relatórios gerenciais do estoque: reposição, curva ABC, produtos parados,
// valor por categoria e resultado (lucro bruto) do período.
const indicadores = require('../repositories/indicadores');

const PERIODO_PADRAO = 90;
const PERIODO_MINIMO = 7;
const PERIODO_MAXIMO = 730;

// Limita o período pedido entre 7 dias e 2 anos
const periodoEmDias = valor => Math.min(Math.max(Number(valor) || PERIODO_PADRAO, PERIODO_MINIMO), PERIODO_MAXIMO);

// Classe A = até 80% do faturamento acumulado, B = até 95%, C = o restante
function calcularCurvaAbc(vendas) {
  const total = vendas.reduce((soma, v) => soma + v.faturamento, 0);
  let acumulado = 0;
  const curva = vendas.map(v => {
    acumulado += v.faturamento;
    const pct = total ? (acumulado / total) * 100 : 100;
    return {
      ...v,
      participacao: total ? (v.faturamento / total) * 100 : 0,
      acumulado: pct,
      classe: pct <= 80 ? 'A' : pct <= 95 ? 'B' : 'C',
    };
  });
  return { curva, total };
}

async function gerarRelatorioEstoque(diasPedidos) {
  const dias = periodoEmDias(diasPedidos);

  const reposicao = await indicadores.produtosParaRepor();
  const { curva: curvaAbc, total: totalFaturado } = calcularCurvaAbc(await indicadores.vendasPorProduto(dias));
  const parados = await indicadores.produtosParados(dias);
  const porCategoria = await indicadores.valorDoEstoquePorCategoria();
  const resultado = await indicadores.resultadoDoPeriodo(dias);

  return {
    dias,
    reposicao,
    curva_abc: curvaAbc,
    parados,
    por_categoria: porCategoria,
    resultado: { ...resultado, faturamento: totalFaturado, lucro_bruto: totalFaturado - resultado.cmv },
  };
}

module.exports = { gerarRelatorioEstoque, calcularCurvaAbc };
