// backend/src/routes/admin.js
// Rotas do painel administrativo (/api/admin). Tudo, menos o login, exige token.
const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { exigirLogin } = require('../middlewares/auth');
const { receberImagem } = require('../middlewares/upload');
const { validarIdDaRota } = require('../middlewares/validarParametros');

const autenticacao = require('../controllers/autenticacao');
const dashboard = require('../controllers/dashboard');
const pedidos = require('../controllers/pedidos');
const produtos = require('../controllers/produtos');
const estoque = require('../controllers/estoque');
const relatorios = require('../controllers/relatorios');
const fornecedores = require('../controllers/fornecedores');
const categorias = require('../controllers/categorias');
const clientes = require('../controllers/clientes');
const usuarios = require('../controllers/usuarios');
const upload = require('../controllers/upload');

const router = Router();

// :id e :itemId precisam ser inteiros positivos (senão 400, antes de tocar no banco)
router.param('id', validarIdDaRota);
router.param('itemId', validarIdDaRota);

// Acesso
router.post('/login', asyncHandler(autenticacao.login));
router.use(exigirLogin);
router.get('/me', autenticacao.perfil);
router.put('/minha-senha', asyncHandler(autenticacao.alterarMinhaSenha));

// Dashboard
router.get('/resumo', asyncHandler(dashboard.resumo));

// Pedidos (orçamentos)
router.get('/orcamentos', asyncHandler(pedidos.listar));
router.get('/orcamentos/:id', asyncHandler(pedidos.detalhar));
router.put('/orcamentos/:id', asyncHandler(pedidos.atualizar));
router.delete('/orcamentos/:id', asyncHandler(pedidos.excluir));
router.post('/orcamentos/:id/itens', asyncHandler(pedidos.adicionarItem));
router.delete('/orcamentos/:id/itens/:itemId', asyncHandler(pedidos.removerItem));

// Produtos
router.get('/produtos', asyncHandler(produtos.listar));
router.get('/produtos/:id', asyncHandler(produtos.detalhar));
router.post('/produtos', asyncHandler(produtos.criar));
router.put('/produtos/:id', asyncHandler(produtos.atualizar));
router.patch('/produtos/:id/ativo', asyncHandler(produtos.alterarAtivo));
router.delete('/produtos/:id', asyncHandler(produtos.excluir));
router.post('/upload', receberImagem, asyncHandler(upload.enviarImagem));

// Estoque
router.get('/estoque/resumo', asyncHandler(estoque.resumo));
router.get('/estoque/movimentacoes', asyncHandler(estoque.listarMovimentacoes));
router.post('/estoque/movimentacoes', asyncHandler(estoque.registrarMovimentacao));
router.post('/estoque/entrada', asyncHandler(estoque.registrarEntrada));
router.post('/estoque/inventario', asyncHandler(estoque.aplicarInventario));
router.get('/estoque/relatorios', asyncHandler(relatorios.estoque));

// Fornecedores
router.get('/fornecedores', asyncHandler(fornecedores.listar));
router.get('/fornecedores/:id', asyncHandler(fornecedores.detalhar));
router.post('/fornecedores', asyncHandler(fornecedores.criar));
router.put('/fornecedores/:id', asyncHandler(fornecedores.atualizar));
router.delete('/fornecedores/:id', asyncHandler(fornecedores.excluir));

// Categorias
router.get('/categorias', asyncHandler(categorias.listar));
router.post('/categorias', asyncHandler(categorias.criar));
router.put('/categorias/:id', asyncHandler(categorias.atualizar));
router.delete('/categorias/:id', asyncHandler(categorias.excluir));

// Clientes
router.get('/clientes', asyncHandler(clientes.listar));
router.get('/clientes/:id', asyncHandler(clientes.detalhar));
router.put('/clientes/:id', asyncHandler(clientes.atualizar));
router.delete('/clientes/:id', asyncHandler(clientes.excluir));

// Usuários do painel
router.get('/usuarios', asyncHandler(usuarios.listar));
router.post('/usuarios', asyncHandler(usuarios.criar));
router.put('/usuarios/:id', asyncHandler(usuarios.atualizar));
router.delete('/usuarios/:id', asyncHandler(usuarios.excluir));

module.exports = router;
