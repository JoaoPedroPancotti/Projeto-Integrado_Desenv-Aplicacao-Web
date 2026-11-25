// backend/src/controllers/produtos.js
// Cadastro de produtos no painel. O saldo nunca é editado aqui: só por movimentação de estoque.
const { emTransacao } = require('../database/transacao');
const produtos = require('../repositories/produtos');
const movimentacoes = require('../repositories/movimentacoes');
const { ERRO_EM_USO } = require('../constants/postgres');
const { numero } = require('../utils/conversores');
const { dadosProduto, validarProduto } = require('../validators/produto');
const { movimentar } = require('../services/estoque');

async function listar(req, res) {
  return res.json(await produtos.listarCompletos());
}

// Ficha do produto: kardex, pedidos em aberto e giro dos últimos 90 dias
async function detalhar(req, res) {
  const produto = await produtos.buscarCompleto(req.params.id);
  if (!produto) return res.status(404).json({ erro: 'Produto não encontrado.' });
  const kardex = await movimentacoes.listarPorProduto(req.params.id);
  const pedidosAbertos = await produtos.listarPedidosEmAberto(req.params.id);
  const giro = await movimentacoes.giroDoProduto(req.params.id);
  return res.json({ ...produto, movimentacoes: kardex, pedidos_abertos: pedidosAbertos, giro });
}

async function criar(req, res) {
  const dados = dadosProduto(req.body);
  const invalido = validarProduto(dados);
  if (invalido) return res.status(400).json({ erro: invalido });
  const inicial = numero(req.body.estoque_inicial);
  if (inicial !== null && (Number.isNaN(inicial) || inicial < 0)) return res.status(400).json({ erro: 'Estoque inicial inválido.' });

  const id = await emTransacao(async conexao => {
    const novoId = await produtos.criar(dados, conexao);
    if (inicial) {
      await movimentar(conexao, {
        produto_id: novoId, tipo: 'entrada', quantidade: inicial, custo_unitario: dados.custo,
        administrador_id: req.admin.id, observacao: 'Estoque inicial no cadastro',
      });
    }
    return novoId;
  });
  // o banco gera o código (P00001...) quando ele fica em branco
  const codigo = await produtos.buscarCodigo(id);
  return res.status(201).json({ id, codigo, mensagem: 'Produto criado.' });
}

async function atualizar(req, res) {
  const dados = dadosProduto(req.body);
  const invalido = validarProduto(dados);
  if (invalido) return res.status(400).json({ erro: invalido });
  const alterados = await produtos.atualizar(req.params.id, dados);
  if (!alterados) return res.status(404).json({ erro: 'Produto não encontrado.' });
  return res.json({ mensagem: 'Produto atualizado.' });
}

// Ligar/desligar no site sem reenviar o cadastro inteiro
async function alterarAtivo(req, res) {
  await produtos.alterarAtivo(req.params.id, Boolean(req.body.ativo));
  return res.json({ mensagem: 'Produto atualizado.' });
}

async function excluir(req, res) {
  try {
    await produtos.excluir(req.params.id);
  } catch (error) {
    if (error.code === ERRO_EM_USO) {
      return res.status(409).json({ erro: 'Este produto já tem pedidos ou movimentações de estoque e não pode ser excluído. Desative-o para tirar do site.' });
    }
    throw error;
  }
  return res.json({ mensagem: 'Produto excluído.' });
}

module.exports = { listar, detalhar, criar, atualizar, alterarAtivo, excluir };
