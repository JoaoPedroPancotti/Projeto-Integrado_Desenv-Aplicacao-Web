// backend/src/database/conexao.js
// Conexão com o PostgreSQL do Supabase (variável DATABASE_URL no .env).
const { Pool, types } = require('pg');
require('../config/env');
const AppError = require('../utils/AppError');

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
//
// SEGURANÇA (SQL injection): todo valor vindo do usuário vai em `params` e chega ao
// PostgreSQL separado do texto da consulta ($1, $2...), então nunca é executado como SQL.
// O texto da consulta só pode conter trechos fixos do servidor (database/queries/*).

// Tipos aceitos como parâmetro. Objetos/arrays vindos do JSON da requisição são recusados
// para que nada chegue ao banco num formato inesperado.
const parametroAceito = valor => valor === null || valor === undefined || valor instanceof Date
  || ['string', 'number', 'boolean', 'bigint'].includes(typeof valor);

function converter(sql, params) {
  let i = 0;
  const texto = sql.replace(/\?/g, () => `$${++i}`);
  if (i !== params.length) {
    // erro de programação: a consulta e os valores não batem
    throw new Error(`Consulta com ${i} parâmetro(s) "?" recebeu ${params.length} valor(es).`);
  }
  if (!params.every(parametroAceito)) {
    throw new AppError('Algum dos valores enviados tem formato inválido.');
  }
  return texto;
}

function formatar(resultado) {
  if (resultado.command === 'SELECT') return [resultado.rows];
  return [{ affectedRows: resultado.rowCount, insertId: resultado.rows[0]?.id, rows: resultado.rows }];
}

async function query(sql, params = []) {
  return formatar(await pool.query(converter(sql, params), params));
}

// Conexão exclusiva para transações (BEGIN/COMMIT)
async function getConnection() {
  const cliente = await pool.connect();
  return {
    query: async (sql, params = []) => formatar(await cliente.query(converter(sql, params), params)),
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
