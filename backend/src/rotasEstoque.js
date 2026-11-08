// backend/src/rotasEstoque.js
// Produtos, estoque (movimentações, entrada de nota, inventário), fornecedores e relatórios.
// Montado dentro de rotasAdmin, depois do exigirLogin: tudo aqui exige token.
const express = require('express');
const db = require('./db');
const { TIPOS, ErroEstoque, movimentar, arredondar } = require('./estoque');

const router = express.Router();

const ERRO_EM_USO = '23503';
const ERRO_DUPLICADO = '23505';

const rota = fn => (req, res) => fn(req, res).catch(error => {
  if (error instanceof ErroEstoque) return res.status(error.status).json({ erro: error.message });
  if (error.code === ERRO_DUPLICADO && /codigo_barras/.test(error.constraint || '')) {
    return res.status(409).json({ erro: 'Já existe um produto com este código de barras.' });
  }
  if (error.code === ERRO_DUPLICADO && /codigo/.test(error.constraint || '')) {
    return res.status(409).json({ erro: 'Já existe um produto com este código.' });
  }
  console.error(error);
  return res.status(500).json({ erro: error.message });
});

const numero = v => (v === '' || v === null || v === undefined ? null : Number(String(v).replace(',', '.')));
const texto = v => (v === null || v === undefined || String(v).trim() === '' ? null : String(v).trim());

// Transação com BEGIN/COMMIT e devolução da conexão
async function emTransacao(fn) {
  const conexao = await db.getConnection();
  try {
    await conexao.beginTransaction();
    const resultado = await fn(conexao);
    await conexao.commit();
    return resultado;
  } catch (error) {
    await conexao.rollback();
    throw error;
  } finally {
    conexao.release();
  }
}

// Quantidade reservada = itens de pedidos aprovados que ainda não foram entregues
const SQL_RESERVADO = `
  SELECT i.produto_id, SUM(i.quantidade) AS reservado
  FROM itens_orcamento i JOIN orcamentos o ON o.id = i.orcamento_id
  WHERE o.status = 'Aprovado' GROUP BY i.produto_id`;

const SQL_PRODUTOS = `
  SELECT p.*, c.nome AS categoria_nome, f.nome AS fornecedor_nome, f.telefone AS fornecedor_telefone,
         COALESCE(r.reservado, 0) AS reservado,
         p.estoque - COALESCE(r.reservado, 0) AS disponivel,
         (SELECT COUNT(DISTINCT orcamento_id) FROM itens_orcamento WHERE produto_id = p.id) AS pedidos,
         (SELECT MAX(criado_em) FROM movimentacoes_estoque WHERE produto_id = p.id) AS ultima_movimentacao
  FROM produtos p
  LEFT JOIN categorias c ON c.id = p.categoria_id
  LEFT JOIN fornecedores f ON f.id = p.fornecedor_id
  LEFT JOIN (${SQL_RESERVADO}) r ON r.produto_id = p.id`;

// ==========================================
// PRODUTOS
// ==========================================

router.get('/produtos', rota(async (req, res) => {
  const [rows] = await db.query(`${SQL_PRODUTOS} ORDER BY p.nome`);
  return res.json(rows);
}));

router.get('/produtos/:id', rota(async (req, res) => {
  const [[produto]] = await db.query(`${SQL_PRODUTOS} WHERE p.id = ?`, [req.params.id]);
  if (!produto) return res.status(404).json({ erro: 'Produto não encontrado.' });

  const [movimentacoes] = await db.query(`
    SELECT m.*, a.nome AS administrador_nome, f.nome AS fornecedor_nome
    FROM movimentacoes_estoque m
    LEFT JOIN administradores a ON a.id = m.administrador_id
    LEFT JOIN fornecedores f ON f.id = m.fornecedor_id
    WHERE m.produto_id = ? ORDER BY m.criado_em DESC, m.id DESC LIMIT 300`, [req.params.id]);

  const [pedidosAbertos] = await db.query(`
    SELECT o.id, o.status, o.criado_em, c.nome AS cliente_nome, SUM(i.quantidade) AS quantidade
    FROM itens_orcamento i
    JOIN orcamentos o ON o.id = i.orcamento_id
    JOIN clientes c ON c.id = o.cliente_id
    WHERE i.produto_id = ? AND o.status IN ('Pendente', 'Em Andamento', 'Respondido', 'Aprovado')
    GROUP BY o.id, c.nome ORDER BY o.criado_em DESC`, [req.params.id]);

  const [[giro]] = await db.query(`
    SELECT COALESCE(-SUM(quantidade) FILTER (WHERE tipo IN ('venda', 'estorno')), 0) AS vendido_90d,
           COALESCE(SUM(quantidade) FILTER (WHERE tipo = 'entrada'), 0) AS comprado_90d,
           COALESCE(-SUM(quantidade) FILTER (WHERE tipo = 'perda'), 0) AS perdas_90d
    FROM movimentacoes_estoque WHERE produto_id = ? AND criado_em >= now() - interval '90 days'`, [req.params.id]);

  return res.json({ ...produto, movimentacoes, pedidos_abertos: pedidosAbertos, giro });
}));

