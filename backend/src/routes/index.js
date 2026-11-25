// backend/src/routes/index.js
// Todas as rotas da API, montadas em /api pelo app.js.
const { Router } = require('express');
const rotasSite = require('./site');
const rotasAdmin = require('./admin');

const router = Router();

// Health check (a Vercel e o README usam para conferir o deploy)
router.get('/', (req, res) => res.json({ status: 'ok', servico: 'API Comercial Pancotti' }));

router.use('/admin', rotasAdmin);
router.use('/', rotasSite);

module.exports = router;
