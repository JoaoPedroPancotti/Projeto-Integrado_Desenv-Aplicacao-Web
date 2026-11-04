// frontend/src/admin/componentes.jsx
// Peças reaproveitadas pelas telas do painel.
import { useEffect } from 'react';
import { X, LoaderCircle, Inbox } from 'lucide-react';
import { classeStatus } from './util';

export function Selo({ status }) {
  return <span className={classeStatus(status)}>{status}</span>;
}

export function Modal({ titulo, subtitulo, onFechar, children, largura = 520 }) {
  useEffect(() => {
    const fechar = e => e.key === 'Escape' && onFechar();
    window.addEventListener('keydown', fechar);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', fechar); document.body.style.overflow = ''; };
  }, [onFechar]);

  return (
    <div className="adm-modal-fundo" onMouseDown={e => e.target === e.currentTarget && onFechar()}>
      <div className="adm-modal" style={{ maxWidth: largura }} role="dialog" aria-modal="true" aria-label={titulo}>
        <header><div><h2>{titulo}</h2>{subtitulo && <p>{subtitulo}</p>}</div><button onClick={onFechar} aria-label="Fechar"><X size={19} /></button></header>
        {children}
      </div>
    </div>
  );
}

export function Carregando({ texto = 'Carregando...' }) {
  return <div className="adm-estado"><LoaderCircle size={28} className="adm-girando" /><p>{texto}</p></div>;
}

export function Vazio({ titulo, texto, children, icone: Icone = Inbox }) {
  return <div className="adm-estado"><Icone size={34} /><h3>{titulo}</h3>{texto && <p>{texto}</p>}{children}</div>;
}
