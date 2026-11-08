// backend/src/estoque.js
// Regras do estoque. Todo saldo muda por aqui, sempre dentro de uma transação,
// e cada mudança grava uma linha no kardex (movimentacoes_estoque).

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

const arredondar = n => Math.round(Number(n) * 1000) / 1000;

class ErroEstoque extends Error {
  constructor(mensagem, status = 400) {
    super(mensagem);
    this.status = status;
  }
}

/**
 * Lança uma movimentação e atualiza o saldo (e o custo médio, nas entradas).
 * `quantidade` já vem com sinal: positivo entra, negativo sai.
 */
async function movimentar(conexao, mov) {
  const delta = arredondar(mov.quantidade);
  if (!Number.isFinite(delta) || delta === 0) return null;
  if (!(mov.tipo in TIPOS)) throw new ErroEstoque('Tipo de movimentação inválido.');

  const [[produto]] = await conexao.query(
    'SELECT id, nome, unidade, estoque, custo FROM produtos WHERE id = ? FOR UPDATE',
    [mov.produto_id]
  );
  if (!produto) throw new ErroEstoque('Produto não encontrado.', 404);

  const anterior = arredondar(produto.estoque);
  const posterior = arredondar(anterior + delta);
  if (posterior < 0 && BLOQUEIA_NEGATIVO.includes(mov.tipo)) {
    throw new ErroEstoque(`Estoque insuficiente de "${produto.nome}": há ${anterior} ${produto.unidade || 'un'} e a saída é de ${-delta}.`);
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

  await conexao.query('UPDATE produtos SET estoque = ?, custo = ? WHERE id = ?', [posterior, custoProduto, produto.id]);
  const [resultado] = await conexao.query(
    `INSERT INTO movimentacoes_estoque
       (produto_id, tipo, quantidade, saldo_anterior, saldo_posterior, custo_unitario,
        documento, fornecedor_id, orcamento_id, administrador_id, observacao)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    [produto.id, mov.tipo, delta, anterior, posterior, custoMovimento,
      mov.documento || null, mov.fornecedor_id || null, mov.orcamento_id || null,
      mov.administrador_id || null, mov.observacao ? String(mov.observacao).slice(0, 255) : null]
  );
  return { id: resultado.insertId, produto_id: produto.id, nome: produto.nome, anterior, posterior, quantidade: delta };
}

/**
 * Deixa o estoque coerente com o pedido:
 *  - pedido "Concluído": a soma das baixas de cada produto = quantidade dos itens
 *  - qualquer outro status (ou pedido sendo excluído): nenhuma baixa
 * Lança só a diferença (venda ou estorno), então pode ser chamada quantas vezes quiser.
 */
async function sincronizarPedido(conexao, orcamentoId, administradorId, { excluindo = false } = {}) {
  const [[pedido]] = await conexao.query(
    'SELECT id, status, estoque_baixado, estoque_legado FROM orcamentos WHERE id = ?',
    [orcamentoId]
  );
  if (!pedido || pedido.estoque_legado) return { baixados: 0, estornados: 0 };

  const concluido = pedido.status === 'Concluído' && !excluindo;
  const [desejado] = concluido
    ? await conexao.query(
      `SELECT i.produto_id, SUM(i.quantidade) AS quantidade
       FROM itens_orcamento i JOIN produtos p ON p.id = i.produto_id
       WHERE i.orcamento_id = ? AND p.controla_estoque
       GROUP BY i.produto_id`, [orcamentoId])
    : [[]];
  const [atual] = await conexao.query(
    `SELECT produto_id, SUM(quantidade) AS quantidade FROM movimentacoes_estoque
     WHERE orcamento_id = ? AND tipo IN ('venda', 'estorno') GROUP BY produto_id`, [orcamentoId]
  );

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
    await conexao.query(
      `UPDATE orcamentos SET estoque_baixado = ?, concluido_em = ${concluido ? 'now()' : 'NULL'} WHERE id = ?`,
      [concluido, orcamentoId]
    );
  }
  return { baixados, estornados };
}

module.exports = { TIPOS, ErroEstoque, movimentar, sincronizarPedido, arredondar };
