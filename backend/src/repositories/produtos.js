// backend/src/repositories/produtos.js
// Acesso à tabela produtos. Único lugar (com os demais repositories) que contém SQL.
//
// Convenção dos repositories:
//  - valores sempre como parâmetro ("?"), nunca interpolados no texto do SQL;
//  - o último argumento `executor` é a conexão da transação; sem ele, usa o pool.
const db = require('../database/conexao');
const { CAMPOS_PUBLICOS, SQL_PRODUTOS } = require('../database/queries/produtos');

// Colunas gravadas pelo cadastro do painel (mesma ordem de validators/produto.js)
const CAMPOS_CADASTRO = ['codigo', 'codigo_barras', 'categoria_id', 'fornecedor_id', 'nome', 'marca', 'descricao', 'preco', 'custo',
  'unidade', 'imagem_url', 'ativo', 'controla_estoque', 'estoque_minimo', 'estoque_maximo', 'localizacao'];

// ---------- Catálogo público ----------

async function listarPublicos() {
  const [rows] = await db.query(`SELECT ${CAMPOS_PUBLICOS} FROM produtos WHERE ativo ORDER BY nome`);
  return rows;
}

async function buscarPublico(id) {
  const [[produto]] = await db.query(`SELECT ${CAMPOS_PUBLICOS} FROM produtos WHERE id = ? AND ativo`, [id]);
  return produto || null;
}

// ---------- Painel ----------

async function listarCompletos() {
  const [rows] = await db.query(`${SQL_PRODUTOS} ORDER BY p.nome`);
  return rows;
}

async function buscarCompleto(id) {
  const [[produto]] = await db.query(`${SQL_PRODUTOS} WHERE p.id = ?`, [id]);
  return produto || null;
}

async function listarPorFornecedor(fornecedorId) {
  const [rows] = await db.query(`${SQL_PRODUTOS} WHERE p.fornecedor_id = ? ORDER BY p.nome`, [fornecedorId]);
  return rows;
}

// Pedidos ainda em negociação/entrega que contêm o produto
async function listarPedidosEmAberto(produtoId) {
  const [rows] = await db.query(`
    SELECT o.id, o.status, o.criado_em, c.nome AS cliente_nome, SUM(i.quantidade) AS quantidade
    FROM itens_orcamento i
    JOIN orcamentos o ON o.id = i.orcamento_id
    JOIN clientes c ON c.id = o.cliente_id
    WHERE i.produto_id = ? AND o.status IN ('Pendente', 'Em Andamento', 'Respondido', 'Aprovado')
    GROUP BY o.id, c.nome ORDER BY o.criado_em DESC`, [produtoId]);
  return rows;
}

async function criar(dados, executor = db) {
  const [resultado] = await executor.query(
    `INSERT INTO produtos (${CAMPOS_CADASTRO.join(', ')}) VALUES (${CAMPOS_CADASTRO.map(() => '?').join(', ')}) RETURNING id`,
    CAMPOS_CADASTRO.map(c => dados[c])
  );
  return resultado.insertId;
}

async function atualizar(id, dados) {
  const [resultado] = await db.query(
    `UPDATE produtos SET ${CAMPOS_CADASTRO.map(c => `${c} = ?`).join(', ')} WHERE id = ?`,
    [...CAMPOS_CADASTRO.map(c => dados[c]), id]
  );
  return resultado.affectedRows;
}

async function buscarCodigo(id) {
  const [[produto]] = await db.query('SELECT codigo FROM produtos WHERE id = ?', [id]);
  return produto?.codigo ?? null;
}

async function buscarPreco(id) {
  const [[produto]] = await db.query('SELECT preco FROM produtos WHERE id = ?', [id]);
  return produto || null;
}

async function alterarAtivo(id, ativo) {
  await db.query('UPDATE produtos SET ativo = ? WHERE id = ?', [ativo, id]);
}

// Lança erro do Postgres 23503 (ERRO_EM_USO) se o produto tiver pedidos ou movimentações
async function excluir(id) {
  const [resultado] = await db.query('DELETE FROM produtos WHERE id = ?', [id]);
  return resultado.affectedRows;
}

// ---------- Escrita simplificada (rotas legadas de /api/produtos) ----------

async function criarSimples({ categoria_id, nome, descricao, imagem_url }) {
  const [resultado] = await db.query(
    'INSERT INTO produtos (categoria_id, nome, descricao, imagem_url) VALUES (?, ?, ?, ?) RETURNING id',
    [categoria_id, nome, descricao, imagem_url]
  );
  return resultado.insertId;
}

async function atualizarSimples(id, { categoria_id, nome, descricao, imagem_url }) {
  const [resultado] = await db.query(
    'UPDATE produtos SET categoria_id = ?, nome = ?, descricao = ?, imagem_url = ? WHERE id = ?',
    [categoria_id, nome, descricao, imagem_url, id]
  );
  return resultado.affectedRows;
}

// ---------- Estoque (sempre dentro de transação) ----------

// Trava a linha do produto até o fim da transação (evita dois lançamentos simultâneos)
async function travarParaMovimentar(id, executor) {
  const [[produto]] = await executor.query(
    'SELECT id, nome, unidade, estoque, custo FROM produtos WHERE id = ? FOR UPDATE',
    [id]
  );
  return produto || null;
}

async function travarSaldo(id, executor) {
  const [[produto]] = await executor.query('SELECT estoque FROM produtos WHERE id = ? FOR UPDATE', [id]);
  return produto || null;
}

async function atualizarSaldoECusto(id, estoque, custo, executor) {
  await executor.query('UPDATE produtos SET estoque = ?, custo = ? WHERE id = ?', [estoque, custo, id]);
}

async function atualizarPreco(id, preco, executor) {
  await executor.query('UPDATE produtos SET preco = ? WHERE id = ?', [preco, id]);
}

// Define o fornecedor só se o produto ainda não tiver um
async function definirFornecedorSeVazio(id, fornecedorId, executor) {
  await executor.query('UPDATE produtos SET fornecedor_id = COALESCE(fornecedor_id, ?) WHERE id = ?', [fornecedorId, id]);
}

module.exports = {
  CAMPOS_CADASTRO,
  listarPublicos,
  buscarPublico,
  listarCompletos,
  buscarCompleto,
  listarPorFornecedor,
  listarPedidosEmAberto,
  criar,
  atualizar,
  buscarCodigo,
  buscarPreco,
  alterarAtivo,
  excluir,
  criarSimples,
  atualizarSimples,
  travarParaMovimentar,
  travarSaldo,
  atualizarSaldoECusto,
  atualizarPreco,
  definirFornecedorSeVazio,
};