function dadosProduto(body) {
  return {
    codigo: texto(body.codigo)?.toUpperCase() || null,
    codigo_barras: texto(body.codigo_barras),
    categoria_id: body.categoria_id || null,
    fornecedor_id: body.fornecedor_id || null,
    nome: String(body.nome || '').trim(),
    marca: texto(body.marca),
    descricao: texto(body.descricao),
    preco: numero(body.preco),
    custo: numero(body.custo),
    unidade: texto(body.unidade),
    imagem_url: texto(body.imagem_url),
    ativo: !(body.ativo === false || body.ativo === 0),
    controla_estoque: !(body.controla_estoque === false || body.controla_estoque === 0),
    estoque_minimo: numero(body.estoque_minimo),
    estoque_maximo: numero(body.estoque_maximo),
    localizacao: texto(body.localizacao),
  };
}

function validarProduto(d) {
  if (!d.nome) return 'Informe o nome do produto.';
  if (d.preco !== null && (Number.isNaN(d.preco) || d.preco < 0)) return 'Preço inválido.';
  if (d.custo !== null && (Number.isNaN(d.custo) || d.custo < 0)) return 'Custo inválido.';
  if (d.estoque_minimo !== null && d.estoque_maximo !== null && d.estoque_maximo < d.estoque_minimo) {
    return 'O estoque máximo não pode ser menor que o mínimo.';
  }
  return null;
}

const CAMPOS = ['codigo', 'codigo_barras', 'categoria_id', 'fornecedor_id', 'nome', 'marca', 'descricao', 'preco', 'custo',
  'unidade', 'imagem_url', 'ativo', 'controla_estoque', 'estoque_minimo', 'estoque_maximo', 'localizacao'];

router.post('/produtos', rota(async (req, res) => {
  const dados = dadosProduto(req.body);
  const invalido = validarProduto(dados);
  if (invalido) return res.status(400).json({ erro: invalido });
  const inicial = numero(req.body.estoque_inicial);
  if (inicial !== null && (Number.isNaN(inicial) || inicial < 0)) return res.status(400).json({ erro: 'Estoque inicial inválido.' });

  const id = await emTransacao(async conexao => {
    const [result] = await conexao.query(
      `INSERT INTO produtos (${CAMPOS.join(', ')}) VALUES (${CAMPOS.map(() => '?').join(', ')}) RETURNING id`,
      CAMPOS.map(c => dados[c])
    );
    if (inicial) {
      await movimentar(conexao, {
        produto_id: result.insertId, tipo: 'entrada', quantidade: inicial, custo_unitario: dados.custo,
        administrador_id: req.admin.id, observacao: 'Estoque inicial no cadastro',
      });
    }
    return result.insertId;
  });
  const [[produto]] = await db.query('SELECT codigo FROM produtos WHERE id = ?', [id]);
  return res.status(201).json({ id, codigo: produto.codigo, mensagem: 'Produto criado.' });
}));

// O saldo não é editado aqui: só por movimentação (entrada, saída, ajuste, inventário)
router.put('/produtos/:id', rota(async (req, res) => {
  const dados = dadosProduto(req.body);
  const invalido = validarProduto(dados);
  if (invalido) return res.status(400).json({ erro: invalido });
  const [result] = await db.query(
    `UPDATE produtos SET ${CAMPOS.map(c => `${c} = ?`).join(', ')} WHERE id = ?`,
    [...CAMPOS.map(c => dados[c]), req.params.id]
  );
  if (!result.affectedRows) return res.status(404).json({ erro: 'Produto não encontrado.' });
  return res.json({ mensagem: 'Produto atualizado.' });
}));

