// frontend/src/pages/Vitrine.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';

export default function Vitrine() {
  const [carrinho, setCarrinho] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const navigate = useNavigate();

  // useEffect faz a requisição para o Node.js assim que a página abre
  useEffect(() => {
    fetch('http://localhost:3000/api/produtos')
      .then(resposta => resposta.json())
      .then(dados => {
        setProdutos(dados);
        setLoading(false);
      })
      .catch(erro => {
        console.error("Erro ao buscar produtos da API:", erro);
        setLoading(false);
      });
  }, []);

  const adicionarAoCarrinho = (produto) => {
    setCarrinho([...carrinho, produto]);
    alert(`${produto.nome} adicionado ao orçamento!`);
  };

  return (
    <div style={{ padding: '2rem 0', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'center' }}>
        <h1>Catálogo Pancotti</h1>
        <button 
          style={btnEstiloCarrinho}
          onClick={() => navigate('/checkout', { state: { carrinho } })}
        >
          <ShoppingCart size={20} />
          <span>Orçamento ({carrinho.length})</span>
        </button>
      </header>

      {loading ? (
        <p style={{ textAlign: 'center', fontSize: '1.2rem' }}>Carregando catálogo...</p>
      ) : (
        <div style={gridEstilo}>
          {produtos.map(produto => (
            <div key={produto.id} style={cardEstilo}>
              {produto.imagem_url ? (
                <img src={produto.imagem_url} alt={produto.nome} style={imgEstilo} />
              ) : (
                <div style={imgPlaceholder}>Sem Imagem</div>
              )}
              
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{produto.categoria}</span>
              <h3 style={{ margin: '0.5rem 0', fontSize: '1.1rem' }}>{produto.nome}</h3>
              <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '1rem', flex: 1 }}>
                {produto.descricao}
              </p>
              
              <p style={{ fontWeight: 'bold', color: '#0f172a' }}>Sob Consulta</p>
              
              <button 
                style={btnEstiloAdicionar}
                onClick={() => adicionarAoCarrinho(produto)}
              >
                Adicionar ao Orçamento
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Estilos inline
const gridEstilo = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' };
const cardEstilo = { backgroundColor: '#fff', padding: '1rem', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' };
const imgPlaceholder = { width: '100%', height: '150px', backgroundColor: '#e2e8f0', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', marginBottom: '1rem' };
const imgEstilo = { width: '100%', height: '150px', objectFit: 'cover', borderRadius: '4px', marginBottom: '1rem' };
const btnEstiloAdicionar = { marginTop: '1rem', padding: '0.75rem', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' };
const btnEstiloCarrinho = { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' };