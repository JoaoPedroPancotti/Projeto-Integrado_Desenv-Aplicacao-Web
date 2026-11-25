// backend/src/repositories/administradores.js
// Usuários do painel. A senha nunca sai daqui em listagens (só o hash, quando preciso conferir).
const db = require('../database/conexao');

async function buscarAtivoPorEmail(email) {
  const [[admin]] = await db.query('SELECT * FROM administradores WHERE email = ? AND ativo', [email]);
  return admin || null;
}

async function registrarAcesso(id) {
  await db.query('UPDATE administradores SET ultimo_acesso = NOW() WHERE id = ?', [id]);
}

async function buscarHashSenha(id) {
  const [[admin]] = await db.query('SELECT senha_hash FROM administradores WHERE id = ?', [id]);
  return admin?.senha_hash ?? null;
}

async function atualizarSenha(id, senhaHash) {
  await db.query('UPDATE administradores SET senha_hash = ? WHERE id = ?', [senhaHash, id]);
}

async function listar() {
  const [rows] = await db.query('SELECT id, nome, email, ativo, ultimo_acesso, criado_em FROM administradores ORDER BY nome');
  return rows;
}

// E-mail repetido lança o erro 23505 do Postgres (tratado em middlewares/erros.js)
async function criar({ nome, email, senhaHash }) {
  const [resultado] = await db.query(
    'INSERT INTO administradores (nome, email, senha_hash) VALUES (?, ?, ?) RETURNING id',
    [nome, email, senhaHash]
  );
  return resultado.insertId;
}

async function atualizar(id, { nome, email, ativo }) {
  await db.query('UPDATE administradores SET nome = ?, email = ?, ativo = ? WHERE id = ?', [nome, email, ativo, id]);
}

async function excluir(id) {
  await db.query('DELETE FROM administradores WHERE id = ?', [id]);
}

module.exports = { buscarAtivoPorEmail, registrarAcesso, buscarHashSenha, atualizarSenha, listar, criar, atualizar, excluir };
