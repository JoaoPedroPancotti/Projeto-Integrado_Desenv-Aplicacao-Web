// backend/src/rotasAdmin.js
// Rotas do painel administrativo. Tudo aqui (menos o login) exige token.
const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const db = require('./db');
const { gerarToken, exigirLogin } = require('./auth');
const { salvarFoto } = require('./armazenamento');
const { sincronizarPedido, ErroEstoque } = require('./estoque');
const rotasEstoque = require('./rotasEstoque');

const router = express.Router();

const STATUS = ['Pendente', 'Em Andamento', 'Respondido', 'Aprovado', 'Concluído', 'Cancelado'];

// Códigos de erro do Postgres
const ERRO_DUPLICADO = '23505'; // valor único repetido

// O servidor do Supabase roda em UTC; "hoje" e "mês" são contados no horário de Brasília
const DIA_LOCAL = coluna => `(${coluna} AT TIME ZONE 'America/Sao_Paulo')::date`;
const HOJE = DIA_LOCAL('now()');
const INICIO_DO_MES = "(date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo')";

// Captura erros das rotas async e devolve 500 com a mensagem
const rota = fn => (req, res) => fn(req, res).catch(error => {
  if (error instanceof ErroEstoque) return res.status(error.status).json({ erro: error.message });
  console.error(error);
  res.status(500).json({ erro: error.message });
});

// Valor em dinheiro vindo do formulário: '' ou null viram NULL no banco
const valor = v => (v === '' || v === null || v === undefined ? null : Number(v));

// Orçamento com cliente e totais calculados a partir dos itens
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

function comTotal(orcamento) {
  const subtotal = orcamento.subtotal || 0;
  const total = subtotal + (orcamento.valor_frete || 0) - (orcamento.desconto || 0);
  return { ...orcamento, subtotal, total: Math.max(total, 0) };
}

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

// Baixa/estorno automático do estoque e registro no histórico do pedido
async function registrarEstoque(conexao, orcamentoId, administradorId, status) {
  const { baixados, estornados } = await sincronizarPedido(conexao, orcamentoId, administradorId);
  if (!baixados && !estornados) return;
  const partes = [];
  if (baixados) partes.push(`baixa de ${baixados} ${baixados === 1 ? 'produto' : 'produtos'}`);
  if (estornados) partes.push(`estorno de ${estornados} ${estornados === 1 ? 'produto' : 'produtos'}`);
  const atual = status || (await conexao.query('SELECT status FROM orcamentos WHERE id = ?', [orcamentoId]))[0][0]?.status;
  await conexao.query(
    'INSERT INTO orcamento_historico (orcamento_id, administrador_id, status, descricao) VALUES (?, ?, ?, ?)',
    [orcamentoId, administradorId, atual, `Estoque: ${partes.join(' e ')}`]
  );
}

// ==========================================
// LOGIN
// ==========================================

router.post('/login', rota(async (req, res) => {
  const { email, senha } = req.body;
  const [rows] = await db.query('SELECT * FROM administradores WHERE email = ? AND ativo', [(email || '').trim().toLowerCase()]);
  const admin = rows[0];
  if (!admin || !(await bcrypt.compare(senha || '', admin.senha_hash))) {
    return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
  }
  await db.query('UPDATE administradores SET ultimo_acesso = NOW() WHERE id = ?', [admin.id]);
  return res.json({ token: gerarToken(admin), admin: { id: admin.id, nome: admin.nome, email: admin.email } });
}));

router.use(exigirLogin);

router.get('/me', (req, res) => res.json(req.admin));

// ==========================================
// DASHBOARD
// ==========================================

router.get('/resumo', rota(async (req, res) => {
  const [porStatus] = await db.query('SELECT status, COUNT(*) AS total FROM orcamentos GROUP BY status');
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
  const [porDia] = await db.query(`
    SELECT to_char(${DIA_LOCAL('criado_em')}, 'YYYY-MM-DD') AS dia, COUNT(*) AS total
    FROM orcamentos WHERE ${DIA_LOCAL('criado_em')} > ${HOJE} - 14
    GROUP BY dia ORDER BY dia`);
  const [maisPedidos] = await db.query(`
    SELECT p.id, p.nome, p.imagem_url, COUNT(DISTINCT i.orcamento_id) AS pedidos, SUM(i.quantidade) AS quantidade
    FROM itens_orcamento i JOIN produtos p ON p.id = i.produto_id
    GROUP BY p.id ORDER BY pedidos DESC, quantidade DESC LIMIT 5`);
  const [recentes] = await db.query(`${SQL_ORCAMENTOS} ORDER BY o.criado_em DESC LIMIT 6`);
  const [fechadosMes] = await db.query(`${SQL_ORCAMENTOS}
    WHERE o.status IN ('Aprovado', 'Concluído')
      AND o.atualizado_em >= ${INICIO_DO_MES}`);

  return res.json({
    ...contagens,
    por_status: Object.fromEntries(STATUS.map(s => [s, porStatus.find(r => r.status === s)?.total || 0])),
    por_dia: porDia,
    mais_pedidos: maisPedidos,
    recentes: recentes.map(comTotal),
    vendido_mes: fechadosMes.map(comTotal).reduce((soma, o) => soma + o.total, 0),
  });
}));