// Ligar/desligar no site sem reenviar o cadastro inteiro
router.patch('/produtos/:id/ativo', rota(async (req, res) => {
  await db.query('UPDATE produtos SET ativo = ? WHERE id = ?', [Boolean(req.body.ativo), req.params.id]);
  return res.json({ mensagem: 'Produto atualizado.' });
}));

router.delete('/produtos/:id', rota(async (req, res) => {
  try {
    await db.query('DELETE FROM produtos WHERE id = ?', [req.params.id]);
    return res.json({ mensagem: 'Produto excluído.' });
  } catch (error) {
    if (error.code === ERRO_EM_USO) {
      return res.status(409).json({ erro: 'Este produto já tem pedidos ou movimentações de estoque e não pode ser excluído. Desative-o para tirar do site.' });
    }
    throw error;
  }
}));

// ==========================================
// ESTOQUE
// ==========================================

router.get('/estoque/resumo', rota(async (req, res) => {
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
  return res.json(resumo);
}));

router.get('/estoque/movimentacoes', rota(async (req, res) => {
  const { tipo, produto_id: produtoId, fornecedor_id: fornecedorId, de, ate, busca } = req.query;
  const filtros = [];
  const params = [];
  if (tipo) { filtros.push('m.tipo = ?'); params.push(tipo); }
  if (produtoId) { filtros.push('m.produto_id = ?'); params.push(produtoId); }
  if (fornecedorId) { filtros.push('m.fornecedor_id = ?'); params.push(fornecedorId); }
  if (de) { filtros.push("m.criado_em >= (?::date AT TIME ZONE 'America/Sao_Paulo')"); params.push(de); }
  if (ate) { filtros.push("m.criado_em < ((?::date + 1) AT TIME ZONE 'America/Sao_Paulo')"); params.push(ate); }
  if (busca) {
    filtros.push('(p.nome ILIKE ? OR p.codigo ILIKE ? OR p.codigo_barras ILIKE ? OR m.documento ILIKE ? OR m.observacao ILIKE ?)');
    params.push(...Array(5).fill(`%${busca}%`));
  }
  const where = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';
  const [rows] = await db.query(`
    SELECT m.*, p.nome AS produto_nome, p.codigo AS produto_codigo, p.unidade, p.imagem_url,
           a.nome AS administrador_nome, f.nome AS fornecedor_nome
    FROM movimentacoes_estoque m
    JOIN produtos p ON p.id = m.produto_id
    LEFT JOIN administradores a ON a.id = m.administrador_id
    LEFT JOIN fornecedores f ON f.id = m.fornecedor_id
    ${where}
    ORDER BY m.criado_em DESC, m.id DESC LIMIT 1000`, params);
  return res.json(rows);
}));

// Movimentação avulsa de um produto
router.post('/estoque/movimentacoes', rota(async (req, res) => {
  const { produto_id: produtoId, tipo, documento, fornecedor_id: fornecedorId, observacao } = req.body;
  if (!produtoId) return res.status(400).json({ erro: 'Escolha o produto.' });
  if (!(tipo in TIPOS) || ['venda', 'estorno', 'inventario'].includes(tipo)) {
    return res.status(400).json({ erro: 'Tipo de movimentação inválido.' });
  }

  const resultado = await emTransacao(async conexao => {
    let quantidade;
    if (tipo === 'ajuste') {
      // No ajuste a pessoa informa o saldo correto; o sistema lança a diferença
      const novoSaldo = numero(req.body.novo_saldo);
      if (novoSaldo === null || Number.isNaN(novoSaldo)) throw new ErroEstoque('Informe o saldo correto.');
      if (!texto(observacao)) throw new ErroEstoque('Informe o motivo do ajuste.');
      const [[produto]] = await conexao.query('SELECT estoque FROM produtos WHERE id = ? FOR UPDATE', [produtoId]);
      if (!produto) throw new ErroEstoque('Produto não encontrado.', 404);
      quantidade = arredondar(novoSaldo - produto.estoque);
      if (!quantidade) throw new ErroEstoque('O saldo informado é igual ao atual.');
    } else {
      const qtd = numero(req.body.quantidade);
      if (!qtd || Number.isNaN(qtd) || qtd <= 0) throw new ErroEstoque('Informe uma quantidade maior que zero.');
      if (tipo === 'perda' && !texto(observacao)) throw new ErroEstoque('Informe o motivo da perda.');
      quantidade = qtd * TIPOS[tipo];
    }
    return movimentar(conexao, {
      produto_id: produtoId, tipo, quantidade,
      custo_unitario: tipo === 'entrada' ? numero(req.body.custo_unitario) : null,
      documento: texto(documento), fornecedor_id: fornecedorId || null,
      administrador_id: req.admin.id, observacao: texto(observacao),
    });
  });
  return res.status(201).json({ mensagem: 'Movimentação registrada.', ...resultado });
}));

