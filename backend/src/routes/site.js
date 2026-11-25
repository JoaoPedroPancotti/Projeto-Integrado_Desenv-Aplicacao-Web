// backend/src/routes/site.js
// Rotas públicas usadas pelo site: catálogo e envio do pedido de orçamento.
const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { exigirLogin } = require('../middlewares/auth');
const { validarIdDaRota } = require('../middlewares/validarParametros');
const catalogo = require('../controllers/catalogo');
const pedidos = require('../controllers/pedidos');

const router = Router();

router.param('id', validarIdDaRota);

// Catálogo
router.get('/produtos', asyncHandler(catalogo.listar));
router.get('/produtos/:id', asyncHandler(catalogo.detalhar));

// Legado (ver controllers/catalogo.js): escrita exige login
router.post('/produtos', exigirLogin, asyncHandler(catalogo.criarLegado));
router.put('/produtos/:id', exigirLogin, asyncHandler(catalogo.atualizarLegado));
router.delete('/produtos/:id', exigirLogin, asyncHandler(catalogo.excluirLegado));

// Checkout
router.post('/orcamentos', asyncHandler(pedidos.criarDoSite));

module.exports = router;
