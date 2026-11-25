// frontend/src/components/catalogo/ListaOrcamento.jsx
// Itens da lista de orçamento (painel lateral do catálogo e gaveta do celular).
import { X } from 'lucide-react';
import SeletorQuantidade from './SeletorQuantidade';
import { nomeUnidade } from '../../utils/formatacao';

export default function ListaOrcamento({ carrinho, definirQuantidade, remover }) {
  return (
    <ul className="cat-lista">
      {carrinho.map(item => {
        const unidade = nomeUnidade(item.unidade);
        return (
          <li key={item.id}>
            {item.imagem_url ? <img src={item.imagem_url} alt="" /> : <span className="cat-lista-inicial">{item.nome.charAt(0)}</span>}
            <div>
              <strong>{item.nome}</strong>
              <small>{unidade ? `Por ${unidade} · preço sob consulta` : 'Preço sob consulta'}</small>
              <SeletorQuantidade valor={item.quantidade} rotulo={item.nome} onMudar={n => definirQuantidade(item.id, n)} onRemover={() => remover(item.id)} />
            </div>
            <button className="cat-remover" onClick={() => remover(item.id)} aria-label={`Remover ${item.nome}`}><X size={16} /></button>
          </li>
        );
      })}
    </ul>
  );
}
