// frontend/src/pages/Home.jsx
import React, { useState, useEffect } from 'react';
import { ShoppingCart } from 'lucide-react';
import api from '../services/api';

export default function Home() {
  const [produtos, setProdutos] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/produtos')
      .then(response => {
        setProdutos(response.data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Erro ao buscar produtos da API:', error);
        setLoading(false);
      });
  }, []);

  const adicionarAoCarrinho = (produto) => {
    setCarrinho([...carrinho, produto]);
    alert(`${produto.nome} adicionado ao orçamento!`);
  };

  return (
    <div style={{ padding: '2rem 0' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'center' }}>
        <div>
          <h1>Comercial Pancotti</h1>
          <p style={{ color: '#64748b' }}>Materiais de Construção</p>
        </div>
        <button style={btnEstiloCarrinho}>
          <ShoppingCart size={20} />
          <span>Orçamento ({carrinho.length})</span>
        </button>
      </header>

      {loading ? (
        <p style={{ color: '#2563eb', fontSize: '1.2rem' }}>Carregando produtos...</p>
      ) : (
        <div style={gridEstilo}>
          {produtos.map(produto => (
            <div key={produto.id} style={cardEstilo}>
              <div style={imgPlaceholder}>Produto #{produto.id}</div>
              <h3 style={{ margin: '0.5rem 0' }}>{produto.nome}</h3>
              <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1rem' }}>{produto.descricao}</p>
              <p style={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '1rem' }}>Sob Consulta</p>
              
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

const gridEstilo = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
  gap: '1.5rem'
};

const cardEstilo = {
  backgroundColor: '#fff',
  padding: '1.5rem',
  borderRadius: '8px',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between'
};

const imgPlaceholder = {
  width: '100%',
  height: '140px',
  backgroundColor: '#e2e8f0',
  borderRadius: '4px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#94a3b8',
  marginBottom: '1rem',
  fontWeight: 'bold'
};

const btnEstiloAdicionar = {
  padding: '0.75rem',
  backgroundColor: '#2563eb',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontWeight: 'bold'
};

const btnEstiloCarrinho = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.75rem 1.5rem',
  backgroundColor: '#10b981',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontWeight: 'bold'
};