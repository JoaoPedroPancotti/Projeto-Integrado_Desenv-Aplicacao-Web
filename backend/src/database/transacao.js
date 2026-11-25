// backend/src/database/transacao.js
// Executa `fn(conexao)` entre BEGIN e COMMIT; qualquer erro faz ROLLBACK e é repassado.
const db = require('./conexao');

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

module.exports = { emTransacao };
