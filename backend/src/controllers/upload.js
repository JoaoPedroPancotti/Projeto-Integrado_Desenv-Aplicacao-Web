// backend/src/controllers/upload.js
// Foto do produto (já validada pelo middlewares/upload.js): grava e devolve o endereço público.
const { salvarFoto } = require('../services/armazenamento');

async function enviarImagem(req, res) {
  return res.status(201).json({ url: await salvarFoto(req.file, req) });
}

module.exports = { enviarImagem };
