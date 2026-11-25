// frontend/src/components/admin/SeletorProduto.jsx
// Campo de busca de produto que também funciona com leitor de código de barras:
// o leitor digita o código e aperta Enter, e o produto com aquele código entra direto.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, ScanBarcode } from 'lucide-react';
import { quantidade } from '../../utils/formatacao';
import { produtoCombina } from '../../utils/estoque';

const LIMITE_RESULTADOS = 8;

export default function SeletorProduto({ produtos, onEscolher, placeholder = 'Código, código de barras ou nome do produto', autoFocus = false, limparAoEscolher = true }) {
  const [termo, setTermo] = useState('');
  const [aberto, setAberto] = useState(false);
  const [destaque, setDestaque] = useState(0);
  const caixa = useRef(null);

  const resultados = useMemo(
    () => (termo.trim() ? produtos.filter(p => produtoCombina(p, termo)).slice(0, LIMITE_RESULTADOS) : []),
    [produtos, termo],
  );

  // fecha a lista ao clicar fora do campo
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
