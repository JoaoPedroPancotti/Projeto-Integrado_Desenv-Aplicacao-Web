// src/pages/Login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowLeft } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault(); // Impede o recarregamento da página
    setErro('');

    // Validação 1: Formato de E-mail (Regex)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErro('Por favor, insira um formato de e-mail válido.');
      return;
    }

    // Validação 2: Tamanho da senha
    if (senha.length < 6) {
      setErro('A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    setLoading(true);

    // Simulando uma chamada à nossa API Node.js
    setTimeout(() => {
      setLoading(false);
      if (email === 'admin@pancotti.com' && senha === '123456') {
        alert('Login aprovado! Bem-vindo ao painel.');
        // No futuro: navigate('/admin');
      } else {
        setErro('Credenciais inválidas. Tente novamente.');
      }
    }, 1000);
  };

  return (
    <div style={loginContainer}>
      <button onClick={() => navigate('/')} style={btnVoltar}>
        <ArrowLeft size={16} /> Voltar
      </button>

      <div style={cardLogin}>
        <ShieldCheck size={48} color="#10b981" style={{ marginBottom: '1rem' }} />
        <h2 style={{ marginBottom: '1.5rem', color: '#0f172a' }}>Painel Administrativo</h2>
        
        {erro && <div style={msgErro}>{erro}</div>}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
          <div style={inputGroup}>
            <label>E-mail Corporativo</label>
            <input 
              type="text" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="admin@pancotti.com" 
              style={inputEstilo}
            />
          </div>

          <div style={inputGroup}>
            <label>Senha</label>
            <input 
              type="password" 
              value={senha} 
              onChange={(e) => setSenha(e.target.value)} 
              placeholder="******" 
              style={inputEstilo}
            />
          </div>

          <button type="submit" disabled={loading} style={btnEntrar}>
            {loading ? 'Validando...' : 'Entrar no Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
}

// Estilos inline do Login
const loginContainer = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' };
const cardLogin = { backgroundColor: '#fff', padding: '2.5rem', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '400px' };
const inputGroup = { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%', gap: '0.3rem' };
const inputEstilo = { width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '1rem' };
const btnEntrar = { marginTop: '1rem', padding: '0.85rem', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' };
const btnVoltar = { alignSelf: 'flex-start', background: 'none', border: 'none', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: '2rem', fontSize: '1rem' };
const msgErro = { backgroundColor: '#fee2e2', color: '#ef4444', padding: '0.75rem', borderRadius: '6px', width: '100%', textAlign: 'center', marginBottom: '1rem', fontSize: '0.9rem', fontWeight: 'bold' };