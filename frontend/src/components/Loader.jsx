// frontend/src/components/Loader.jsx
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Loader.css';

// "P" do logo enchendo de amarelo. Sem a prop porcentagem, fica em loop.
export function LoaderMarca({ tamanho = 64 }) {
  return (
    <div className="loader-marca loader-marca--loop" style={{ width: tamanho }}>
      <img className="loader-marca-base" src="/logo-p.png" alt="" />
      <img className="loader-marca-cheia" src="/logo-p.png" alt="Carregando" />
    </div>
  );
}

// Leva para o topo da página (banner) sem a rolagem suave
const irParaOTopo = () => window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

// Tela de abertura do site. Ao terminar, sempre deixa o visitante no banner da Home.
export default function Loader({ onFim }) {
  const raiz = useRef(null);
  const navigate = useNavigate();
  const [porcentagem, setPorcentagem] = useState(0);
  const [saindo, setSaindo] = useState(false);

  // Enquanto o loader aparece: vai para a Home, para o topo e trava a rolagem
  useEffect(() => {
    window.history.scrollRestoration = 'manual'; // o navegador não volta para a posição antiga
    if (window.location.pathname !== '/' || window.location.hash) {
      navigate('/', { replace: true });
    }
    irParaOTopo();
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [navigate]);

  // Na saída, garante de novo que o banner está na tela
  useEffect(() => {
    if (saindo) irParaOTopo();
  }, [saindo]);

  useEffect(() => {
    const inicio = performance.now();
    const duracaoMinima = 1800;
    let atual = 0;
    let raf, espera;

    const animar = (agora) => {
      const pronto = document.readyState === 'complete';
      const t = Math.min(1, (agora - inicio) / duracaoMinima);
      const progresso = 100 * (1 - Math.pow(1 - t, 3));
      // Enquanto a página não terminou de carregar, segura em 90%
      const alvo = pronto ? progresso : Math.min(90, progresso);

      atual += (alvo - atual) * 0.15;
      if (pronto && t === 1 && atual > 99.5) atual = 100;

      raiz.current.style.setProperty('--p', atual);
      setPorcentagem(Math.floor(atual));

      if (atual < 100) {
        raf = requestAnimationFrame(animar);
      } else {
        espera = setTimeout(() => setSaindo(true), 300);
      }
    };

    raf = requestAnimationFrame(animar);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(espera);
    };
  }, []);

  const aoTerminarAnimacao = (e) => {
    if (saindo && e.target === e.currentTarget) onFim();
  };

  return (
    <div
      ref={raiz}
      className={`loader ${saindo ? 'loader--saindo' : ''}`}
      onAnimationEnd={aoTerminarAnimacao}
      role="status"
      aria-label="Carregando o site"
    >
      <div className="loader-conteudo">
        <div className="loader-marca">
          <img className="loader-marca-base" src="/logo-p.png" alt="" />
          <img className="loader-marca-cheia" src="/logo-p.png" alt="" />
          <span className="loader-linha" />
        </div>

        <div className="loader-progresso">
          <div className="loader-barra" />
          <div className="loader-info">
            <span>Comercial Pancotti</span>
            <span>{String(porcentagem).padStart(2, '0')}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
