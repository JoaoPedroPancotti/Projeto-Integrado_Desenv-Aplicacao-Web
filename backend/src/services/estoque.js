// backend/src/services/estoque.js
// Regras do estoque. Todo saldo muda por aqui, sempre dentro de uma transação,
// e cada mudança grava uma linha no kardex (movimentacoes_estoque).
const AppError = require('../utils/AppError');
const { emTransacao } = require('../database/transacao');
const { numero, texto } = require('../utils/conversores');
const produtosRepository = require('../repositories/produtos');
const movimentacoesRepository = require('../repositories/movimentacoes');
const pedidosRepository = require('../repositories/pedidos');

const TAMANHO_OBSERVACAO = 255; // limite da coluna movimentacoes_estoque.observacao

// Sinal de cada tipo: +1 entra, -1 sai, 0 = o próprio movimento traz o sinal (ajustes)
const TIPOS = {
  entrada: 1,     // compra / recebimento de mercadoria
  devolucao: 1,   // cliente devolveu
  estorno: 1,     // pedido concluído que foi reaberto ou excluído
  saida: -1,      // uso interno, transferência, retirada sem pedido
  perda: -1,      // quebra, avaria, vencimento
  venda: -1,      // baixa automática do pedido concluído
  ajuste: 0,      // correção manual do saldo
  inventario: 0,  // diferença encontrada na contagem
};

// Saídas manuais que não podem deixar o saldo negativo
const BLOQUEIA_NEGATIVO = ['saida', 'perda'];

// Tipos lançados só pelo sistema (pedidos e inventário), nunca como movimentação avulsa
const TIPOS_AUTOMATICOS = ['venda', 'estorno', 'inventario'];

const arredondar = n => Math.round(Number(n) * 1000) / 1000;

/**
 * Lança uma movimentação e atualiza o saldo (e o custo médio, nas entradas).
 * `quantidade` já vem com sinal: positivo entra, negativo sai.
 */
async function movimentar(conexao, mov) {
  const delta = arredondar(mov.quantidade);
  if (!Number.isFinite(delta) || delta === 0) return null;
  if (!(mov.tipo in TIPOS)) throw new AppError('Tipo de movimentação inválido.');

  const produto = await produtosRepository.travarParaMovimentar(mov.produto_id, conexao);
  if (!produto) throw new AppError('Produto não encontrado.', 404);

  const anterior = arredondar(produto.estoque);
  const posterior = arredondar(anterior + delta);
  if (posterior < 0 && BLOQUEIA_NEGATIVO.includes(mov.tipo)) {
    throw new AppError(`Estoque insuficiente de "${produto.nome}": há ${anterior} ${produto.unidade || 'un'} e a saída é de ${-delta}.`);
  }

  // Custo médio ponderado: só compras com custo informado mexem no custo do produto
  let custoProduto = produto.custo;
  const custoInformado = mov.custo_unitario === null || mov.custo_unitario === undefined || mov.custo_unitario === ''
    ? null : Number(mov.custo_unitario);
  if (mov.tipo === 'entrada' && custoInformado !== null && delta > 0) {
    const base = Math.max(anterior, 0);
    custoProduto = produto.custo === null || base === 0
      ? custoInformado
      : (base * produto.custo + delta * custoInformado) / (base + delta);
    custoProduto = Math.round(custoProduto * 10000) / 10000;
  }
  // Nas saídas registra o custo médio do momento (base do custo das mercadorias vendidas)
  const custoMovimento = custoInformado !== null ? custoInformado : produto.custo;

  await produtosRepository.atualizarSaldoECusto(produto.id, posterior, custoProduto, conexao);
  const id = await movimentacoesRepository.inserir({
    produto_id: produto.id,
    tipo: mov.tipo,
    quantidade: delta,
    saldo_anterior: anterior,
    saldo_posterior: posterior,
    custo_unitario: custoMovimento,
    documento: mov.documento || null,
    fornecedor_id: mov.fornecedor_id || null,
    orcamento_id: mov.orcamento_id || null,
    administrador_id: mov.administrador_id || null,
    observacao: mov.observacao ? String(mov.observacao).slice(0, TAMANHO_OBSERVACAO) : null,
  }, conexao);
  return { id, produto_id: produto.id, nome: produto.nome, anterior, posterior, quantidade: delta };
}

