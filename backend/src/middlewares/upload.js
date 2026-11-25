// backend/src/middlewares/upload.js
// Recebe a foto do produto em memória (campo "imagem") e deixa em req.file.
const multer = require('multer');
const AppError = require('../utils/AppError');

const TAMANHO_MAXIMO = 4 * 1024 * 1024; // a Vercel aceita no máximo 4,5 MB por requisição
const TIPOS_ACEITOS = /^image\/(jpeg|png|webp|gif)$/;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TAMANHO_MAXIMO },
  fileFilter: (req, file, cb) => cb(null, TIPOS_ACEITOS.test(file.mimetype)),
});

function receberImagem(req, res, next) {
  upload.single('imagem')(req, res, erro => {
    if (erro || !req.file) return next(new AppError('Envie uma imagem JPG, PNG, WEBP ou GIF de até 4 MB.'));
    return next();
  });
}

module.exports = { receberImagem };
