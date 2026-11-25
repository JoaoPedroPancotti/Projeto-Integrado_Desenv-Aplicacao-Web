// frontend/src/components/admin/Modal.jsx
// Janela modal do painel: fecha com Esc, clique fora ou no X, e trava a rolagem da página.
import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ titulo, subtitulo, onFechar, children, largura = 520 }) {
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
