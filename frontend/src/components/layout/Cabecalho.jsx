// frontend/src/components/layout/Cabecalho.jsx
// Header do site (início e catálogo).
//
// Busca: na página inicial mostra sugestões e leva ao catálogo; no catálogo filtra
// ao digitar (props "busca" e "onBusca").
// Ao rolar, o header encolhe e a barra de menu some descendo e volta subindo.
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Search, X, Menu, ChevronDown, ChevronRight, ClipboardList, MessageCircle,
  Phone, Lock, Truck, ShieldCheck, Clock, ArrowRight
} from 'lucide-react';
import { catalogoApi } from '../../services/api/catalogo';
import { carregarOrcamento, EVENTO_ORCAMENTO } from '../../services/listaOrcamento';
import { LOJA, linkTelefone, linkWhatsapp } from '../../data/loja';
import { DEPARTAMENTOS } from '../../data/departamentos';
import { semAcento } from '../../utils/texto';
import '../../styles/components/Cabecalho.css';

const LINKS = [
  ['produtos', 'Produtos'],
  ['como-funciona', 'Como comprar'],
  ['sobre', 'Sobre a Pancotti'],
  ['duvidas', 'Dúvidas'],
  ['contato', 'Contato'],
];

const AVISOS = [
  [Truck, 'Entrega na região, com frete informado no orçamento'],
  [ShieldCheck, 'Peça seu orçamento sem criar conta'],
  [Clock, LOJA.horario],
];

