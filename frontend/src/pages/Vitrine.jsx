import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, ArrowLeft } from 'lucide-react';

export default function Vitrine() {
  const [produtos, setProdutos] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('http://localhost:3000/api/produtos')
      .then(res => res.json())
      .then(data => setProdutos(data))
      .catch(err => console.error('Erro ao carregar produtos:', err));
  }, []);

  const adicionarAoCarrinho = (produto) => {
    setCarrinho([...carrinho, produto]);
    alert(`${produto.nome} adicionado ao orçamento!`);
  };

  return (
    <div style={{ padding: '2rem 0' }}>
      <button onClick={() => navigate('/')} style={btnVoltar}>
        <ArrowLeft size={16} /> Voltar ao Início
      </button>

      <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'center' }}>
        <h1>Catálogo de Produtos</h1>
        <button style={btnEstiloCarrinho}>
          <ShoppingCart size={20} />
          <span>Orçamento ({carrinho.length})</span>
        </button>
      </header>

      <div style={gridEstilo}>
        {produtos.map(produto => (
          <div key={produto.id} style={cardEstilo}>
            <span style={{ fontSize: '0.8rem', color: '#0369a1', backgroundColor: '#e0f2fe', padding: '0.2rem 0.5rem', borderRadius: '4px', width: 'fit-content' }}>
              {produto.categoria}
            </span>
            <h3 style={{ margin: '0.5rem 0' }}>{produto.nome}</h3>
            <p style={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '1rem' }}>R$ {produto.preco}</p>
            
            <button 
              style={btnEstiloAdicionar}
              onClick={() => adicionarAoCarrinho(produto)}
            >
              Adicionar ao Orçamento
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

const gridEstilo = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' };
const cardEstilo = { backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' };
const btnEstiloAdicionar = { marginTop: 'auto', padding: '0.75rem', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' };
const btnEstiloCarrinho = { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' };
const btnVoltar = { background: 'none', border: 'none', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: '1.5rem', fontSize: '1rem' };