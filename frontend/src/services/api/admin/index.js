// frontend/src/services/api/admin/index.js
// Endpoints do painel administrativo (/api/admin). Todos exigem login, menos autenticacaoApi.entrar.
export { autenticacaoApi } from './autenticacao';
export { dashboardApi } from './dashboard';
export { pedidosApi } from './pedidos';
export { produtosApi } from './produtos';
export { estoqueApi } from './estoque';
export { fornecedoresApi } from './fornecedores';
export { categoriasApi } from './categorias';
export { clientesApi } from './clientes';
export { usuariosApi } from './usuarios';
