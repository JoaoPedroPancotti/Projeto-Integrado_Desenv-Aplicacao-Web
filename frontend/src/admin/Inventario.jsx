// Inventário: digita o que foi contado e o sistema ajusta a diferença de cada produto.
// A contagem fica salva neste navegador até ser aplicada (dá para contar aos poucos).
import { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { ArrowLeft, Search, X, Printer, ClipboardCheck, LoaderCircle, Eraser } from 'lucide-react';
import api from '../services/api';
import { Carregando, Vazio } from './componentes';
import { dinheiro, lerNumero, mensagemErro, produtoCombina, quantidade } from './util';

const CHAVE_RASCUNHO = 'pancotti-inventario';

function lerRascunho() {
  try { return JSON.parse(localStorage.getItem(CHAVE_RASCUNHO)) || {}; } catch { return {}; }
}

export default function Inventario() {
  const { avisar } = useOutletContext();
  const [produtos, setProdutos] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [contagem, setContagem] = useState(lerRascunho);
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState('');
  const [local, setLocal] = useState('');
  const [mostrar, setMostrar] = useState('todos');
  const [observacao, setObservacao] = useState('');
  const [aplicando, setAplicando] = useState(false);

  const carregar = () => api.get('/admin/produtos').then(({ data }) => setProdutos(data.filter(p => p.controla_estoque)
    .sort((a, b) => (a.localizacao || '~').localeCompare(b.localizacao || '~', 'pt-BR', { numeric: true }) || a.nome.localeCompare(b.nome, 'pt-BR'))))
    .catch(() => setProdutos([]));
  useEffect(() => {
    carregar();
    api.get('/admin/categorias').then(({ data }) => setCategorias(data)).catch(() => {});
  }, []);

  useEffect(() => {
    try { localStorage.setItem(CHAVE_RASCUNHO, JSON.stringify(contagem)); } catch { /* navegador sem armazenamento */ }
  }, [contagem]);

  const locais = useMemo(() => [...new Set((produtos || []).map(p => p.localizacao).filter(Boolean))].sort(), [produtos]);

  const linhas = useMemo(() => (produtos || []).map(p => {
    const contado = lerNumero(contagem[p.id]);
    const diferenca = contado === null ? null : Math.round((contado - p.estoque) * 1000) / 1000;
    return { ...p, contado, diferenca };
  }), [produtos, contagem]);

  const filtradas = linhas.filter(l => (!categoria || String(l.categoria_id) === categoria)
    && (!local || l.localizacao === local)
    && (mostrar === 'todos' || (mostrar === 'pendentes' ? l.contado === null : mostrar === 'divergentes' ? l.diferenca : l.contado !== null))
    && produtoCombina(l, busca));

  const contadas = linhas.filter(l => l.contado !== null);
  const divergentes = contadas.filter(l => l.diferenca);
  const valorDiferenca = divergentes.reduce((s, l) => s + l.diferenca * (l.custo || 0), 0);

  const mudar = (id, valor) => setContagem(c => {
    const nova = { ...c };
    if (valor === '') delete nova[id]; else nova[id] = valor;
    return nova;
  });

  const limpar = () => {
    if (window.confirm('Apagar toda a contagem digitada?')) setContagem({});
  };

  const aplicar = async () => {
    if (!contadas.length) return;
    const texto = `Aplicar o inventário?\n\n${contadas.length} produtos contados\n${divergentes.length} com diferença (${dinheiro(valorDiferenca)} pelo custo)\n\nProdutos não contados ficam como estão.`;
    if (!window.confirm(texto)) return;
    setAplicando(true);
    try {
      const { data } = await api.post('/admin/estoque/inventario', {
        observacao,
        itens: contadas.map(l => ({ produto_id: l.id, contado: l.contado })),
      });
      setContagem({});
      setObservacao('');
      avisar(data.mensagem);
      carregar();
    } catch (falha) {
      avisar(mensagemErro(falha, 'Não foi possível aplicar o inventário.'), 'erro');
    } finally {
      setAplicando(false);
    }
  };

  if (!produtos) return <Carregando />;

  return (
    <>
      <div className="adm-nao-imprimir">
        <Link to="/admin/estoque" className="adm-voltar"><ArrowLeft size={16} /> Estoque</Link>
        <div className="adm-cabecalho">
          <div><span className="adm-etiqueta">Estoque</span><h1>Inventário</h1><p>Conte o que existe fisicamente e digite abaixo. Só os produtos contados são ajustados. A contagem fica salva neste navegador até você aplicar.</p></div>
          <div className="adm-acoes">
            <button className="adm-botao" onClick={() => window.print()}><Printer size={16} /> Imprimir folha de contagem</button>
            {contadas.length > 0 && <button className="adm-botao adm-botao--perigo" onClick={limpar}><Eraser size={16} /> Limpar contagem</button>}
          </div>
        </div>

        <section className="adm-indicadores adm-indicadores--4">
          <div className="adm-indicador adm-indicador--fixo"><small>Produtos</small><strong>{linhas.length}</strong><p>com controle de estoque</p></div>
          <div className="adm-indicador adm-indicador--fixo"><small>Contados</small><strong>{contadas.length}</strong><p>{linhas.length ? Math.round((contadas.length / linhas.length) * 100) : 0}% do total</p></div>
          <div className={`adm-indicador adm-indicador--fixo ${divergentes.length ? 'adm-indicador--destaque' : ''}`}><small>Com diferença</small><strong>{divergentes.length}</strong><p>serão ajustados</p></div>
          <div className="adm-indicador adm-indicador--fixo"><small>Diferença em valor</small><strong className={valorDiferenca < 0 ? 'adm-qtd-sai' : valorDiferenca > 0 ? 'adm-qtd-entra' : ''}>{dinheiro(valorDiferenca)}</strong><p>pelo custo médio</p></div>
        </section>

        <div className="adm-abas">
          {[['todos', 'Todos'], ['pendentes', 'Não contados'], ['contados', 'Contados'], ['divergentes', 'Com diferença']].map(([v, n]) => <button key={v} className={mostrar === v ? 'ativo' : ''} onClick={() => setMostrar(v)}>{n}</button>)}
        </div>

        <section className="adm-cartao adm-cartao--sem-espaco">
          <div className="adm-barra">
            <label className="adm-busca"><Search size={17} /><input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Código, código de barras ou nome" />{busca && <button onClick={() => setBusca('')} aria-label="Limpar busca"><X size={15} /></button>}</label>
            <select className="adm-select" value={categoria} onChange={e => setCategoria(e.target.value)} aria-label="Categoria"><option value="">Todas as categorias</option>{categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select>
            {locais.length > 0 && <select className="adm-select" value={local} onChange={e => setLocal(e.target.value)} aria-label="Localização"><option value="">Todos os locais</option>{locais.map(l => <option key={l}>{l}</option>)}</select>}
            <span className="adm-mudo">{filtradas.length} produtos</span>
          </div>
          {!filtradas.length ? <Vazio titulo="Nenhum produto aqui" /> : (
            <div className="adm-tabela-rolagem">
              <table className="adm-tabela adm-tabela--itens adm-tabela--inventario">
                <thead><tr><th>Produto</th><th>Local</th><th>No sistema</th><th>Contado</th><th>Diferença</th></tr></thead>
                <tbody>
                  {filtradas.map(l => (
                    <tr key={l.id} className={l.diferenca ? 'adm-linha-divergente' : l.contado !== null ? 'adm-linha-conferida' : ''}>
                      <td><strong>{l.nome}</strong><small><code className="adm-codigo">{l.codigo}</code>{l.codigo_barras && ` · ${l.codigo_barras}`}</small></td>
                      <td className="adm-mudo">{l.localizacao || '—'}</td>
                      <td><span>{quantidade(l.estoque)} <small className="adm-inline">{l.unidade || 'un'}</small></span></td>
                      <td><label className="adm-campo-unidade"><input type="number" min="0" step="0.001" value={contagem[l.id] ?? ''} onChange={e => mudar(l.id, e.target.value)} aria-label={`Quantidade contada de ${l.nome}`} placeholder="—" /><span>{l.unidade || 'un'}</span></label></td>
                      <td>{l.diferenca === null ? <span className="adm-mudo">—</span> : l.diferenca === 0 ? <span className="adm-qtd-ok">confere</span> : <strong className={l.diferenca > 0 ? 'adm-qtd-entra' : 'adm-qtd-sai'}>{l.diferenca > 0 ? '+' : ''}{quantidade(l.diferenca)}<small>{dinheiro(l.diferenca * (l.custo || 0))}</small></strong>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {contadas.length > 0 && (
          <div className="adm-barra-salvar">
            <span>{contadas.length} contados · {divergentes.length} com diferença</span>
            <input className="adm-barra-salvar-input" value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Observação (ex.: inventário de novembro)" maxLength={255} />
            <button className="adm-botao adm-botao--primario" onClick={aplicar} disabled={aplicando}>{aplicando ? <LoaderCircle size={16} className="adm-girando" /> : <ClipboardCheck size={16} />} Aplicar inventário</button>
          </div>
        )}
      </div>

      {/* Folha para contar no papel */}
      <div className="adm-so-impressao">
        <header className="adm-impressao-topo">
          <img src="/logotipo.png" alt="Comercial Pancotti" />
          <div><h1>Folha de contagem</h1><p>{new Date().toLocaleDateString('pt-BR')}{local ? ` · ${local}` : ''}</p></div>
        </header>
        <table>
          <thead><tr><th>Código</th><th>Produto</th><th>Local</th><th>Unid.</th><th>Contado</th></tr></thead>
          <tbody>{filtradas.map(l => <tr key={l.id}><td>{l.codigo}</td><td>{l.nome}</td><td>{l.localizacao || ''}</td><td>{l.unidade || 'un'}</td><td className="adm-impressao-campo" /></tr>)}</tbody>
        </table>
        <footer>Contado por: ______________________________ Conferido por: ______________________________</footer>
      </div>
    </>
  );
}