// ==========================================
// PEDIDOS (ORÇAMENTOS)
// ==========================================

router.get('/orcamentos', rota(async (req, res) => {
  const { status, busca } = req.query;
  const filtros = [];
  const params = [];
  if (status) { filtros.push('o.status = ?'); params.push(status); }
  if (busca) {
    filtros.push('(c.nome ILIKE ? OR c.telefone ILIKE ? OR c.email ILIKE ? OR o.id = ?)');
    params.push(`%${busca}%`, `%${busca}%`, `%${busca}%`, Number(String(busca).replace(/\D/g, '')) || 0);
  }
  const where = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';
  const [rows] = await db.query(`${SQL_ORCAMENTOS} ${where} ORDER BY o.criado_em DESC LIMIT 500`, params);
  return res.json(rows.map(comTotal));
}));

router.get('/orcamentos/:id', rota(async (req, res) => {
  const [rows] = await db.query(`${SQL_ORCAMENTOS} WHERE o.id = ?`, [req.params.id]);
  if (!rows.length) return res.status(404).json({ erro: 'Pedido não encontrado.' });
  const [itens] = await db.query(`
    SELECT i.*, p.nome, p.codigo, p.imagem_url, p.unidade, p.preco AS preco_referencia,
           p.estoque, p.controla_estoque, p.localizacao
    FROM itens_orcamento i JOIN produtos p ON p.id = i.produto_id
    WHERE i.orcamento_id = ? ORDER BY i.id`, [req.params.id]);
  const [historico] = await db.query(`
    SELECT h.*, a.nome AS administrador_nome
    FROM orcamento_historico h LEFT JOIN administradores a ON a.id = h.administrador_id
    WHERE h.orcamento_id = ? ORDER BY h.criado_em DESC, h.id DESC`, [req.params.id]);
  return res.json({ ...comTotal(rows[0]), itens, historico });
}));

router.put('/orcamentos/:id', rota(async (req, res) => {
  const { id } = req.params;
  const { status, valor_frete, desconto, forma_pagamento, resposta, notas_internas, itens = [] } = req.body;
  if (status && !STATUS.includes(status)) return res.status(400).json({ erro: 'Status inválido.' });

  const conexao = await db.getConnection();
  try {
    await conexao.beginTransaction();
    const [[atual]] = await conexao.query('SELECT status FROM orcamentos WHERE id = ? FOR UPDATE', [id]);
    if (!atual) {
      await conexao.rollback();
      return res.status(404).json({ erro: 'Pedido não encontrado.' });
    }

    await conexao.query(
      `UPDATE orcamentos SET status = ?, valor_frete = ?, desconto = ?, forma_pagamento = ?, resposta = ?, notas_internas = ?
       WHERE id = ?`,
      [status || atual.status, valor(valor_frete), valor(desconto), forma_pagamento || null, resposta || null, notas_internas || null, id]
    );
    for (const item of itens) {
      await conexao.query(
        'UPDATE itens_orcamento SET preco_unitario = ?, quantidade = ? WHERE id = ? AND orcamento_id = ?',
        [valor(item.preco_unitario), Number(item.quantidade) || 1, item.id, id]
      );
    }

    const descricao = status && status !== atual.status
      ? `Status alterado de "${atual.status}" para "${status}"`
      : 'Valores e informações atualizados';
    await conexao.query(
      'INSERT INTO orcamento_historico (orcamento_id, administrador_id, status, descricao) VALUES (?, ?, ?, ?)',
      [id, req.admin.id, status || atual.status, descricao]
    );
    await registrarEstoque(conexao, id, req.admin.id, status || atual.status);

    await conexao.commit();
    return res.json({ mensagem: 'Pedido atualizado.' });
  } catch (error) {
    await conexao.rollback();
    throw error;
  } finally {
    conexao.release();
  }
}));