export default function Cabecalho({ busca, onBusca, onDepartamento, onAbrirOrcamento }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const naHome = pathname === '/';
  const buscaControlada = typeof onBusca === 'function';

  const [textoBusca, setTextoBusca] = useState('');
  const termoAtual = buscaControlada ? busca : textoBusca;
  const [produtos, setProdutos] = useState(null);
  const [sugestoesAbertas, setSugestoesAbertas] = useState(false);
  const [megaAberto, setMegaAberto] = useState(false);
  const [menuMobile, setMenuMobile] = useState(false);
  const [compacto, setCompacto] = useState(false);
  const [navOculta, setNavOculta] = useState(false);
  const [itensLista, setItensLista] = useState(() => carregarOrcamento().length);
  const buscaRef = useRef(null);
  const megaRef = useRef(null);

  // Contador do orçamento (muda nesta aba e em outras abas)
  useEffect(() => {
    const atualizar = evento => setItensLista((evento.detail ?? carregarOrcamento()).length);
    const outraAba = () => setItensLista(carregarOrcamento().length);
    window.addEventListener(EVENTO_ORCAMENTO, atualizar);
    window.addEventListener('storage', outraAba);
    return () => {
      window.removeEventListener(EVENTO_ORCAMENTO, atualizar);
      window.removeEventListener('storage', outraAba);
    };
  }, []);

  // Encolhe ao rolar; esconde a barra de menu descendo e mostra subindo
  useEffect(() => {
    let ultimo = window.scrollY;
    let agendado = false;
    const aoRolar = () => {
      if (agendado) return;
      agendado = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        setCompacto(y > 30);
        if (Math.abs(y - ultimo) > 6) {
          setNavOculta(y > 260 && y > ultimo);
          if (y > ultimo) setMegaAberto(false);
          ultimo = y;
        }
        agendado = false;
      });
    };
    window.addEventListener('scroll', aoRolar, { passive: true });
    return () => window.removeEventListener('scroll', aoRolar);
  }, []);

  // Fecha sugestões e menu de departamentos ao clicar fora ou apertar Esc
  useEffect(() => {
    const clique = evento => {
      if (buscaRef.current && !buscaRef.current.contains(evento.target)) setSugestoesAbertas(false);
      if (megaRef.current && !megaRef.current.contains(evento.target)) setMegaAberto(false);
    };
    const tecla = evento => {
      if (evento.key !== 'Escape') return;
      setSugestoesAbertas(false);
      setMegaAberto(false);
      setMenuMobile(false);
    };
    document.addEventListener('pointerdown', clique);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('pointerdown', clique);
      document.removeEventListener('keydown', tecla);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuMobile ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuMobile]);

  // Produtos para as sugestões: carrega só na primeira vez que a busca recebe foco
  const carregarSugestoes = () => {
    if (buscaControlada || produtos) return;
    setProdutos('carregando');
    catalogoApi.listarProdutos()
      .then(data => setProdutos(data.filter(p => p.ativo !== 0 && p.ativo !== false)))
      .catch(() => setProdutos([]));
  };

  const termoNormalizado = semAcento(termoAtual.trim());
  const sugestoes = !buscaControlada && termoNormalizado && Array.isArray(produtos)
    ? produtos.filter(p => semAcento(`${p.nome} ${p.descricao ?? ''}`).includes(termoNormalizado)).slice(0, 5)
    : [];

  const irParaCatalogo = (termo = '') => {
    setSugestoesAbertas(false);
    setMegaAberto(false);
    setMenuMobile(false);
    navigate(termo ? `/catalogo?busca=${encodeURIComponent(termo)}` : '/catalogo');
  };

  const enviarBusca = evento => {
    evento.preventDefault();
    if (buscaControlada) {
      evento.currentTarget.querySelector('input')?.blur();
      return;
    }
    irParaCatalogo(termoAtual.trim());
  };

  const escolherDepartamento = termo => {
    setMegaAberto(false);
    setMenuMobile(false);
    if (onDepartamento) {
      onDepartamento(termo);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      irParaCatalogo(termo);
    }
  };

  const abrirOrcamento = () => {
    setMenuMobile(false);
    if (onAbrirOrcamento) onAbrirOrcamento();
    else navigate('/catalogo', { state: { abrirLista: itensLista > 0 } });
  };

  // Na página inicial os links rolam até a seção; nas outras voltam para o início
  const linkSecao = (id, rotulo, extra = {}) => (naHome
    ? <a key={id} href={`#${id}`} {...extra}>{rotulo}</a>
    : <Link key={id} to={`/#${id}`} {...extra}>{rotulo}</Link>);

  return (
    <>
      <div className="cab-espaco" aria-hidden="true" />
      <header className={`cab ${compacto ? 'cab--compacto' : ''} ${navOculta ? 'cab--nav-oculta' : ''}`}>
        <div className="cab-faixa">
          <div className="cab-interno cab-faixa-linha">
            <div className="cab-avisos" aria-hidden="true">
              <div className="cab-avisos-trilho">
                {[...AVISOS, AVISOS[0]].map(([Icone, texto], i) => <span key={i}><Icone size={13} /> {texto}</span>)}
              </div>
            </div>
            <div className="cab-faixa-links">
              <a href={linkTelefone}><Phone size={13} /> {LOJA.telefone}</a>
              <a href={linkWhatsapp} target="_blank" rel="noreferrer"><MessageCircle size={13} /> WhatsApp</a>
              <Link to="/login"><Lock size={13} /> Área do lojista</Link>
            </div>
          </div>
        </div>

        <div className="cab-principal">
          <div className="cab-interno cab-principal-linha">
            <button className="cab-hamburguer" onClick={() => setMenuMobile(true)} aria-label="Abrir menu"><Menu size={24} /></button>

            <Link to="/" className="cab-logo" aria-label="Comercial Pancotti - página inicial" onClick={() => naHome && window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <img src="/images/logotipo-claro.png" alt="Comercial Pancotti" />
            </Link>

            <form className={`cab-busca ${sugestoesAbertas && termoNormalizado && !buscaControlada ? 'cab-busca--aberta' : ''}`} onSubmit={enviarBusca} ref={buscaRef} role="search">
              <Search size={19} className="cab-busca-lupa" />
              <input
                type="search"
                value={termoAtual}
                onChange={e => {
                  if (buscaControlada) onBusca(e.target.value);
                  else setTextoBusca(e.target.value);
                  carregarSugestoes();
                  setSugestoesAbertas(true);
                }}
                onFocus={() => { carregarSugestoes(); setSugestoesAbertas(true); }}
                placeholder="Busque cimento, tijolo, tinta, ferramentas..."
                aria-label="Buscar produtos"
                autoComplete="off"
              />
              {termoAtual && (
                <button type="button" className="cab-busca-limpar" aria-label="Limpar busca" onClick={() => (buscaControlada ? onBusca('') : setTextoBusca(''))}>
                  <X size={16} />
                </button>
              )}
              <button type="submit" className="cab-busca-enviar" aria-label="Buscar"><Search size={19} /><span>Buscar</span></button>

              {sugestoesAbertas && termoNormalizado && !buscaControlada && (
                <div className="cab-sugestoes">
                  {produtos === null || produtos === 'carregando' ? (
                    <p className="cab-sugestoes-vazio">Buscando produtos…</p>
                  ) : sugestoes.length > 0 ? (
                    <>
                      <span className="cab-sugestoes-titulo">Produtos</span>
                      {sugestoes.map(produto => (
                        <button type="button" key={produto.id} className="cab-sugestao" onClick={() => irParaCatalogo(produto.nome)}>
                          {produto.imagem_url ? <img src={produto.imagem_url} alt="" /> : <span className="cab-sugestao-inicial">{produto.nome.charAt(0)}</span>}
                          <span>{produto.nome}</span>
                          <ChevronRight size={16} />
                        </button>
                      ))}
                    </>
                  ) : (
                    <p className="cab-sugestoes-vazio">Nenhum produto com “{termoAtual.trim()}” por enquanto.</p>
                  )}
                  <button type="submit" className="cab-sugestoes-todos">
                    <Search size={15} /> Buscar “{termoAtual.trim()}” no catálogo <ArrowRight size={15} />
                  </button>
                </div>
              )}
            </form>

            <a className="cab-contato" href={linkWhatsapp} target="_blank" rel="noreferrer">
              <span className="cab-contato-icone"><MessageCircle size={20} /></span>
              <span><small>Dúvidas?</small><strong>Fale conosco</strong></span>
            </a>

            <button className="cab-orcamento" onClick={abrirOrcamento} aria-label={`Meu orçamento: ${itensLista} ${itensLista === 1 ? 'item' : 'itens'}`}>
              <span className="cab-orcamento-icone">
                <ClipboardList size={21} />
                <em key={itensLista} className={itensLista ? '' : 'cab-orcamento-zero'}>{itensLista}</em>
              </span>
              <span className="cab-orcamento-texto"><small>Minha lista</small><strong>Orçamento</strong></span>
            </button>
          </div>
        </div>

        <div className="cab-nav">
          <div className="cab-interno cab-nav-linha">
            <div className="cab-departamentos" ref={megaRef}>
              <button className={`cab-departamentos-botao ${megaAberto ? 'ativo' : ''}`} onClick={() => setMegaAberto(aberto => !aberto)} aria-expanded={megaAberto}>
                <Menu size={18} /> Departamentos <ChevronDown size={15} />
              </button>

              <div className={`cab-mega ${megaAberto ? 'cab-mega--aberto' : ''}`} inert={!megaAberto}>
                <div className="cab-mega-grade">
                  {DEPARTAMENTOS.map(({ nome, descricao, busca: termo, foto, icone: Icone }) => (
                    <button key={nome} className="cab-mega-item" onClick={() => escolherDepartamento(termo)}>
                      <span className="cab-mega-foto">
                        {foto ? <img src={foto} alt="" loading="lazy" /> : <Icone size={30} strokeWidth={1.6} />}
                      </span>
                      <span><strong>{nome}</strong><small>{descricao}</small></span>
                    </button>
                  ))}
                </div>
                <div className="cab-mega-chamada">
                  <strong>Tem a lista da obra pronta?</strong>
                  <p>Mande pelo WhatsApp e a nossa equipe monta o orçamento para você.</p>
                  <a href={linkWhatsapp} target="_blank" rel="noreferrer"><MessageCircle size={16} /> Enviar lista</a>
                  <button onClick={() => irParaCatalogo()}>Ver catálogo completo <ArrowRight size={15} /></button>
                </div>
              </div>
            </div>

            <nav className="cab-links" aria-label="Seções do site">
              {LINKS.map(([id, rotulo]) => linkSecao(id, rotulo))}
            </nav>

            <span className="cab-nav-selo"><Truck size={15} /> Entrega na região</span>
          </div>
        </div>
      </header>

      {/* Menu do celular */}
      <div className={`cab-mobile-fundo ${menuMobile ? 'aberto' : ''}`} onClick={() => setMenuMobile(false)} />
      <aside className={`cab-mobile ${menuMobile ? 'aberto' : ''}`} inert={!menuMobile} aria-label="Menu">
        <div className="cab-mobile-topo">
          <img src="/images/logotipo.png" alt="Comercial Pancotti" />
          <button onClick={() => setMenuMobile(false)} aria-label="Fechar menu"><X size={22} /></button>
        </div>
        <span className="cab-mobile-titulo">Departamentos</span>
        <div className="cab-mobile-deps">
          {DEPARTAMENTOS.map(({ nome, busca: termo, foto, icone: Icone }) => (
            <button key={nome} onClick={() => escolherDepartamento(termo)}>
              <span>{foto ? <img src={foto} alt="" loading="lazy" /> : <Icone size={20} />}</span>
              {nome}
              <ChevronRight size={16} />
            </button>
          ))}
        </div>
        <span className="cab-mobile-titulo">Navegação</span>
        <nav className="cab-mobile-links">
          {LINKS.map(([id, rotulo]) => linkSecao(id, rotulo, { onClick: () => setMenuMobile(false) }))}
          <Link to="/login" onClick={() => setMenuMobile(false)}><Lock size={15} /> Área do lojista</Link>
        </nav>
        <div className="cab-mobile-contato">
          <a href={linkWhatsapp} target="_blank" rel="noreferrer"><MessageCircle size={18} /> Chamar no WhatsApp</a>
          <a href={linkTelefone}><Phone size={16} /> {LOJA.telefone}</a>
          <small>{LOJA.horario}</small>
        </div>
      </aside>
    </>
  );
}
