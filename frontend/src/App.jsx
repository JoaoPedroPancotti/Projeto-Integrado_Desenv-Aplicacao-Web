// frontend/src/App.jsx
import React, { useState, useEffect } from 'react';

export default function App() {
  const [produtos, setProdutos] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [abaAtiva, setAbaAtiva] = useState('vitrine'); // 'vitrine' ou 'carrinho'
  
  // Estados do formulário de orçamento
  const [nomeCliente, setNomeCliente] = useState('');
  const [emailCliente, setEmailCliente] = useState('');
  const [telefoneCliente, setTelefoneCliente] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [mensagemSucesso, setMensagemSucesso] = useState('');

  useEffect(() => {
    fetch('http://localhost:3000/api/produtos')
      .then(res => {
        if (!res.ok) throw new Error('Erro ao comunicar com a API');
        return res.json();
      })
      .then(data => {
        setProdutos(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setErro('Não foi possível carregar os produtos do servidor.');
        setLoading(false);
      });
  }, []);

  // Adicionar produto ao carrinho
  const adicionarAoCarrinho = (produto) => {
    const itemExistente = carrinho.find(item => item.id === produto.id);
    if (itemExistente) {
      setCarrinho(
        carrinho.map(item =>
          item.id === produto.id ? { ...item, quantidade: item.quantidade + 1 } : item
        )
      );
    } else {
      setCarrinho([...carrinho, { ...produto, quantidade: 1 }]);
    }
    alert(`${produto.nome} adicionado ao orçamento!`);
  };

  // Enviar orçamento para a API Node.js
  const enviarOrcamento = (e) => {
    e.preventDefault();
    if (carrinho.length === 0) {
      alert('O seu carrinho de orçamento está vazio.');
      return;
    }

    const payload = {
      cliente: {
        nome: nomeCliente,
        email: emailCliente,
        telefone: telefoneCliente
      },
      itens: carrinho.map(item => ({
        produto_id: item.id,
        quantidade: item.quantidade
      })),
      observacoes: observacoes
    };

    fetch('http://localhost:3000/api/orcamentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => {
        if (!res.ok) throw new Error('Erro ao enviar orçamento');
        return res.json();
      })
      .then(data => {
        setMensagemSucesso(`Orçamento enviado com sucesso! Protocolo nº: ${data.protocolo}`);
        setCarrinho([]);
      })
      .catch(err => {
        console.error(err);
        alert('Erro ao processar o orçamento no servidor.');
      });
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '1rem' }}>
        <div>
          <h1 style={{ color: '#0f172a', margin: 0 }}>Comercial Pancotti</h1>
          <p style={{ color: '#64748b', margin: '0.2rem 0 0 0' }}>Materiais de Construção</p>
        </div>
        <button 
          onClick={() => setAbaAtiva(abaAtiva === 'vitrine' ? 'carrinho' : 'vitrine')}
          style={{ padding: '0.75rem 1.25rem', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          {abaAtiva === 'vitrine' ? `Ver Orçamento (${carrinho.reduce((acc, item) => acc + item.quantidade, 0)})` : 'Voltar à Vitrine'}
        </button>
      </header>

      {loading && <p style={{ fontSize: '1.2rem', color: '#3b82f6' }}>A carregar produtos...</p>}
      {erro && <div style={{ padding: '1rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px' }}>{erro}</div>}

      {!loading && !erro && abaAtiva === 'vitrine' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
          {produtos.map(produto => (
            <div key={produto.id} style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '0.25rem 0.5rem', borderRadius: '4px', fontWeight: 'bold' }}>
                {produto.categoria || 'Geral'}
              </span>
              <h3 style={{ margin: '0.75rem 0 0.5rem 0', color: '#1e293b' }}>{produto.nome}</h3>
              <p style={{ color: '#475569', fontSize: '0.9rem', marginBottom: '1.5rem' }}>{produto.descricao}</p>
              <button 
                onClick={() => adicionarAoCarrinho(produto)}
                style={{ width: '100%', padding: '0.75rem', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Adicionar ao Orçamento
              </button>
            </div>
          ))}
        </div>
      )}

      {abaAtiva === 'carrinho' && (
        <div style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', maxWidth: '600px', margin: '0 auto' }}>
          <h2>Itens no Orçamento</h2>
          {carrinho.length === 0 ? (
            <p style={{ margin: '1rem 0', color: '#64748b' }}>O seu carrinho está vazio.</p>
          ) : (
            <ul style={{ margin: '1rem 0', paddingLeft: '1.5rem' }}>
              {carrinho.map(item => (
                <li key={item.id} style={{ marginBottom: '0.5rem' }}>
                  {item.nome} - <strong>Quantidade: {item.quantidade}</strong>
                </li>
              ))}
            </ul>
          )}

          {mensagemSucesso && (
            <div style={{ padding: '1rem', backgroundColor: '#d1fae5', color: '#065f46', borderRadius: '6px', margin: '1rem 0' }}>
              {mensagemSucesso}
            </div>
          )}

          {carrinho.length > 0 && !mensagemSucesso && (
            <form onSubmit={enviarOrcamento} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
              <h3>Preencha os seus dados para envio</h3>
              <input 
                type="text" placeholder="Nome Completo *" required 
                value={nomeCliente} onChange={e => setNomeCliente(e.target.value)}
                style={{ padding: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
              <input 
                type="email" placeholder="E-mail" 
                value={emailCliente} onChange={e => setEmailCliente(e.target.value)}
                style={{ padding: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
              <input 
                type="text" placeholder="Telemóvel / WhatsApp *" required 
                value={telefoneCliente} onChange={e => setTelefoneCliente(e.target.value)}
                style={{ padding: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
              <textarea 
                placeholder="Observações ou morada de entrega" 
                value={observacoes} onChange={e => setObservacoes(e.target.value)}
                style={{ padding: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1', height: '80px' }}
              />
              <button 
                type="submit" 
                style={{ padding: '0.75rem', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Enviar Solicitação de Orçamento
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}