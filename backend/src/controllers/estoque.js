// backend/src/controllers/estoque.js
// Saldos, kardex e lançamentos de estoque (regras em services/estoque.js).
const indicadores = require('../repositories/indicadores');
const movimentacoes = require('../repositories/movimentacoes');
const estoqueService = require('../services/estoque');
const { dataDaQuery, idDaQuery, opcaoDaQuery, padraoBusca } = require('../validators/consulta');

const contagem = (n, singular, plural) => `${n} ${n === 1 ? singular : plural}`;

async function resumo(req, res) {
  return res.json(await indicadores.resumoDoEstoque());
}

async function listarMovimentacoes(req, res) {
  const filtros = {
    tipo: opcaoDaQuery(req.query.tipo, estoqueService.TIPOS_MOVIMENTACAO, 'tipo'),
    produtoId: idDaQuery(req.query.produto_id, 'produto_id'),
    fornecedorId: idDaQuery(req.query.fornecedor_id, 'fornecedor_id'),
    de: dataDaQuery(req.query.de, 'de'),
    ate: dataDaQuery(req.query.ate, 'ate'),
    busca: padraoBusca(req.query.busca),
  };
  return res.json(await movimentacoes.listar(filtros));
}

async function registrarMovimentacao(req, res) {
  const resultado = await estoqueService.registrarMovimentacaoAvulsa(req.body, req.admin.id);
  return res.status(201).json({ mensagem: 'Movimentação registrada.', ...resultado });
}

async function registrarEntrada(req, res) {
  const itens = await estoqueService.registrarEntradaMercadoria(req.body, req.admin.id);
  return res.status(201).json({ mensagem: `Entrada registrada: ${contagem(itens.length, 'produto', 'produtos')}.`, itens });
}

async function aplicarInventario(req, res) {
  const resultado = await estoqueService.aplicarInventario(req.body, req.admin.id);
  return res.status(201).json({
    mensagem: `Inventário aplicado: ${resultado.conferidos} conferidos, ${resultado.ajustados} com diferença ajustada.`,
    ...resultado,
  });
}

module.exports = { resumo, listarMovimentacoes, registrarMovimentacao, registrarEntrada, aplicarInventario };
