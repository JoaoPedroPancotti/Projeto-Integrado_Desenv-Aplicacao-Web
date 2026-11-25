// backend/src/repositories/categorias.js
const db = require('../database/conexao');

async function listar() {
  const [rows] = await db.query(`
    SELECT c.*, COUNT(p.id) AS produtos
    FROM categorias c LEFT JOIN produtos p ON p.categoria_id = c.id
    GROUP BY c.id ORDER BY c.nome`);
  return rows;
}

async function criar({ nome, descricao }) {
  const [resultado] = await db.query('INSERT INTO categorias (nome, descricao) VALUES (?, ?) RETURNING id', [nome, descricao]);
  return resultado.insertId;
}

async function atualizar(id, { nome, descricao }) {
  await db.query('UPDATE categorias SET nome = ?, descricao = ? WHERE id = ?', [nome, descricao, id]);
}

// Os produtos da categoria ficam sem categoria (ON DELETE SET NULL)
async function excluir(id) {
  await db.query('DELETE FROM categorias WHERE id = ?', [id]);
}

module.exports = { listar, criar, atualizar, excluir };
