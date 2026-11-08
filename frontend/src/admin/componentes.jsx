// frontend/src/admin/componentes.jsx
// Peças reaproveitadas pelas telas do painel.
import { useEffect, useMemo, useRef, useState } from 'react';
import { X, LoaderCircle, Inbox, Search, ScanBarcode } from 'lucide-react';
import { SITUACOES_ESTOQUE, TIPOS_MOVIMENTO, classeStatus, produtoCombina, quantidade, situacaoEstoque } from './util';

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

export function SeloEstoque({ produto }) {
  const situacao = situacaoEstoque(produto);
  return <span className={`adm-selo adm-estoque--${situacao}`}>{SITUACOES_ESTOQUE[situacao]}</span>;
}

export function SeloMovimento({ tipo }) {
  return <span className={`adm-selo adm-mov--${tipo}`}>{TIPOS_MOVIMENTO[tipo]?.nome || tipo}</span>;
}

// Quantidade com sinal e cor: +10 saco / -2 saco
export function Quantidade({ valor, unidade }) {
  const classe = valor > 0 ? 'adm-qtd-entra' : valor < 0 ? 'adm-qtd-sai' : '';
  return <strong className={classe}>{valor > 0 ? '+' : ''}{quantidade(valor)} <small>{unidade || 'un'}</small></strong>;
}

/**
 * Campo de busca de produto que também funciona com leitor de código de barras:
 * o leitor digita o código e aperta Enter, e o produto com aquele código entra direto.
 */
export function SeletorProduto({ produtos, onEscolher, placeholder = 'Código, código de barras ou nome do produto', autoFocus = false, limparAoEscolher = true }) {
  const [termo, setTermo] = useState('');
  const [aberto, setAberto] = useState(false);
  const [destaque, setDestaque] = useState(0);
  const caixa = useRef(null);

  const resultados = useMemo(() => (termo.trim() ? produtos.filter(p => produtoCombina(p, termo)).slice(0, 8) : []), [produtos, termo]);

  useEffect(() => {
    const fora = e => { if (caixa.current && !caixa.current.contains(e.target)) setAberto(false); };
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, []);

  const escolher = produto => {
    onEscolher(produto);
    setTermo(limparAoEscolher ? '' : produto.nome);
    setAberto(false);
    setDestaque(0);
  };

  const teclado = e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setDestaque(i => Math.min(i + 1, resultados.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setDestaque(i => Math.max(i - 1, 0)); }
    if (e.key === 'Escape') setAberto(false);
    if (e.key === 'Enter') {
      e.preventDefault();
      const codigo = termo.trim().toUpperCase();
      const exato = produtos.find(p => p.codigo === codigo || (p.codigo_barras && p.codigo_barras === termo.trim()));
      if (exato) escolher(exato);
      else if (resultados[destaque]) escolher(resultados[destaque]);
    }
  };

  return (
    <div className="adm-seletor" ref={caixa}>
      <label className="adm-busca adm-busca--larga">
        <Search size={17} />
        <input value={termo} autoFocus={autoFocus} placeholder={placeholder} onKeyDown={teclado}
          onChange={e => { setTermo(e.target.value); setAberto(true); setDestaque(0); }} onFocus={() => setAberto(true)}
          role="combobox" aria-expanded={aberto && resultados.length > 0} aria-label="Buscar produto" />
        <ScanBarcode size={17} title="Aceita leitor de código de barras" />
      </label>
      {aberto && termo.trim() && (
        <ul className="adm-seletor-lista" role="listbox">
          {resultados.map((p, i) => (
            <li key={p.id} role="option" aria-selected={i === destaque}>
              <button type="button" className={i === destaque ? 'ativo' : ''} onMouseEnter={() => setDestaque(i)} onClick={() => escolher(p)}>
                <code>{p.codigo}</code>
                <span>{p.nome}{p.marca && <small> · {p.marca}</small>}</span>
                {p.controla_estoque && <em>{quantidade(p.estoque)} {p.unidade || 'un'}</em>}
              </button>
            </li>
          ))}
          {!resultados.length && <li className="adm-seletor-vazio">Nenhum produto com “{termo}”.</li>}
        </ul>
      )}
    </div>
  );
}