// Entrada de mercadoria: vários produtos de uma nota fiscal, numa transação só
router.post('/estoque/entrada', rota(async (req, res) => {
  const { fornecedor_id: fornecedorId, documento, observacao, itens = [] } = req.body;
  const linhas = itens
    .map(i => ({ produto_id: Number(i.produto_id), quantidade: numero(i.quantidade), custo: numero(i.custo_unitario), preco: numero(i.preco_venda) }))
    .filter(i => i.produto_id);
  if (!linhas.length) return res.status(400).json({ erro: 'Adicione pelo menos um produto.' });
  if (linhas.some(i => !i.quantidade || Number.isNaN(i.quantidade) || i.quantidade <= 0)) {
    return res.status(400).json({ erro: 'Todas as quantidades precisam ser maiores que zero.' });
  }
  if (linhas.some(i => (i.custo !== null && (Number.isNaN(i.custo) || i.custo < 0)) || (i.preco !== null && (Number.isNaN(i.preco) || i.preco < 0)))) {
    return res.status(400).json({ erro: 'Há custo ou preço inválido na nota.' });
  }

  const lancados = await emTransacao(async conexao => {
    const feitos = [];
    // ordem fixa evita travamento com outra entrada simultânea
    for (const linha of [...linhas].sort((a, b) => a.produto_id - b.produto_id)) {
      feitos.push(await movimentar(conexao, {
        produto_id: linha.produto_id, tipo: 'entrada', quantidade: linha.quantidade, custo_unitario: linha.custo,
        documento: texto(documento), fornecedor_id: fornecedorId || null,
        administrador_id: req.admin.id, observacao: texto(observacao) || 'Entrada de mercadoria',
      }));
      if (linha.preco !== null) await conexao.query('UPDATE produtos SET preco = ? WHERE id = ?', [linha.preco, linha.produto_id]);
      if (fornecedorId) await conexao.query('UPDATE produtos SET fornecedor_id = COALESCE(fornecedor_id, ?) WHERE id = ?', [fornecedorId, linha.produto_id]);
    }
    return feitos;
  });
  return res.status(201).json({ mensagem: `Entrada registrada: ${lancados.length} ${lancados.length === 1 ? 'produto' : 'produtos'}.`, itens: lancados });
}));

// Inventário: recebe o que foi contado e lança a diferença de cada produto
router.post('/estoque/inventario', rota(async (req, res) => {
  const { observacao, itens = [] } = req.body;
  const contagens = itens
    .map(i => ({ produto_id: Number(i.produto_id), contado: numero(i.contado) }))
    .filter(i => i.produto_id && i.contado !== null);
  if (!contagens.length) return res.status(400).json({ erro: 'Nenhuma contagem informada.' });
  if (contagens.some(i => Number.isNaN(i.contado) || i.contado < 0)) return res.status(400).json({ erro: 'Há quantidade contada inválida.' });

  const resultado = await emTransacao(async conexao => {
    let ajustados = 0;
    for (const item of contagens.sort((a, b) => a.produto_id - b.produto_id)) {
      const [[produto]] = await conexao.query('SELECT estoque FROM produtos WHERE id = ? FOR UPDATE', [item.produto_id]);
      if (!produto) continue;
      const diferenca = arredondar(item.contado - produto.estoque);
      if (!diferenca) continue;
      await movimentar(conexao, {
        produto_id: item.produto_id, tipo: 'inventario', quantidade: diferenca,
        administrador_id: req.admin.id, observacao: texto(observacao) || 'Contagem de inventário',
      });
      ajustados += 1;
    }
    return { conferidos: contagens.length, ajustados };
  });
  return res.status(201).json({
    mensagem: `Inventário aplicado: ${resultado.conferidos} conferidos, ${resultado.ajustados} com diferença ajustada.`,
    ...resultado,
  });
}));

