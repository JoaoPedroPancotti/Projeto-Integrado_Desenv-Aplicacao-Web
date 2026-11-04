import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Check, CircleAlert, ClipboardCheck,
  LoaderCircle, LockKeyhole, Mail, MapPin, Phone, ShieldCheck
} from 'lucide-react';
import api from '../services/api';
import { carregarOrcamento, limparOrcamento } from '../services/orcamento';
import './Checkout.css';

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [itens] = useState(() => location.state?.carrinho?.length ? location.state.carrinho : carregarOrcamento());
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [loading, setLoading] = useState(false);
  const [protocolo, setProtocolo] = useState(null);
  const [erro, setErro] = useState('');

  const totalUnidades = itens.reduce((total, item) => total + (item.quantidade || 1), 0);

  const enviar = async evento => {
    evento.preventDefault();
    setErro('');
    if (!itens.length) { setErro('Sua lista está vazia. Volte ao catálogo e adicione pelo menos um produto.'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/orcamentos', {
        cliente: { nome, email, telefone },
        itens: itens.map(item => ({ produto_id: item.id, quantidade: item.quantidade || 1 })),
        observacoes
      });
      limparOrcamento();
      setProtocolo(data.protocolo);
    } catch (falha) {
      setErro(falha.response?.data?.erro || 'Não foi possível enviar o orçamento. Verifique a conexão e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (protocolo) {
    return (
      <div className="checkout checkout--sucesso">
        <header className="checkout-topo"><img src="/logotipo-claro.png" alt="Comercial Pancotti" /></header>
        <main className="checkout-sucesso">
          <span className="checkout-sucesso-icone"><Check size={34} /></span>
          <span className="checkout-etiqueta">Solicitação recebida</span>
          <h1>Seu orçamento foi enviado.</h1>
          <p>Nossa equipe vai analisar os itens e entrar em contato com preços, disponibilidade e condições de entrega.</p>
          <div className="checkout-protocolo"><small>Número do protocolo</small><strong>#{protocolo}</strong></div>
          <div className="checkout-sucesso-acoes"><button onClick={() => navigate('/')} className="checkout-secundario">Voltar ao início</button><button onClick={() => navigate('/catalogo')} className="checkout-primario">Novo orçamento <ArrowRight size={17} /></button></div>
        </main>
      </div>
    );
  }

  return (
    <div className="checkout">
      <header className="checkout-topo">
        <button onClick={() => navigate('/catalogo')}><ArrowLeft size={17} /> Voltar ao catálogo</button>
        <img src="/logotipo-claro.png" alt="Comercial Pancotti" />
        <span><LockKeyhole size={15} /> Ambiente seguro</span>
      </header>

      <div className="checkout-etapas"><div className="ativo"><span>1</span><strong>Revisar lista</strong></div><i /><div className="ativo"><span>2</span><strong>Seus dados</strong></div><i /><div><span>3</span><strong>Confirmação</strong></div></div>

      <main className="checkout-conteudo">
        <section className="checkout-formulario">
          <div className="checkout-titulo"><span className="checkout-etiqueta">Finalizar solicitação</span><h1>Dados para contato</h1><p>Preencha as informações abaixo para nossa equipe preparar e retornar o orçamento.</p></div>

          {erro && <div className="checkout-erro" role="alert"><CircleAlert size={19} /><span><strong>Revise sua solicitação</strong>{erro}</span></div>}

          <form onSubmit={enviar}>
            <div className="checkout-campo checkout-campo--inteiro"><label htmlFor="nome">Nome completo <em>*</em></label><div><input id="nome" value={nome} onChange={e => setNome(e.target.value)} required placeholder="Como podemos chamar você?" /><ClipboardCheck size={18} /></div></div>
            <div className="checkout-campo"><label htmlFor="telefone">Telefone ou WhatsApp <em>*</em></label><div><input id="telefone" type="tel" value={telefone} onChange={e => setTelefone(e.target.value)} required placeholder="(00) 00000-0000" /><Phone size={18} /></div></div>
            <div className="checkout-campo"><label htmlFor="email">E-mail <small>(opcional)</small></label><div><input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@email.com" /><Mail size={18} /></div></div>
            <div className="checkout-campo checkout-campo--inteiro"><label htmlFor="observacoes">Detalhes da entrega <small>(opcional)</small></label><textarea id="observacoes" value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Informe o endereço da obra, referências ou outras observações importantes." rows="5" /></div>
            <div className="checkout-privacidade"><ShieldCheck size={18} /><p>Seus dados serão usados somente para responder esta solicitação de orçamento.</p></div>
            <button type="submit" className="checkout-enviar" disabled={loading || !itens.length}>{loading ? <><LoaderCircle className="checkout-girando" size={20} /> Enviando solicitação...</> : <>Enviar orçamento <ArrowRight size={19} /></>}</button>
          </form>
        </section>

        <aside className="checkout-resumo">
          <div className="checkout-resumo-topo"><div><span>Resumo da lista</span><h2>{totalUnidades} {totalUnidades === 1 ? 'item' : 'itens'}</h2></div><button onClick={() => navigate('/catalogo')}>Editar</button></div>
          {itens.length ? <ul>{itens.map(item => <li key={item.id}>{item.imagem_url ? <img src={item.imagem_url} alt="" /> : <span className="checkout-inicial">{item.nome.charAt(0)}</span>}<div><strong>{item.nome}</strong><small>Quantidade: {item.quantidade || 1}</small></div></li>)}</ul> : <div className="checkout-vazio"><ClipboardCheck size={34} /><strong>Nenhum item na lista</strong><button onClick={() => navigate('/catalogo')}>Adicionar produtos</button></div>}
          <div className="checkout-aviso-preco"><strong>Preço sob consulta</strong><p>Os valores, o frete e o prazo serão enviados pela equipe Pancotti após a análise.</p></div>
          <div className="checkout-beneficios"><span><Check size={15} /> Sem compromisso</span><span><Check size={15} /> Atendimento personalizado</span><span><MapPin size={15} /> Entrega combinada com a loja</span></div>
        </aside>
      </main>
    </div>
  );
}
