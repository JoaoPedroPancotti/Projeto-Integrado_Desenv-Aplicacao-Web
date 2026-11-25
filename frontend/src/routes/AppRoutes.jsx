// frontend/src/routes/AppRoutes.jsx
// Mapa de rotas da aplicação: site público e painel administrativo (/admin).
import { Route, Routes } from 'react-router-dom';
import SiteLayout from '../components/layout/SiteLayout';
import AdminLayout from '../components/layout/AdminLayout';

import Home from '../pages/Home';
import Vitrine from '../pages/Vitrine';
import Checkout from '../pages/Checkout';
import Login from '../pages/Login';

import Painel from '../pages/admin/Painel';
import Pedidos from '../pages/admin/Pedidos';
import PedidoDetalhe from '../pages/admin/PedidoDetalhe';
import Produtos from '../pages/admin/Produtos';
import ProdutoDetalhe from '../pages/admin/ProdutoDetalhe';
import Estoque from '../pages/admin/Estoque';
import Movimentacoes from '../pages/admin/Movimentacoes';
import EntradaMercadoria from '../pages/admin/EntradaMercadoria';
import Inventario from '../pages/admin/Inventario';
import Relatorios from '../pages/admin/Relatorios';
import Fornecedores from '../pages/admin/Fornecedores';
import Categorias from '../pages/admin/Categorias';
import Clientes from '../pages/admin/Clientes';
import ClienteDetalhe from '../pages/admin/ClienteDetalhe';
import Usuarios from '../pages/admin/Usuarios';

// aberturaConcluida: a Home só anima o banner depois da animação de abertura (Loader)
export default function AppRoutes({ aberturaConcluida = true }) {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/" element={<Home pronto={aberturaConcluida} />} />
        <Route path="/catalogo" element={<Vitrine />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/login" element={<Login />} />
      </Route>

      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Painel />} />
        <Route path="pedidos" element={<Pedidos />} />
        <Route path="pedidos/:id" element={<PedidoDetalhe />} />
        <Route path="produtos" element={<Produtos />} />
        <Route path="produtos/:id" element={<ProdutoDetalhe />} />
        <Route path="estoque" element={<Estoque />} />
        <Route path="estoque/movimentacoes" element={<Movimentacoes />} />
        <Route path="estoque/entrada" element={<EntradaMercadoria />} />
        <Route path="estoque/inventario" element={<Inventario />} />
        <Route path="estoque/relatorios" element={<Relatorios />} />
        <Route path="fornecedores" element={<Fornecedores />} />
        <Route path="categorias" element={<Categorias />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="clientes/:id" element={<ClienteDetalhe />} />
        <Route path="usuarios" element={<Usuarios />} />
      </Route>
    </Routes>
  );
}
