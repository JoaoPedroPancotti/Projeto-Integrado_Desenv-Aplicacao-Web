// frontend/src/pages/Checkout.jsx
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Recebe os itens selecionados na vitrine via state do React Router
  const itensCarrinho = location.state?.carrinho || [];

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(null);
  const [erro, setErro] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');

    if (itensCarrinho.length === 0) {
      setErro('Seu carrinho está vazio.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        cliente: { nome, email, telefone },
        itens: itensCarrinho.map(item => ({ produto_id: item.id, quantidade: 1 })), // Quantidade padrão 1 para teste
        observacoes
      };

      const resposta = await fetch('http://localhost:3000/api/orcamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(dados.erro || 'Erro ao enviar orçamento');
      }

      setSucesso(`Orçamento enviado com sucesso! Protocolo #${dados.protocolo}`);
    } catch (err) {
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (sucesso) {
    return (
      <div style={containerSucesso}>
        <h2>🎉 Solicitação Concluída!</h2>
        <p style={{ margin: '1rem 0' }}>{sucesso}</p>
        <button style={btnVoltar} onClick={() => navigate('/catalogo')}>Voltar para o Catálogo</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem 0', maxWidth: '600px', margin: '0 auto' }}>
      <button onClick={() => navigate('/catalogo')} style={btnVoltarLink}>
        <ArrowLeft size={16} /> Continuar Comprando
      </button>

      <div style={cardForm}>
        <h2>Finalizar Solicitação de Orçamento</h2>
        
        {erro && <div style={msgErro}>{erro}</div>}

        <div style={{ margin: '1.5rem 0', padding: '1rem', backgroundColor: '#f1f5f9', borderRadius: '6px' }}>
          <h4>Itens no Orçamento ({itensCarrinho.length}):</h4>
          <ul style={{ paddingLeft: '1.2rem', marginTop: '0.5rem' }}>
            {itensCarrinho.map((item, idx) => (
              <li key={idx}>{item.nome}</li>
            ))}
          </ul>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={labelEstilo}>Nome Completo *</label>
            <input type="text" value={nome} onChange={e => setNome(e.target.value)} required style={inputEstilo} placeholder="Ex: João da Silva" />
          </div>

          <div>
            <label style={labelEstilo}>E-mail</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inputEstilo} placeholder="joao@email.com" />
          </div>

          <div>
            <label style={labelEstilo}>Telefone / WhatsApp *</label>
            <input type="tel" value={telefone} onChange={e => setTelefone(e.target.value)} required style={inputEstilo} placeholder="(11) 99999-9999" />
          </div>

          <div>
            <label style={labelEstilo}>Observações para entrega</label>
            <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} style={{ ...inputEstilo, height: '80px' }} placeholder="Ex: Entregar na obra do centro..." />
          </div>

          <button type="submit" disabled={loading} style={btnEnviar}>
            <Send size={18} /> {loading ? 'Enviando...' : 'Enviar Orçamento para a Loja'}
          </button>
        </form>
      </div>
    </div>
  );
}

// Estilos
const cardForm = { backgroundColor: '#fff', padding: '2rem', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' };
const inputEstilo = { width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1', marginTop: '0.25rem' };
const labelEstilo = { fontWeight: 'bold', fontSize: '0.9rem', color: '#475569' };
const btnEnviar = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', marginTop: '1rem' };
const btnVoltarLink = { background: 'none', border: 'none', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: '1rem', fontWeight: 'bold' };
const containerSucesso = { textAlign: 'center', padding: '4rem 1rem' };
const btnVoltar = { padding: '0.75rem 1.5rem', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' };
const msgErro = { backgroundColor: '#fee2e2', color: '#ef4444', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem', fontWeight: 'bold' };