// ==========================================
// RELATÓRIOS
// ==========================================

router.get('/estoque/relatorios', rota(async (req, res) => {
  const dias = Math.min(Math.max(Number(req.query.dias) || 90, 7), 730);

  // Reposição: disponível (saldo - reservado) no mínimo ou abaixo
  const [reposicao] = await db.query(`
    SELECT * FROM (${SQL_PRODUTOS}) x
    WHERE x.ativo AND x.controla_estoque AND x.estoque_minimo IS NOT NULL AND x.disponivel <= x.estoque_minimo
    ORDER BY x.fornecedor_nome NULLS LAST, x.nome`);

  // Curva ABC pelo faturamento dos pedidos concluídos no período
  const [vendas] = await db.query(`
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
  const totalFaturado = vendas.reduce((s, v) => s + v.faturamento, 0);
  let acumulado = 0;
  const curvaAbc = vendas.map(v => {
    acumulado += v.faturamento;
    const pct = totalFaturado ? (acumulado / totalFaturado) * 100 : 100;
    return {
      ...v,
      participacao: totalFaturado ? (v.faturamento / totalFaturado) * 100 : 0,
      acumulado: pct,
      classe: pct <= 80 ? 'A' : pct <= 95 ? 'B' : 'C',
    };
  });

  // Parados: têm saldo, mas nenhuma saída no período
  const [parados] = await db.query(`
    SELECT p.id, p.codigo, p.nome, p.unidade, p.estoque, p.custo, p.localizacao, c.nome AS categoria_nome,
           p.estoque * COALESCE(p.custo, 0) AS valor_parado,
           (SELECT MAX(criado_em) FROM movimentacoes_estoque m WHERE m.produto_id = p.id AND m.quantidade < 0 AND m.tipo IN ('venda', 'saida', 'perda')) AS ultima_saida
    FROM produtos p LEFT JOIN categorias c ON c.id = p.categoria_id
    WHERE p.controla_estoque AND p.estoque > 0
      AND NOT EXISTS (SELECT 1 FROM movimentacoes_estoque m
                      WHERE m.produto_id = p.id AND m.quantidade < 0 AND m.tipo IN ('venda', 'saida', 'perda')
                        AND m.criado_em >= now() - make_interval(days => ?::int))
    ORDER BY valor_parado DESC, p.nome`, [dias]);

  // Valor do estoque por categoria
  const [porCategoria] = await db.query(`
    SELECT COALESCE(c.nome, 'Sem categoria') AS categoria, COUNT(p.id) AS produtos,
           COALESCE(SUM(p.estoque * p.custo) FILTER (WHERE p.estoque > 0), 0) AS valor_custo,
           COALESCE(SUM(p.estoque * p.preco) FILTER (WHERE p.estoque > 0), 0) AS valor_venda
    FROM produtos p LEFT JOIN categorias c ON c.id = p.categoria_id
    WHERE p.controla_estoque
    GROUP BY c.nome ORDER BY valor_custo DESC`);

  // Resultado do período: custo das mercadorias vendidas (pelo custo médio na hora da baixa) e perdas
  const [[resultado]] = await db.query(`
    SELECT
      COALESCE(-SUM(quantidade * COALESCE(custo_unitario, 0)) FILTER (WHERE tipo IN ('venda', 'estorno')), 0) AS cmv,
      COALESCE(-SUM(quantidade * COALESCE(custo_unitario, 0)) FILTER (WHERE tipo = 'perda'), 0) AS perdas,
      COALESCE(SUM(quantidade * COALESCE(custo_unitario, 0)) FILTER (WHERE tipo = 'entrada'), 0) AS compras,
      COALESCE(SUM(quantidade * COALESCE(custo_unitario, 0)) FILTER (WHERE tipo IN ('inventario', 'ajuste')), 0) AS ajustes
    FROM movimentacoes_estoque WHERE criado_em >= now() - make_interval(days => ?::int)`, [dias]);

  return res.json({
    dias,
    reposicao,
    curva_abc: curvaAbc,
    parados,
    por_categoria: porCategoria,
    resultado: { ...resultado, faturamento: totalFaturado, lucro_bruto: totalFaturado - resultado.cmv },
  });
}));

// ==========================================
// FORNECEDORES
// ==========================================

router.get('/fornecedores', rota(async (req, res) => {
  const [rows] = await db.query(`
    SELECT f.*,
           (SELECT COUNT(*) FROM produtos p WHERE p.fornecedor_id = f.id) AS produtos,
           (SELECT MAX(criado_em) FROM movimentacoes_estoque m WHERE m.fornecedor_id = f.id AND m.tipo = 'entrada') AS ultima_compra,
           (SELECT COALESCE(SUM(quantidade * COALESCE(custo_unitario, 0)), 0) FROM movimentacoes_estoque m
             WHERE m.fornecedor_id = f.id AND m.tipo = 'entrada' AND m.criado_em >= now() - interval '365 days') AS comprado_12m
    FROM fornecedores f ORDER BY f.ativo DESC, f.nome`);
  return res.json(rows);
}));

router.get('/fornecedores/:id', rota(async (req, res) => {
  const [[fornecedor]] = await db.query('SELECT * FROM fornecedores WHERE id = ?', [req.params.id]);
  if (!fornecedor) return res.status(404).json({ erro: 'Fornecedor não encontrado.' });
  const [produtos] = await db.query(`${SQL_PRODUTOS} WHERE p.fornecedor_id = ? ORDER BY p.nome`, [req.params.id]);
  const [compras] = await db.query(`
    SELECT m.documento, MIN(m.criado_em) AS data, COUNT(*) AS itens, SUM(m.quantidade * COALESCE(m.custo_unitario, 0)) AS valor
    FROM movimentacoes_estoque m
    WHERE m.fornecedor_id = ? AND m.tipo = 'entrada'
    GROUP BY m.documento, date_trunc('minute', m.criado_em)
    ORDER BY data DESC LIMIT 50`, [req.params.id]);
  return res.json({ ...fornecedor, produtos, compras });
}));

function dadosFornecedor(body) {
  return [
    String(body.nome || '').trim(), texto(body.cnpj), texto(body.telefone), texto(body.email)?.toLowerCase() || null,
    texto(body.contato), texto(body.endereco), numero(body.prazo_entrega_dias), texto(body.observacoes),
    !(body.ativo === false || body.ativo === 0),
  ];
}

router.post('/fornecedores', rota(async (req, res) => {
  if (!req.body.nome?.trim()) return res.status(400).json({ erro: 'Informe o nome do fornecedor.' });
  const [result] = await db.query(
    `INSERT INTO fornecedores (nome, cnpj, telefone, email, contato, endereco, prazo_entrega_dias, observacoes, ativo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`, dadosFornecedor(req.body));
  return res.status(201).json({ id: result.insertId, mensagem: 'Fornecedor cadastrado.' });
}));

router.put('/fornecedores/:id', rota(async (req, res) => {
  if (!req.body.nome?.trim()) return res.status(400).json({ erro: 'Informe o nome do fornecedor.' });
  const [result] = await db.query(
    `UPDATE fornecedores SET nome = ?, cnpj = ?, telefone = ?, email = ?, contato = ?, endereco = ?,
       prazo_entrega_dias = ?, observacoes = ?, ativo = ? WHERE id = ?`,
    [...dadosFornecedor(req.body), req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ erro: 'Fornecedor não encontrado.' });
  return res.json({ mensagem: 'Fornecedor atualizado.' });
}));

router.delete('/fornecedores/:id', rota(async (req, res) => {
  await db.query('DELETE FROM fornecedores WHERE id = ?', [req.params.id]);
  return res.json({ mensagem: 'Fornecedor excluído. Os produtos e o histórico de compras foram mantidos.' });
}));

module.exports = router;
