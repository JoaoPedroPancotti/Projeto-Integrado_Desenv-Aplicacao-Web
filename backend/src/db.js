// backend/src/db.js
// Conexão com o PostgreSQL do Supabase (variável DATABASE_URL no .env).
const { Pool, types } = require('pg');
require('dotenv').config();

// COUNT e NUMERIC chegam do Postgres como texto: converte para número
types.setTypeParser(20, Number);   // bigint
types.setTypeParser(1700, Number); // numeric (preços e quantidades)

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL não definida no .env (veja backend/.env.example).');
}

const local = /@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL || '');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: local ? false : { rejectUnauthorized: false },
  // na Vercel cada função abre poucas conexões; o pooler do Supabase cuida do resto
  max: Number(process.env.DB_MAX_CONEXOES) || (process.env.VERCEL ? 3 : 10),
});

// As rotas usam "?" nos parâmetros e recebem [linhas] (estilo mysql2).
// Este adaptador mantém esse formato em cima do Postgres:
//   SELECT          -> [linhas]
//   INSERT/UPDATE/DELETE -> [{ affectedRows, insertId }]  (insertId vem do RETURNING id)
function converter(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

function formatar(resultado) {
  if (resultado.command === 'SELECT') return [resultado.rows];
  return [{ affectedRows: resultado.rowCount, insertId: resultado.rows[0]?.id, rows: resultado.rows }];
}

async function query(sql, params = []) {
  return formatar(await pool.query(converter(sql), params));
}

// Conexão exclusiva para transações (BEGIN/COMMIT)
async function getConnection() {
  const cliente = await pool.connect();
  return {
    query: async (sql, params = []) => formatar(await cliente.query(converter(sql), params)),
    beginTransaction: () => cliente.query('BEGIN'),
    commit: () => cliente.query('COMMIT'),
    rollback: () => cliente.query('ROLLBACK'),
    release: () => cliente.release(),
  };
}

if (!process.env.VERCEL) {
  pool.query('SELECT 1')
    .then(() => console.log('Conectado ao PostgreSQL com sucesso!'))
    .catch(err => console.error('Erro ao conectar ao PostgreSQL:', err.message));
}

module.exports = { query, getConnection, pool };
