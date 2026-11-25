// frontend/src/App.jsx
// Raiz da aplicação: roteador + animação de abertura do site.
import { useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import Loader from './components/ui/Loader';
import AppRoutes from './routes/AppRoutes';

// A animação de abertura é só para o site, não para quem entra direto no painel
const mostrarAbertura = () => !/^\/(admin|login)/.test(window.location.pathname);

export default function App() {
  const [carregando, setCarregando] = useState(mostrarAbertura);

  return (
    <BrowserRouter>
      {carregando && <Loader onFim={() => setCarregando(false)} />}
      <AppRoutes aberturaConcluida={!carregando} />
    </BrowserRouter>
  );
}
