import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  X, ShoppingCart, Plus, Check, Truck,
  MessageCircle, ArrowRight, PackageSearch, RefreshCw, WifiOff,
  ChevronRight, ShieldCheck, Headphones, ClipboardList
} from 'lucide-react';
import { catalogoApi } from '../services/api/catalogo';
import { carregarOrcamento, salvarOrcamento } from '../services/listaOrcamento';
import Cabecalho from '../components/layout/Cabecalho';
import useSeo from '../hooks/useSeo';
import SeletorQuantidade from '../components/catalogo/SeletorQuantidade';
import ListaOrcamento from '../components/catalogo/ListaOrcamento';
import { FILTROS_CATALOGO } from '../data/departamentos';
import { linkWhatsapp } from '../data/loja';
import { nomeUnidade } from '../utils/formatacao';
import '../styles/pages/Vitrine.css';

export default function Vitrine() {
  const navigate = useNavigate();
  const [parametrosBusca] = useSearchParams();
  const [produtos, setProdutos] = useState([]);
  const [status, setStatus] = useState('carregando');
  const [busca, setBusca] = useState(() => parametrosBusca.get('busca') ?? '');
  const [ordem, setOrdem] = useState('az');
  const [carrinho, setCarrinho] = useState(carregarOrcamento);
  const location = useLocation();
  // vindo do botão "Orçamento" de outra página, já abre a lista
  const [gavetaAberta, setGavetaAberta] = useState(() => Boolean(location.state?.abrirLista));
  const [aviso, setAviso] = useState(null);

  const buscarProdutos = () => {
    catalogoApi.listarProdutos()
      .then(data => {
        const produtosAtivos = data.filter(produto => produto.ativo !== 0 && produto.ativo !== false);
        setProdutos(produtosAtivos);
        setCarrinho(itens => itens.map(item => {
          const produtoAtual = produtosAtivos.find(produto => produto.id === item.id);
          return produtoAtual ? { ...item, imagem_url: produtoAtual.imagem_url, unidade: produtoAtual.unidade } : item;
        }));
        setStatus('ok');
      })
      .catch(erro => {
        console.error('Erro ao buscar produtos:', erro);
        setStatus('erro');
      });
  };

  useEffect(() => { buscarProdutos(); }, []);
  useEffect(() => { salvarOrcamento(carrinho); }, [carrinho]);
  useEffect(() => {
    if (!aviso) return undefined;
    const timer = setTimeout(() => setAviso(null), 3200);
    return () => clearTimeout(timer);
  }, [aviso]);
  useEffect(() => {
    if (!gavetaAberta) return undefined;
    const fechar = e => e.key === 'Escape' && setGavetaAberta(false);
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', fechar);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', fechar); };
  }, [gavetaAberta]);

  const termo = busca.trim().toLowerCase();
  const filtrados = produtos
    .filter(produto => !termo || `${produto.nome} ${produto.descricao ?? ''}`.toLowerCase().includes(termo))
    .sort((a, b) => (ordem === 'za' ? -1 : 1) * a.nome.localeCompare(b.nome, 'pt-BR'));
  const totalItens = carrinho.length;
  const itemNoCarrinho = id => carrinho.find(item => item.id === id);
  const departamentoAtual = FILTROS_CATALOGO.find(([, valor]) => valor === busca);
  const emDepartamento = Boolean(departamentoAtual && departamentoAtual[1]);
  useSeo({
    titulo: emDepartamento
      ? `${departamentoAtual[0]} em São João da Boa Vista`
      : 'Catálogo de Materiais de Construção',
    descricao: emDepartamento
      ? `${departamentoAtual[0]}: veja os produtos da Comercial Pancotti em São João da Boa Vista - SP e peça orçamento online com entrega na região.`
      : 'Catálogo online da Comercial Pancotti: cimento, areia, tijolos, tubos, fios, tintas e ferramentas. Monte sua lista e peça orçamento sem cadastro.',
    caminho: emDepartamento ? `/catalogo?busca=${encodeURIComponent(departamentoAtual[1])}` : '/catalogo',
    noindex: Boolean(busca.trim() && !departamentoAtual),
  });
  const titulo = departamentoAtual
    ? (departamentoAtual[1] ? departamentoAtual[0] : 'Todos os produtos')
    : `Resultados para “${busca.trim()}”`;

  const definirQuantidade = (id, quantidade) => setCarrinho(itens => itens.map(item => (item.id === id ? { ...item, quantidade } : item)));
  const remover = id => setCarrinho(itens => itens.filter(item => item.id !== id));

  const adicionar = produto => {
    setCarrinho(itens => [...itens, { id: produto.id, nome: produto.nome, imagem_url: produto.imagem_url, unidade: produto.unidade, quantidade: 1 }]);
    setAviso(produto.nome);
  };

  const finalizar = () => navigate('/checkout', { state: { carrinho } });

  const rodapeOrcamento = (
    <div className="cat-orcamento-rodape">
      <button onClick={finalizar} disabled={!carrinho.length}>Continuar para orçamento <ArrowRight size={18} /></button>
      <small><ShieldCheck size={14} /> Sem compromisso e sem criar conta</small>
    </div>
  );

  return (
    <div className="cat">
      <Cabecalho busca={busca} onBusca={setBusca} onDepartamento={setBusca} onAbrirOrcamento={() => setGavetaAberta(true)} />

      <main>
        <div className="cat-topo-pagina">
          <nav className="cat-trilha" aria-label="Você está em">
            <Link to="/">Início</Link><ChevronRight size={14} />
            <button onClick={() => setBusca('')}>Catálogo</button>
            {busca && <><ChevronRight size={14} /><span>{departamentoAtual ? departamentoAtual[0] : 'Busca'}</span></>}
          </nav>
          <div className="cat-titulo-linha">
            <div>
              <h1>{titulo}</h1>
              <p>{status === 'ok' ? `${filtrados.length} ${filtrados.length === 1 ? 'produto' : 'produtos'}` : 'Carregando produtos'} · preços enviados no orçamento</p>
            </div>
            <label className="cat-ordem">
              <span>Ordenar por</span>
              <select value={ordem} onChange={e => setOrdem(e.target.value)}>
                <option value="az">Nome (A–Z)</option>
                <option value="za">Nome (Z–A)</option>
              </select>
            </label>
          </div>
          <div className="cat-chips" role="group" aria-label="Departamentos">
            {FILTROS_CATALOGO.map(([nome, valor]) => <button key={nome} className={busca === valor ? 'ativo' : ''} onClick={() => setBusca(valor)}>{nome}</button>)}
          </div>
        </div>

        <div className="cat-conteudo">
          <section className="cat-listagem" aria-label="Produtos">
            {status === 'carregando' && <div className="cat-grade">{Array.from({ length: 6 }, (_, i) => <div key={i} className="cat-card cat-card--esqueleto" />)}</div>}
            {status === 'erro' && <div className="cat-estado"><WifiOff size={38} /><h3>Não foi possível carregar o catálogo</h3><p>Verifique sua conexão e tente novamente.</p><button onClick={() => { setStatus('carregando'); buscarProdutos(); }}><RefreshCw size={17} /> Tentar novamente</button></div>}
            {status === 'ok' && filtrados.length === 0 && <div className="cat-estado"><PackageSearch size={38} /><h3>Nenhum produto encontrado</h3><p>Tente outro termo ou fale com a nossa equipe, que encontramos para você.</p><div className="cat-estado-acoes"><button onClick={() => setBusca('')}>Ver todos os produtos</button><a href={linkWhatsapp} target="_blank" rel="noreferrer"><MessageCircle size={16} /> Perguntar à loja</a></div></div>}

            {status === 'ok' && filtrados.length > 0 && (
              <div className="cat-grade">
                {filtrados.map((produto, indice) => {
                  const item = itemNoCarrinho(produto.id);
                  const unidade = nomeUnidade(produto.unidade);
                  return (
                    <article key={produto.id} className={`cat-card ${item ? 'cat-card--adicionado' : ''}`} style={{ animationDelay: `${Math.min(indice, 8) * 45}ms` }}>
                      <div className="cat-card-foto">
                        {produto.imagem_url ? <img src={produto.imagem_url} alt={produto.nome} loading="lazy" /> : <span>{produto.nome.charAt(0)}</span>}
                        {item && <em><Check size={13} /> Na lista</em>}
                      </div>
                      <div className="cat-card-corpo">
                        <h2>{produto.nome}</h2>
                        <p>{produto.descricao || 'Consulte quantidade, disponibilidade e condições de entrega.'}</p>
                        <div className="cat-card-info">
                          {unidade && <span>Vendido por {unidade}</span>}
                          <strong>Preço sob consulta</strong>
                        </div>
                        {item ? (
                          <div className="cat-card-na-lista">
                            <SeletorQuantidade valor={item.quantidade} rotulo={produto.nome} onMudar={n => definirQuantidade(produto.id, n)} onRemover={() => remover(produto.id)} />
                            <span>{unidade ? `${unidade}${item.quantidade > 1 ? 's' : ''}`.replace(/([²³])s$/, '$1') : 'na lista'}</span>
                          </div>
                        ) : (
                          <button className="cat-adicionar" onClick={() => adicionar(produto)}><Plus size={17} /> Adicionar à lista</button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="cat-painel" aria-label="Seu orçamento">
            <div className="cat-painel-caixa">
              <div className="cat-painel-topo">
                <ClipboardList size={20} />
                <strong>Seu orçamento</strong>
                <span>{totalItens} {totalItens === 1 ? 'item' : 'itens'}</span>
              </div>
              {carrinho.length === 0 ? (
                <div className="cat-painel-vazio">
                  <p>Sua lista está vazia.</p>
                  <small>Adicione produtos e ajuste as quantidades aqui. A loja responde com preço, frete e prazo.</small>
                </div>
              ) : (
                <ListaOrcamento carrinho={carrinho} definirQuantidade={definirQuantidade} remover={remover} />
              )}
              {rodapeOrcamento}
            </div>
            <ul className="cat-garantias">
              <li><ShieldCheck size={17} /> Sem cadastro</li>
              <li><Truck size={17} /> Entrega na região</li>
              <li><Headphones size={17} /> Atendimento humano</li>
            </ul>
            <a className="cat-painel-ajuda" href={linkWhatsapp} target="_blank" rel="noreferrer">
              <MessageCircle size={18} /><span><strong>Não achou um produto?</strong>Pergunte à loja pelo WhatsApp</span><ChevronRight size={16} />
            </a>
          </aside>
        </div>
      </main>

      {carrinho.length > 0 && !gavetaAberta && <button className="cat-barra-mobile" onClick={() => setGavetaAberta(true)}><span><ShoppingCart size={18} /> {totalItens} {totalItens === 1 ? 'item' : 'itens'} na lista</span><strong>Ver orçamento <ArrowRight size={16} /></strong></button>}
      {aviso && <div className="cat-aviso" role="status"><span><Check size={16} /></span><div><strong>Adicionado à lista</strong><small>{aviso}</small></div><button onClick={() => setGavetaAberta(true)}>Ver lista</button></div>}

      <div className={`cat-overlay ${gavetaAberta ? 'aberto' : ''}`} onClick={() => setGavetaAberta(false)} />
      <aside className={`cat-carrinho ${gavetaAberta ? 'aberto' : ''}`} inert={!gavetaAberta} aria-label="Lista de materiais">
        <div className="cat-carrinho-topo"><div><span>Seu orçamento</span><h2>Lista de materiais</h2></div><button onClick={() => setGavetaAberta(false)} aria-label="Fechar"><X size={20} /></button></div>
        {carrinho.length === 0 ? (
          <div className="cat-carrinho-vazio"><PackageSearch size={42} /><h3>Sua lista está vazia</h3><p>Adicione produtos para solicitar um orçamento.</p><button onClick={() => setGavetaAberta(false)}>Explorar catálogo</button></div>
        ) : (
          <div className="cat-carrinho-itens"><ListaOrcamento carrinho={carrinho} definirQuantidade={definirQuantidade} remover={remover} /></div>
        )}
        {rodapeOrcamento}
      </aside>
    </div>
  );
}
