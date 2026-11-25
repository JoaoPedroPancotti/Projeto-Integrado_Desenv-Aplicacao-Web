// backend/src/controllers/relatorios.js
const { gerarRelatorioEstoque } = require('../services/relatorios');

async function estoque(req, res) {
  return res.json(await gerarRelatorioEstoque(req.query.dias));
}

module.exports = { estoque };