router.post('/orcamentos/:id/itens', rota(async (req, res) => {
  const { produto_id, quantidade } = req.body;
  const [[produto]] = await db.query('SELECT preco FROM produtos WHERE id = ?', [produto_id]);
  if (!produto) return res.status(404).json({ erro: 'Produto não encontrado.' });
  await emTransacao(async conexao => {
    await conexao.query(
      'INSERT INTO itens_orcamento (orcamento_id, produto_id, quantidade, preco_unitario) VALUES (?, ?, ?, ?)',
      [req.params.id, produto_id, Number(quantidade) || 1, produto.preco]
    );
    await registrarEstoque(conexao, req.params.id, req.admin.id);
  });
  return res.status(201).json({ mensagem: 'Item adicionado.' });
}));

router.delete('/orcamentos/:id/itens/:itemId', rota(async (req, res) => {
  await emTransacao(async conexao => {
    await conexao.query('DELETE FROM itens_orcamento WHERE id = ? AND orcamento_id = ?', [req.params.itemId, req.params.id]);
    await registrarEstoque(conexao, req.params.id, req.admin.id);
  });
  return res.json({ mensagem: 'Item removido.' });
}));

// Excluir um pedido concluído devolve ao estoque o que tinha sido baixado
router.delete('/orcamentos/:id', rota(async (req, res) => {
  const apagado = await emTransacao(async conexao => {
    await sincronizarPedido(conexao, req.params.id, req.admin.id, { excluindo: true });
    const [result] = await conexao.query('DELETE FROM orcamentos WHERE id = ?', [req.params.id]);
    return result.affectedRows;
  });
  if (!apagado) return res.status(404).json({ erro: 'Pedido não encontrado.' });
  return res.json({ mensagem: 'Pedido excluído.' });
}));

// ==========================================
// PRODUTOS, ESTOQUE, FORNECEDORES E RELATÓRIOS (rotasEstoque.js)
// ==========================================

router.use(rotasEstoque);

// Upload da foto do produto: vai para o Supabase Storage (ou backend/uploads) e devolve o endereço público
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 }, // a Vercel aceita no máximo 4,5 MB por requisição
  fileFilter: (req, file, cb) => cb(null, /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)),
});

router.post('/upload', (req, res) => {
  upload.single('imagem')(req, res, async erroUpload => {
    if (erroUpload || !req.file) return res.status(400).json({ erro: 'Envie uma imagem JPG, PNG, WEBP ou GIF de até 4 MB.' });
    try {
      return res.status(201).json({ url: await salvarFoto(req.file, req) });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ erro: error.message });
    }
  });
});

// ==========================================
// CATEGORIAS
// ==========================================

router.get('/categorias', rota(async (req, res) => {
  const [rows] = await db.query(`
    SELECT c.*, COUNT(p.id) AS produtos
    FROM categorias c LEFT JOIN produtos p ON p.categoria_id = c.id
    GROUP BY c.id ORDER BY c.nome`);
  return res.json(rows);
}));

router.post('/categorias', rota(async (req, res) => {
  const { nome, descricao } = req.body;
  if (!nome?.trim()) return res.status(400).json({ erro: 'Informe o nome da categoria.' });
  const [result] = await db.query('INSERT INTO categorias (nome, descricao) VALUES (?, ?) RETURNING id', [nome.trim(), descricao || null]);
  return res.status(201).json({ id: result.insertId, mensagem: 'Categoria criada.' });
}));

router.put('/categorias/:id', rota(async (req, res) => {
  const { nome, descricao } = req.body;
  if (!nome?.trim()) return res.status(400).json({ erro: 'Informe o nome da categoria.' });
  await db.query('UPDATE categorias SET nome = ?, descricao = ? WHERE id = ?', [nome.trim(), descricao || null, req.params.id]);
  return res.json({ mensagem: 'Categoria atualizada.' });
}));

router.delete('/categorias/:id', rota(async (req, res) => {
  await db.query('DELETE FROM categorias WHERE id = ?', [req.params.id]);
  return res.json({ mensagem: 'Categoria excluída. Os produtos dela ficaram sem categoria.' });
}));

// ==========================================
// CLIENTES
// ==========================================

router.get('/clientes', rota(async (req, res) => {
  const busca = req.query.busca ? `%${req.query.busca}%` : '%';
  const [rows] = await db.query(`
    SELECT c.*, COUNT(o.id) AS pedidos, MAX(o.criado_em) AS ultimo_pedido
    FROM clientes c LEFT JOIN orcamentos o ON o.cliente_id = c.id
    WHERE c.nome ILIKE ? OR c.telefone ILIKE ? OR c.email ILIKE ?
    GROUP BY c.id ORDER BY ultimo_pedido DESC NULLS LAST, c.nome LIMIT 500`, [busca, busca, busca]);
  return res.json(rows);
}));

