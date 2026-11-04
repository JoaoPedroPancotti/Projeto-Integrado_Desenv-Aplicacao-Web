import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search, X, ShoppingCart, Plus, Minus, Check, Trash2, Truck,
  MessageCircle, ArrowRight, PackageSearch, RefreshCw, WifiOff,
  ChevronRight, SlidersHorizontal, ShieldCheck, Headphones
} from 'lucide-react';
import api from '../services/api';
import { carregarOrcamento, salvarOrcamento } from '../services/orcamento';
import './Vitrine.css';

const DEPARTAMENTOS = [
  ['Todos', ''], ['Materiais básicos', 'cimento'], ['Tijolos e blocos', 'tijolo'],
  ['Hidráulica', 'hidráulica'], ['Elétrica', 'elétrica'],
  ['Tintas', 'tinta'], ['Ferramentas', 'ferramenta']
];

export default function Vitrine() {
  const navigate = useNavigate();
  const [parametrosBusca] = useSearchParams();
  const [produtos, setProdutos] = useState([]);
  const [status, setStatus] = useState('carregando');
  const [busca, setBusca] = useState(() => parametrosBusca.get('busca') ?? '');
  const [carrinho, setCarrinho] = useState(carregarOrcamento);
  const [quantidades, setQuantidades] = useState({});
  const [gavetaAberta, setGavetaAberta] = useState(false);
  const [aviso, setAviso] = useState(null);

  const buscarProdutos = () => {
    api.get('/produtos')
      .then(({ data }) => {
        const produtosAtivos = data.filter(produto => produto.ativo !== 0 && produto.ativo !== false);
        setProdutos(produtosAtivos);
        setCarrinho(itens => itens.map(item => {
          const produtoAtual = produtosAtivos.find(produto => produto.id === item.id);
          return produtoAtual ? { ...item, imagem_url: produtoAtual.imagem_url } : item;
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
  const filtrados = produtos.filter(produto => !termo || `${produto.nome} ${produto.descricao ?? ''}`.toLowerCase().includes(termo));
  const totalUnidades = carrinho.reduce((total, item) => total + item.quantidade, 0);
  const quantidadeCard = id => quantidades[id] ?? 1;
  const itemNoCarrinho = id => carrinho.find(item => item.id === id);

  const alterarQuantidadeCard = (id, delta) => setQuantidades(atual => ({ ...atual, [id]: Math.max(1, (atual[id] ?? 1) + delta) }));
  const alterarQuantidadeCarrinho = (id, delta) => setCarrinho(itens => itens.map(item => item.id === id ? { ...item, quantidade: Math.max(1, item.quantidade + delta) } : item));
  const remover = id => setCarrinho(itens => itens.filter(item => item.id !== id));

  const adicionar = produto => {
    const quantidade = quantidadeCard(produto.id);
    setCarrinho(itens => {
      const existente = itens.find(item => item.id === produto.id);
      return existente
        ? itens.map(item => item.id === produto.id ? { ...item, quantidade: item.quantidade + quantidade } : item)
        : [...itens, { id: produto.id, nome: produto.nome, imagem_url: produto.imagem_url, quantidade }];
    });
    setQuantidades(atual => ({ ...atual, [produto.id]: 1 }));
    setAviso(`${quantidade}× ${produto.nome}`);
  };

  const finalizar = () => navigate('/checkout', { state: { carrinho } });

  return (
    <div className="cat">
      <div className="cat-faixa"><span>Comercial Pancotti · Materiais para construção</span><span>Orçamento personalizado e entrega na região</span></div>

      <header className="cat-cabecalho">
        <div className="cat-topo">
          <Link to="/" className="cat-logo"><img src="/logotipo-claro.png" alt="Comercial Pancotti" /></Link>
          <label className="cat-busca">
            <Search size={19} />
            <input type="search" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Busque cimento, ferramentas, tintas..." aria-label="Buscar produtos" />
            {busca && <button onClick={() => setBusca('')} aria-label="Limpar busca"><X size={17} /></button>}
          </label>
          <button className="cat-botao-orcamento" onClick={() => setGavetaAberta(true)}>
            <ShoppingCart size={21} /><span><small>Minha lista</small><strong>Orçamento</strong></span><em>{totalUnidades}</em>
          </button>
        </div>
        <nav className="cat-navegacao">
          {DEPARTAMENTOS.map(([nome, valor]) => <button key={nome} className={busca === valor ? 'ativo' : ''} onClick={() => setBusca(valor)}>{nome}</button>)}
        </nav>
      </header>

      <main>
        <section className="cat-intro">
          <div><span className="cat-etiqueta">Catálogo de produtos</span><h1>Materiais para cada etapa da sua obra.</h1><p>Escolha os itens e quantidades. Nossa equipe retorna com preços, prazo e condições de entrega.</p></div>
          <div className="cat-intro-selos"><span><ShieldCheck size={18} /> Sem cadastro</span><span><Truck size={18} /> Entrega na região</span><span><Headphones size={18} /> Atendimento humano</span></div>
        </section>

        <div className="cat-conteudo">
          <aside className="cat-lateral">
            <div className="cat-lateral-titulo"><SlidersHorizontal size={17} /><strong>Departamentos</strong></div>
            {DEPARTAMENTOS.map(([nome, valor]) => <button key={nome} className={busca === valor ? 'ativo' : ''} onClick={() => setBusca(valor)}><span>{nome}</span><ChevronRight size={15} /></button>)}
            <div className="cat-ajuda"><MessageCircle size={23} /><strong>Precisa de ajuda?</strong><p>Nossa equipe ajuda você a encontrar o material certo.</p><a href="https://wa.me/5519994943399" target="_blank" rel="noreferrer">Falar com a loja</a></div>
          </aside>

          <section className="cat-listagem">
            <div className="cat-listagem-topo">
              <p><strong>{filtrados.length}</strong> {filtrados.length === 1 ? 'produto encontrado' : 'produtos encontrados'}{termo && <> para “{busca.trim()}”</>}</p>
              {termo && <button onClick={() => setBusca('')}>Limpar filtro <X size={14} /></button>}
            </div>

            {status === 'carregando' && <div className="cat-grade">{Array.from({ length: 6 }, (_, i) => <div key={i} className="cat-card cat-card--esqueleto" />)}</div>}
            {status === 'erro' && <div className="cat-estado"><WifiOff size={38} /><h3>Não foi possível carregar o catálogo</h3><p>Verifique sua conexão com o servidor e tente novamente.</p><button onClick={() => { setStatus('carregando'); buscarProdutos(); }}><RefreshCw size={17} /> Tentar novamente</button></div>}
            {status === 'ok' && filtrados.length === 0 && <div className="cat-estado"><PackageSearch size={38} /><h3>Nenhum produto encontrado</h3><p>Tente buscar outro termo ou consulte nossa equipe.</p><button onClick={() => setBusca('')}>Ver todos os produtos</button></div>}

            {status === 'ok' && filtrados.length > 0 && (
              <div className="cat-grade">
                {filtrados.map((produto, indice) => {
                  const item = itemNoCarrinho(produto.id);
                  return (
                    <article key={produto.id} className={`cat-card ${item ? 'cat-card--adicionado' : ''}`} style={{ animationDelay: `${Math.min(indice, 8) * 45}ms` }}>
                      <div className="cat-card-foto">
                        {produto.imagem_url ? <img src={produto.imagem_url} alt={produto.nome} loading="lazy" /> : <span>{produto.nome.charAt(0)}</span>}
                        <small>Disponível</small>
                        {item && <em><Check size={13} /> {item.quantidade} na lista</em>}
                      </div>
                      <div className="cat-card-corpo">
                        <span className="cat-card-categoria">Material para construção</span>
                        <h2>{produto.nome}</h2>
                        <p>{produto.descricao || 'Consulte quantidade, disponibilidade e condições de entrega.'}</p>
                        <div className="cat-card-preco"><small>Preço</small><strong>Sob consulta</strong></div>
                        <div className="cat-card-acoes">
                          <div className="cat-qtd"><button onClick={() => alterarQuantidadeCard(produto.id, -1)} aria-label="Diminuir"><Minus size={15} /></button><span>{quantidadeCard(produto.id)}</span><button onClick={() => alterarQuantidadeCard(produto.id, 1)} aria-label="Aumentar"><Plus size={15} /></button></div>
                          <button className="cat-adicionar" onClick={() => adicionar(produto)}><ShoppingCart size={17} /> Adicionar</button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      {carrinho.length > 0 && !gavetaAberta && <button className="cat-barra-mobile" onClick={() => setGavetaAberta(true)}><span><ShoppingCart size={18} /> {totalUnidades} {totalUnidades === 1 ? 'item' : 'itens'}</span><strong>Ver orçamento <ArrowRight size={16} /></strong></button>}
      {aviso && <div className="cat-aviso" role="status"><span><Check size={16} /></span><div><strong>Produto adicionado</strong><small>{aviso}</small></div><button onClick={() => setGavetaAberta(true)}>Ver lista</button></div>}

      <div className={`cat-overlay ${gavetaAberta ? 'aberto' : ''}`} onClick={() => setGavetaAberta(false)} />
      <aside className={`cat-carrinho ${gavetaAberta ? 'aberto' : ''}`} inert={!gavetaAberta}>
        <div className="cat-carrinho-topo"><div><span>Seu orçamento</span><h2>Lista de materiais</h2></div><button onClick={() => setGavetaAberta(false)} aria-label="Fechar"><X size={20} /></button></div>
        <div className="cat-carrinho-resumo"><ShoppingCart size={18} /><span><strong>{totalUnidades} {totalUnidades === 1 ? 'item selecionado' : 'itens selecionados'}</strong>Preços serão informados pela loja</span></div>
        {carrinho.length === 0 ? (
          <div className="cat-carrinho-vazio"><PackageSearch size={42} /><h3>Sua lista está vazia</h3><p>Adicione produtos para solicitar um orçamento.</p><button onClick={() => setGavetaAberta(false)}>Explorar catálogo</button></div>
        ) : (
          <ul className="cat-carrinho-lista">{carrinho.map(item => <li key={item.id}>
            {item.imagem_url ? <img src={item.imagem_url} alt="" /> : <span className="cat-carrinho-inicial">{item.nome.charAt(0)}</span>}
            <div><strong>{item.nome}</strong><small>Preço sob consulta</small><div className="cat-qtd"><button onClick={() => alterarQuantidadeCarrinho(item.id, -1)}><Minus size={13} /></button><span>{item.quantidade}</span><button onClick={() => alterarQuantidadeCarrinho(item.id, 1)}><Plus size={13} /></button></div></div>
            <button className="cat-remover" onClick={() => remover(item.id)} aria-label={`Remover ${item.nome}`}><Trash2 size={17} /></button>
          </li>)}</ul>
        )}
        <div className="cat-carrinho-rodape"><div><ShieldCheck size={17} /><p>Você poderá revisar os itens e informar os dados de entrega na próxima etapa.</p></div><button onClick={finalizar} disabled={!carrinho.length}>Continuar para orçamento <ArrowRight size={18} /></button><small>Sem compromisso · Não é necessário criar conta</small></div>
      </aside>
    </div>
  );
}
