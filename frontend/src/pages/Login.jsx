import { useState } from 'react';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Mail, Lock, Eye, EyeOff, CircleAlert,
  LoaderCircle, Check, ShieldCheck, ClipboardCheck, Headphones, Truck
} from 'lucide-react';
import { autenticacaoApi } from '../services/api/admin';
import { entrar, lerToken } from '../services/sessao';
import { mensagemErro } from '../utils/erros';
import useSeo from '../hooks/useSeo';
import '../styles/pages/Login.css';

export default function Login() {
  useSeo({ titulo: 'Área do lojista', caminho: '/', noindex: true });
  const [parametros] = useSearchParams();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState(() => (parametros.get('expirou') ? 'Sua sessão expirou. Entre novamente.' : ''));
  const [tentativas, setTentativas] = useState(0);
  const [loading, setLoading] = useState(false);
  const [aprovado, setAprovado] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const destino = location.state?.de || '/admin';

  const mostrarErro = (mensagem) => {
    setErro(mensagem);
    setTentativas(t => t + 1);
  };

  const handleLogin = (evento) => {
    evento.preventDefault();
    setErro('');

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      mostrarErro('Informe um endereço de e-mail válido.');
      return;
    }

    if (senha.length < 6) {
      mostrarErro('A senha deve conter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    autenticacaoApi.entrar({ email: email.trim().toLowerCase(), senha })
      .then(data => {
        entrar(data.token, data.admin);
        setAprovado(true);
        setTimeout(() => navigate(destino, { replace: true }), 700);
      })
      .catch(falha => {
        mostrarErro(falha.response
          ? mensagemErro(falha, falha.response.status >= 500
            ? 'O servidor teve um problema. Tente novamente em instantes.'
            : 'E-mail ou senha incorretos. Verifique os dados e tente novamente.')
          : 'Não foi possível falar com o servidor. Verifique se o backend está ligado.');
      })
      .finally(() => setLoading(false));
  };

  if (lerToken() && !aprovado) return <Navigate to={destino} replace />;

  return (
    <div className="login">
      <aside className="login-apresentacao">
        <img className="login-fundo" src="/images/frenteloja.png" alt="" />
        <div className="login-sombra" />

        <div className="login-apresentacao-topo">
          <button onClick={() => navigate('/')}><ArrowLeft size={16} /> Voltar ao site</button>
          <img src="/images/logotipo-claro.png" alt="Comercial Pancotti" />
        </div>

        <div className="login-apresentacao-conteudo">
          <span className="login-etiqueta">Portal interno</span>
          <h1>Gestão simples para um atendimento melhor.</h1>
          <p>Centralize os pedidos recebidos pelo site e acompanhe cada orçamento com mais agilidade.</p>

          <div className="login-recursos">
            <div><ClipboardCheck size={21} /><span><strong>Pedidos organizados</strong><small>Acompanhe as solicitações em um só lugar</small></span></div>
            <div><Headphones size={21} /><span><strong>Resposta mais rápida</strong><small>Tenha os dados do cliente sempre à mão</small></span></div>
            <div><Truck size={21} /><span><strong>Operação conectada</strong><small>Combine valores, prazo e entrega</small></span></div>
          </div>
        </div>

        <p className="login-apresentacao-rodape">Comercial Pancotti · Materiais para construção</p>
      </aside>

      <main className="login-area">
        <div className="login-mobile-topo">
          <button onClick={() => navigate('/')} aria-label="Voltar ao site"><ArrowLeft size={18} /></button>
          <img src="/images/logotipo.png" alt="Comercial Pancotti" />
        </div>

        <section className="login-card">
          <div className="login-card-cabecalho">
            <span className="login-icone"><ShieldCheck size={24} /></span>
            <span className="login-card-etiqueta">Acesso seguro</span>
          </div>

          <h2>Bem-vindo de volta</h2>
          <p className="login-subtitulo">Entre com suas credenciais para acessar o painel da loja.</p>

          {erro && (
            <div key={tentativas} className="login-erro" role="alert">
              <CircleAlert size={18} />
              <span><strong>Não foi possível entrar</strong>{erro}</span>
            </div>
          )}

          <form onSubmit={handleLogin} noValidate>
            <label className="login-campo">
              <span>E-mail</span>
              <div className="login-input">
                <Mail size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@pancotti.com"
                  autoComplete="username"
                  autoFocus
                  aria-invalid={Boolean(erro)}
                />
              </div>
            </label>

            <label className="login-campo">
              <span>Senha</span>
              <div className="login-input">
                <Lock size={18} />
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Digite sua senha"
                  autoComplete="current-password"
                  aria-invalid={Boolean(erro)}
                />
                <button type="button" className="login-olho" onClick={() => setMostrarSenha(!mostrarSenha)} aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}>
                  {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            <button type="submit" className={`login-botao ${aprovado ? 'login-botao--ok' : ''}`} disabled={loading || aprovado}>
              {aprovado ? <><Check size={20} /> Acesso autorizado</> : loading ? <><LoaderCircle size={20} className="login-girando" /> Verificando acesso...</> : <>Entrar no painel <ArrowRight size={19} /></>}
            </button>
          </form>

          <div className="login-seguranca"><Lock size={14} /><span>Ambiente exclusivo para a equipe da Comercial Pancotti.</span></div>
        </section>

        <p className="login-ajuda">Problemas para acessar? Procure o responsável pelo sistema.</p>
      </main>
    </div>
  );
}
