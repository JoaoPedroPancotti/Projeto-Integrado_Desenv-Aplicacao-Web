// backend/src/migrar.js
// Prepara o banco: cria as tabelas (sql/schema.sql), o catálogo inicial na
// primeira vez e o administrador padrão. Pode rodar quantas vezes quiser.
// Roda sozinho no "npm run dev" e manualmente com "npm run migrar".
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./db');
const { prepararArmazenamento } = require('./armazenamento');

const lerSql = arquivo => fs.readFileSync(path.join(__dirname, '..', 'sql', arquivo), 'utf8');

async function prepararBanco() {
  await db.pool.query(lerSql('schema.sql'));

  const [[{ categorias }]] = await db.query('SELECT COUNT(*) AS categorias FROM categorias');
  if (categorias === 0) {
    await db.pool.query(lerSql('dados-iniciais.sql'));
    console.log('   + catálogo inicial cadastrado');
  }

  const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM administradores');
  if (total === 0) {
    const email = process.env.ADMIN_EMAIL || 'admin@pancotti.com';
    const senha = process.env.ADMIN_SENHA || '123456';
    await db.query(
      'INSERT INTO administradores (nome, email, senha_hash) VALUES (?, ?, ?)',
      ['Administrador', email, await bcrypt.hash(senha, 10)]
    );
    console.log(`   + administrador padrão criado: ${email} (troque a senha no painel)`);
  }

  await prepararArmazenamento();
}

module.exports = prepararBanco;

if (require.main === module) {
  prepararBanco()
    .then(() => { console.log('Banco pronto.'); process.exit(0); })
    .catch(erro => { console.error('Erro na migração:', erro.message); process.exit(1); });
}
