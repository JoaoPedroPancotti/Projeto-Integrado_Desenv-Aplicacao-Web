// frontend/src/components/layout/SiteLayout.jsx
// Páginas do site ficam centralizadas na largura do site; o painel usa a tela inteira (AdminLayout).
import { Outlet } from 'react-router-dom';

export default function SiteLayout() {
  return (
    <div className="site-layout">
      <Outlet />
    </div>
  );
}
