import { useCallback, useEffect, useState } from 'react';
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, Package, Tags, Users, UserCog,
  LogOut, Menu, X, ExternalLink, CircleCheck, CircleAlert,
  Warehouse, ArrowLeftRight, PackagePlus, ClipboardCheck, Truck, ChartColumnBig
} from 'lucide-react';
import api from '../services/api';
import { lerAdmin, lerToken, sair } from '../services/auth';
import './admin.css';

// [seção, [[link, nome, ícone, exato]]]
const MENU = [
  ['Vendas', [
    ['/admin', 'Visão geral', LayoutDashboard, true],
    ['/admin/pedidos', 'Pedidos', ClipboardList],
    ['/admin/clientes', 'Clientes', Users],
  ]],
  ['Estoque', [
    ['/admin/produtos', 'Produtos', Package],
    ['/admin/estoque', 'Saldos', Warehouse, true],
    ['/admin/estoque/entrada', 'Entrada de mercadoria', PackagePlus],
    ['/admin/estoque/movimentacoes', 'Movimentações', ArrowLeftRight],
    ['/admin/estoque/inventario', 'Inventário', ClipboardCheck],
    ['/admin/estoque/relatorios', 'Relatórios', ChartColumnBig],
    ['/admin/fornecedores', 'Fornecedores', Truck],
  ]],
  ['Configurações', [
    ['/admin/categorias', 'Categorias', Tags],
    ['/admin/usuarios', 'Usuários', UserCog],
  ]],
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [admin] = useState(lerAdmin);
  const [menuAberto, setMenuAberto] = useState(false);
  const [pendentes, setPendentes] = useState(0);
  const [alertasEstoque, setAlertasEstoque] = useState(0);
  const [aviso, setAviso] = useState(null);

  const avisar = useCallback((texto, tipo = 'ok') => setAviso({ texto, tipo, chave: Date.now() }), []);

  // Contador de pedidos novos no menu, atualizado a cada minuto
  const atualizarPendentes = useCallback(() => {
    api.get('/admin/orcamentos', { params: { status: 'Pendente' } })
      .then(({ data }) => setPendentes(data.length))
      .catch(() => {});
    api.get('/admin/estoque/resumo')
      .then(({ data }) => setAlertasEstoque(data.precisa_repor))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!lerToken()) return undefined;
    atualizarPendentes();
    const timer = setInterval(atualizarPendentes, 60000);
    return () => clearInterval(timer);
  }, [atualizarPendentes]);

  useEffect(() => { setMenuAberto(false); }, [location.pathname]);

  useEffect(() => {
    if (!aviso) return undefined;
    const timer = setTimeout(() => setAviso(null), 3500);
    return () => clearTimeout(timer);
  }, [aviso]);

  if (!lerToken()) return <Navigate to="/login" replace state={{ de: location.pathname }} />;

  const encerrar = () => { sair(); navigate('/login'); };

  return (
    <div className="adm">
      <aside className={`adm-lateral ${menuAberto ? 'aberto' : ''}`}>
        <div className="adm-lateral-topo">
          <img src="/logotipo-claro.png" alt="Comercial Pancotti" />
          <button className="adm-fechar-menu" onClick={() => setMenuAberto(false)} aria-label="Fechar menu"><X size={20} /></button>
        </div>
        <nav>
          {MENU.map(([secao, itens]) => (
            <div key={secao} className="adm-menu-secao">
              <span className="adm-lateral-etiqueta">{secao}</span>
              {itens.map(([para, nome, Icone, exato]) => (
                <NavLink key={para} to={para} end={exato}>
                  <Icone size={19} /><span>{nome}</span>
                  {para === '/admin/pedidos' && pendentes > 0 && <em title="Pedidos pendentes">{pendentes}</em>}
                  {para === '/admin/estoque' && alertasEstoque > 0 && <em title="Produtos no estoque mínimo ou abaixo">{alertasEstoque}</em>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <a className="adm-ver-site" href="/" target="_blank" rel="noreferrer"><ExternalLink size={16} /> Ver o site</a>
        <div className="adm-perfil">
          <span>{admin?.nome?.charAt(0) || 'A'}</span>
          <div><strong>{admin?.nome}</strong><small>{admin?.email}</small></div>
          <button onClick={encerrar} title="Sair" aria-label="Sair"><LogOut size={18} /></button>
        </div>
      </aside>
      {menuAberto && <div className="adm-sombra-menu" onClick={() => setMenuAberto(false)} />}

      <div className="adm-principal">
        <header className="adm-topo-mobile">
          <button onClick={() => setMenuAberto(true)} aria-label="Abrir menu"><Menu size={22} /></button>
          <img src="/logotipo-claro.png" alt="Comercial Pancotti" />
          <span />
        </header>
        <main className="adm-conteudo">
          <Outlet context={{ avisar, admin, atualizarPendentes }} />
        </main>
      </div>

      {aviso && (
        <div key={aviso.chave} className={`adm-aviso adm-aviso--${aviso.tipo}`} role="status">
          {aviso.tipo === 'ok' ? <CircleCheck size={19} /> : <CircleAlert size={19} />}
          <span>{aviso.texto}</span>
        </div>
      )}
    </div>
  );
}
