// backend/src/server.js
// Servidor local ("npm run dev" / "npm start"): prepara o banco e sobe na porta 3006.
// Na Vercel quem responde é api/index.js, que usa só o app (sem listen).
const app = require('./app');
const prepararBanco = require('./scripts/migrar');

const PORTA = process.env.PORT || 3006;

prepararBanco()
  .catch(erro => console.error('Erro ao preparar o banco:', erro.message))
  .finally(() => {
    app.listen(PORTA, () => console.log(`Servidor rodando na porta ${PORTA}`));
  });
