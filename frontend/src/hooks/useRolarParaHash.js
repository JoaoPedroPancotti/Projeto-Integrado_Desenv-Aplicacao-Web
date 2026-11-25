// frontend/src/hooks/useRolarParaHash.js
// Ao abrir um link com âncora (ex.: /#contato), rola suavemente até a seção.
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ESPERA_RENDER_MS = 80; // dá tempo da seção ser montada antes de rolar

export default function useRolarParaHash() {
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return undefined;
    const secao = document.querySelector(hash);
    if (!secao) return undefined;
    const timer = setTimeout(() => secao.scrollIntoView({ behavior: 'smooth' }), ESPERA_RENDER_MS);
    return () => clearTimeout(timer);
  }, [hash]);
}