/**
 * Deixa o estoque coerente com o pedido:
 *  - pedido "Concluído": a soma das baixas de cada produto = quantidade dos itens
 *  - qualquer outro status (ou pedido sendo excluído): nenhuma baixa
 * Lança só a diferença (venda ou estorno), então pode ser chamada quantas vezes quiser.
 */
async function sincronizarPedido(conexao, orcamentoId, administradorId, { excluindo = false } = {}) {
  const pedido = await pedidosRepository.buscarSituacaoDoEstoque(orcamentoId, conexao);
  if (!pedido || pedido.estoque_legado) return { baixados: 0, estornados: 0 };

  const concluido = pedido.status === 'Concluído' && !excluindo;
  const desejado = concluido ? await pedidosRepository.somarItensComEstoque(orcamentoId, conexao) : [];
  const atual = await movimentacoesRepository.somarBaixasDoPedido(orcamentoId, conexao);

  const alvo = new Map(desejado.map(l => [l.produto_id, -arredondar(l.quantidade)]));
  const lancado = new Map(atual.map(l => [l.produto_id, arredondar(l.quantidade)]));
  // ordem fixa de produtos evita travamento entre dois pedidos salvos ao mesmo tempo
  const ids = [...new Set([...alvo.keys(), ...lancado.keys()])].sort((a, b) => a - b);

  let baixados = 0;
  let estornados = 0;
  for (const produtoId of ids) {
    const diferenca = arredondar((alvo.get(produtoId) || 0) - (lancado.get(produtoId) || 0));
    if (!diferenca) continue;
    const tipo = diferenca < 0 ? 'venda' : 'estorno';
    await movimentar(conexao, {
      produto_id: produtoId, tipo, quantidade: diferenca, orcamento_id: orcamentoId, administrador_id: administradorId,
      observacao: tipo === 'venda' ? `Baixa do pedido #${String(orcamentoId).padStart(6, '0')}` : `Estorno do pedido #${String(orcamentoId).padStart(6, '0')}`,
    });
    if (tipo === 'venda') baixados += 1; else estornados += 1;
  }

  if (Boolean(pedido.estoque_baixado) !== concluido && !excluindo) {
    await pedidosRepository.marcarEstoqueBaixado(orcamentoId, concluido, conexao);
  }
  return { baixados, estornados };
}


/**
 * Movimentação avulsa de um produto feita pelo painel.
 * No "ajuste" a pessoa informa o saldo correto e o sistema lança a diferença.
 */
async function registrarMovimentacaoAvulsa(dados, administradorId) {
  const { produto_id: produtoId, tipo, documento, fornecedor_id: fornecedorId, observacao } = dados;
  if (!produtoId) throw new AppError('Escolha o produto.');
  if (!(tipo in TIPOS) || TIPOS_AUTOMATICOS.includes(tipo)) throw new AppError('Tipo de movimentação inválido.');

  return emTransacao(async conexao => {
    let quantidade;
    if (tipo === 'ajuste') {
      const novoSaldo = numero(dados.novo_saldo);
      if (novoSaldo === null || Number.isNaN(novoSaldo)) throw new AppError('Informe o saldo correto.');
      if (!texto(observacao)) throw new AppError('Informe o motivo do ajuste.');
      const produto = await produtosRepository.travarSaldo(produtoId, conexao);
      if (!produto) throw new AppError('Produto não encontrado.', 404);
      quantidade = arredondar(novoSaldo - produto.estoque);
      if (!quantidade) throw new AppError('O saldo informado é igual ao atual.');
    } else {
      const qtd = numero(dados.quantidade);
      if (!qtd || Number.isNaN(qtd) || qtd <= 0) throw new AppError('Informe uma quantidade maior que zero.');
      if (tipo === 'perda' && !texto(observacao)) throw new AppError('Informe o motivo da perda.');
      quantidade = qtd * TIPOS[tipo];
    }
    return movimentar(conexao, {
      produto_id: produtoId, tipo, quantidade,
      custo_unitario: tipo === 'entrada' ? numero(dados.custo_unitario) : null,
      documento: texto(documento), fornecedor_id: fornecedorId || null,
      administrador_id: administradorId, observacao: texto(observacao),
    });
  });
}

