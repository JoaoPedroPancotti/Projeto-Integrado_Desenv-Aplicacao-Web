// frontend/src/App.jsx
import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import Loader from './components/Loader';
import Home from './pages/Home';
import Vitrine from './pages/Vitrine';
import Login from './pages/Login';
import Checkout from './pages/Checkout';
import AdminLayout from './admin/AdminLayout';
import Painel from './admin/Painel';
import Pedidos from './admin/Pedidos';
import PedidoDetalhe from './admin/PedidoDetalhe';
import Produtos from './admin/Produtos';
import ProdutoDetalhe from './admin/ProdutoDetalhe';
import Estoque from './admin/Estoque';
import Movimentacoes from './admin/Movimentacoes';
import EntradaMercadoria from './admin/EntradaMercadoria';
import Inventario from './admin/Inventario';
import Fornecedores from './admin/Fornecedores';
import Relatorios from './admin/Relatorios';
import Categorias from './admin/Categorias';
import Clientes from './admin/Clientes';
import ClienteDetalhe from './admin/ClienteDetalhe';
import Usuarios from './admin/Usuarios';

// Páginas do site ficam centralizadas; o painel usa a tela inteira
function Site() {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
      <Outlet />
    </div>
  );
}

export default function App() {
  // A animação de abertura é só para o site, não para quem entra direto no painel
  const [carregando, setCarregando] = useState(() => !/^\/(admin|login)/.test(window.location.pathname));

  return (
    <BrowserRouter>
      {carregando && <Loader onFim={() => setCarregando(false)} />}
      <Routes>
        <Route element={<Site />}>
          <Route path="/" element={<Home pronto={!carregando} />} />
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
    </BrowserRouter>
  );
}
