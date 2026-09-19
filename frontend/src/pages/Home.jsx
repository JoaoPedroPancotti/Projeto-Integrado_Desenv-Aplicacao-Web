import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HardHat, ArrowRight, Lock } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div style={containerEstilo}>
      <HardHat size={80} color="#2563eb" style={{ marginBottom: '1.5rem' }} />
      <h1 style={{ fontSize: '3rem', color: '#0f172a', marginBottom: '1rem' }}>
        Comercial Pancotti
      </h1>
      <p style={{ fontSize: '1.25rem', color: '#64748b', maxWidth: '600px', marginBottom: '3rem' }}>
        Tudo o que você precisa para a sua obra, do alicerce ao acabamento. Qualidade e entrega rápida na sua região.
      </p>

      <div style={{ display: 'flex', gap: '1.5rem' }}>
        <button style={btnPrimario} onClick={() => navigate('/catalogo')}>
          Fazer Orçamento <ArrowRight size={20} />
        </button>
        <button style={btnSecundario} onClick={() => navigate('/login')}>
          Acesso Lojista <Lock size={20} />
        </button>
      </div>
    </div>
  );
}

const containerEstilo = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center' };
const btnPrimario = { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 2rem', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' };
const btnSecundario = { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 2rem', backgroundColor: '#f1f5f9', color: '#334155', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' };