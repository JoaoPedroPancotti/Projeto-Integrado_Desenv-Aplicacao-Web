// backend/src/repositories/clientes.js
const db = require('../database/conexao');

const LIMITE_LISTAGEM = 500;

// busca = padrão ILIKE já escapado ('%' lista todos)
async function listar(busca) {
  const [rows] = await db.query(`
    SELECT c.*, COUNT(o.id) AS pedidos, MAX(o.criado_em) AS ultimo_pedido
    FROM clientes c LEFT JOIN orcamentos o ON o.cliente_id = c.id
    WHERE c.nome ILIKE ? OR c.telefone ILIKE ? OR c.email ILIKE ?
    GROUP BY c.id ORDER BY ultimo_pedido DESC NULLS LAST, c.nome LIMIT ${LIMITE_LISTAGEM}`, [busca, busca, busca]);
  return rows;
}

async function buscar(id) {
  const [[cliente]] = await db.query('SELECT * FROM clientes WHERE id = ?', [id]);
  return cliente || null;
}

async function atualizar(id, { nome, email, telefone }) {
  await db.query('UPDATE clientes SET nome = ?, email = ?, telefone = ? WHERE id = ?', [nome, email, telefone, id]);
}

// Apaga também os pedidos do cliente (ON DELETE CASCADE)
async function excluir(id) {
  await db.query('DELETE FROM clientes WHERE id = ?', [id]);
}

// ---------- Checkout do site (dentro de transação) ----------

// Cliente mais recente com o mesmo telefone, comparando só os dígitos
async function buscarIdPorTelefone(digitos, executor) {
  const [[cliente]] = await executor.query(
    "SELECT id FROM clientes WHERE regexp_replace(telefone, '[^0-9]', '', 'g') = ? ORDER BY id DESC LIMIT 1",
    [digitos]
  );
  return cliente?.id ?? null;
}

// Atualiza nome/telefone; o e-mail só muda se vier preenchido
async function atualizarContato(id, { nome, email, telefone }, executor) {
  await executor.query(
    'UPDATE clientes SET nome = ?, email = COALESCE(NULLIF(?, \'\'), email), telefone = ? WHERE id = ?',
    [nome, email, telefone, id]
  );
}

async function criar({ nome, email, telefone }, executor) {
  const [resultado] = await executor.query(
    'INSERT INTO clientes (nome, email, telefone) VALUES (?, ?, ?) RETURNING id',
    [nome, email, telefone]
  );
  return resultado.insertId;
}

module.exports = { listar, buscar, atualizar, excluir, buscarIdPorTelefone, atualizarContato, criar };
