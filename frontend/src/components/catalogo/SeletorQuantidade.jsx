// frontend/src/components/catalogo/SeletorQuantidade.jsx
// Campo de quantidade do catálogo: botões de - e + e um número que dá para digitar (ex.: 1000 tijolos).
// Com quantidade 1 e "onRemover" informado, o botão de - vira lixeira.
import { useState } from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';

const QUANTIDADE_MAXIMA = 99999;

export default function SeletorQuantidade({ valor, onMudar, onRemover, rotulo }) {
  // enquanto o campo está sendo editado, guarda o texto digitado; fora disso mostra o valor da lista
  const [digitando, setDigitando] = useState(null);

  const confirmar = () => {
    const numero = parseInt(digitando, 10);
    if (numero >= 1) onMudar(Math.min(numero, QUANTIDADE_MAXIMA));
    setDigitando(null);
  };
  const vaiRemover = valor <= 1 && onRemover;

  return (
    <div className="cat-qtd">
      <button type="button" onClick={() => (vaiRemover ? onRemover() : onMudar(valor - 1))} aria-label={vaiRemover ? `Remover ${rotulo}` : 'Diminuir quantidade'}>
        {vaiRemover ? <Trash2 size={14} /> : <Minus size={14} />}
      </button>
      <input
        value={digitando ?? String(valor)}
        inputMode="numeric"
        aria-label={`Quantidade de ${rotulo}`}
        onChange={e => setDigitando(e.target.value.replace(/\D/g, ''))}
        onBlur={confirmar}
        onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
        onFocus={e => { setDigitando(String(valor)); e.target.select(); }}
      />
      <button type="button" onClick={() => onMudar(valor + 1)} aria-label="Aumentar quantidade"><Plus size={14} /></button>
    </div>
  );
}