/**
 * Entrada de mercadoria: vários produtos de uma nota fiscal, numa transação só.
 * Pode atualizar o preço de venda e define o fornecedor dos produtos que ainda não têm.
 */
async function registrarEntradaMercadoria(dados, administradorId) {
  const { fornecedor_id: fornecedorId, documento, observacao, itens = [] } = dados;
  const linhas = itens
    .map(i => ({ produto_id: Number(i.produto_id), quantidade: numero(i.quantidade), custo: numero(i.custo_unitario), preco: numero(i.preco_venda) }))
    .filter(i => i.produto_id);
  if (!linhas.length) throw new AppError('Adicione pelo menos um produto.');
  if (linhas.some(i => !i.quantidade || Number.isNaN(i.quantidade) || i.quantidade <= 0)) {
    throw new AppError('Todas as quantidades precisam ser maiores que zero.');
  }
  if (linhas.some(i => (i.custo !== null && (Number.isNaN(i.custo) || i.custo < 0)) || (i.preco !== null && (Number.isNaN(i.preco) || i.preco < 0)))) {
    throw new AppError('Há custo ou preço inválido na nota.');
  }

  return emTransacao(async conexao => {
    const feitos = [];
    // ordem fixa evita travamento com outra entrada simultânea
    for (const linha of [...linhas].sort((a, b) => a.produto_id - b.produto_id)) {
      feitos.push(await movimentar(conexao, {
        produto_id: linha.produto_id, tipo: 'entrada', quantidade: linha.quantidade, custo_unitario: linha.custo,
        documento: texto(documento), fornecedor_id: fornecedorId || null,
        administrador_id: administradorId, observacao: texto(observacao) || 'Entrada de mercadoria',
      }));
      if (linha.preco !== null) await produtosRepository.atualizarPreco(linha.produto_id, linha.preco, conexao);
      if (fornecedorId) await produtosRepository.definirFornecedorSeVazio(linha.produto_id, fornecedorId, conexao);
    }
    return feitos;
  });
}

/**
 * Inventário: recebe o que foi contado e lança só a diferença de cada produto.
 */
async function aplicarInventario(dados, administradorId) {
  const { observacao, itens = [] } = dados;
  const contagens = itens
    .map(i => ({ produto_id: Number(i.produto_id), contado: numero(i.contado) }))
    .filter(i => i.produto_id && i.contado !== null);
  if (!contagens.length) throw new AppError('Nenhuma contagem informada.');
  if (contagens.some(i => Number.isNaN(i.contado) || i.contado < 0)) throw new AppError('Há quantidade contada inválida.');

  return emTransacao(async conexao => {
    let ajustados = 0;
    for (const item of contagens.sort((a, b) => a.produto_id - b.produto_id)) {
      const produto = await produtosRepository.travarSaldo(item.produto_id, conexao);
      if (!produto) continue;
      const diferenca = arredondar(item.contado - produto.estoque);
      if (!diferenca) continue;
      await movimentar(conexao, {
        produto_id: item.produto_id, tipo: 'inventario', quantidade: diferenca,
        administrador_id: administradorId, observacao: texto(observacao) || 'Contagem de inventário',
      });
      ajustados += 1;
    }
    return { conferidos: contagens.length, ajustados };
  });
}

module.exports = {
  TIPOS_MOVIMENTACAO: Object.keys(TIPOS),
  movimentar,
  sincronizarPedido,
  registrarMovimentacaoAvulsa,
  registrarEntradaMercadoria,
  aplicarInventario,
};