router.get('/clientes/:id', rota(async (req, res) => {
  const [[cliente]] = await db.query('SELECT * FROM clientes WHERE id = ?', [req.params.id]);
  if (!cliente) return res.status(404).json({ erro: 'Cliente não encontrado.' });
  const [pedidos] = await db.query(`${SQL_ORCAMENTOS} WHERE o.cliente_id = ? ORDER BY o.criado_em DESC`, [req.params.id]);
  return res.json({ ...cliente, pedidos: pedidos.map(comTotal) });
}));

router.put('/clientes/:id', rota(async (req, res) => {
  const { nome, email, telefone } = req.body;
  if (!nome?.trim() || !telefone?.trim()) return res.status(400).json({ erro: 'Nome e telefone são obrigatórios.' });
  await db.query('UPDATE clientes SET nome = ?, email = ?, telefone = ? WHERE id = ?', [nome.trim(), email || '', telefone.trim(), req.params.id]);
  return res.json({ mensagem: 'Cliente atualizado.' });
}));

// Exclusão a pedido do cliente (LGPD): apaga também os pedidos dele
router.delete('/clientes/:id', rota(async (req, res) => {
  await db.query('DELETE FROM clientes WHERE id = ?', [req.params.id]);
  return res.json({ mensagem: 'Cliente e pedidos excluídos.' });
}));

// ==========================================
// USUÁRIOS DO PAINEL
// ==========================================

router.get('/usuarios', rota(async (req, res) => {
  const [rows] = await db.query('SELECT id, nome, email, ativo, ultimo_acesso, criado_em FROM administradores ORDER BY nome');
  return res.json(rows);
}));

router.post('/usuarios', rota(async (req, res) => {
  const { nome, email, senha } = req.body;
  if (!nome?.trim() || !email?.trim()) return res.status(400).json({ erro: 'Informe nome e e-mail.' });
  if (!senha || senha.length < 6) return res.status(400).json({ erro: 'A senha precisa ter pelo menos 6 caracteres.' });
  try {
    const [result] = await db.query(
      'INSERT INTO administradores (nome, email, senha_hash) VALUES (?, ?, ?) RETURNING id',
      [nome.trim(), email.trim().toLowerCase(), await bcrypt.hash(senha, 10)]
    );
    return res.status(201).json({ id: result.insertId, mensagem: 'Usuário criado.' });
  } catch (error) {
    if (error.code === ERRO_DUPLICADO) return res.status(409).json({ erro: 'Já existe um usuário com este e-mail.' });
    throw error;
  }
}));

router.put('/usuarios/:id', rota(async (req, res) => {
  const { nome, email, senha, ativo } = req.body;
  const id = Number(req.params.id);
  if (!nome?.trim() || !email?.trim()) return res.status(400).json({ erro: 'Informe nome e e-mail.' });
  if (id === req.admin.id && ativo === false) return res.status(400).json({ erro: 'Você não pode desativar o próprio acesso.' });
  if (senha && senha.length < 6) return res.status(400).json({ erro: 'A senha precisa ter pelo menos 6 caracteres.' });
  try {
    await db.query('UPDATE administradores SET nome = ?, email = ?, ativo = ? WHERE id = ?', [nome.trim(), email.trim().toLowerCase(), ativo !== false, id]);
  } catch (error) {
    if (error.code === ERRO_DUPLICADO) return res.status(409).json({ erro: 'Já existe um usuário com este e-mail.' });
    throw error;
  }
  if (senha) await db.query('UPDATE administradores SET senha_hash = ? WHERE id = ?', [await bcrypt.hash(senha, 10), id]);
  return res.json({ mensagem: 'Usuário atualizado.' });
}));

router.delete('/usuarios/:id', rota(async (req, res) => {
  if (Number(req.params.id) === req.admin.id) return res.status(400).json({ erro: 'Você não pode excluir o próprio acesso.' });
  await db.query('DELETE FROM administradores WHERE id = ?', [req.params.id]);
  return res.json({ mensagem: 'Usuário excluído.' });
}));

router.put('/minha-senha', rota(async (req, res) => {
  const { senha_atual, nova_senha } = req.body;
  const [[admin]] = await db.query('SELECT senha_hash FROM administradores WHERE id = ?', [req.admin.id]);
  if (!admin || !(await bcrypt.compare(senha_atual || '', admin.senha_hash))) {
    return res.status(400).json({ erro: 'A senha atual está incorreta.' });
  }
  if (!nova_senha || nova_senha.length < 6) return res.status(400).json({ erro: 'A nova senha precisa ter pelo menos 6 caracteres.' });
  await db.query('UPDATE administradores SET senha_hash = ? WHERE id = ?', [await bcrypt.hash(nova_senha, 10), req.admin.id]);
  return res.json({ mensagem: 'Senha alterada.' });
}));

module.exports = router;
