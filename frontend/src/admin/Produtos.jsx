import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2, Package, X, ArrowLeftRight, Download } from 'lucide-react';
import api from '../services/api';
import { Carregando, SeloEstoque, Vazio } from './componentes';
import FormProduto from './FormProduto';
import MovimentarEstoque from './MovimentarEstoque';
import { baixarCSV, dinheiro, margem, mensagemErro, percentual, produtoCombina, quantidade, situacaoEstoque, SITUACOES_ESTOQUE } from './util';

const FILTROS = [
  ['', 'Todos'], ['ativos', 'No site'], ['inativos', 'Desativados'], ['sem-preco', 'Sem preço'], ['sem-custo', 'Sem custo'],
  ['baixo', 'Abaixo do mínimo'], ['zerado', 'Sem estoque'], ['negativo', 'Negativo'],
];

function passaFiltro(p, filtro) {
  switch (filtro) {
    case 'ativos': return p.ativo;
    case 'inativos': return !p.ativo;
    case 'sem-preco': return p.ativo && p.preco === null;
    case 'sem-custo': return p.ativo && p.controla_estoque && p.custo === null;
    case 'baixo': case 'zerado': case 'negativo': return situacaoEstoque(p) === filtro;
    default: return true;
  }
}

export default function Produtos() {
  const { avisar } = useOutletContext();
  const navigate = useNavigate();
  const [parametros, setParametros] = useSearchParams();
  const [produtos, setProdutos] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState('');
  const [editando, setEditando] = useState(null);
  const [movimentando, setMovimentando] = useState(null);
  const filtro = parametros.get('filtro') || '';
  const fornecedor = parametros.get('fornecedor') || '';

  const carregar = () => api.get('/admin/produtos').then(({ data }) => setProdutos(data)).catch(() => setProdutos([]));
  useEffect(() => {
    carregar();
    api.get('/admin/categorias').then(({ data }) => setCategorias(data)).catch(() => {});
    api.get('/admin/fornecedores').then(({ data }) => setFornecedores(data)).catch(() => {});
  }, []);

  const mudarParametro = (chave, valor) => {
    const novos = new URLSearchParams(parametros);
    if (valor) novos.set(chave, valor); else novos.delete(chave);
    setParametros(novos);
  };

  const filtrados = useMemo(() => (produtos || []).filter(p => passaFiltro(p, filtro)
    && (!categoria || String(p.categoria_id) === categoria)
    && (!fornecedor || String(p.fornecedor_id) === fornecedor)
    && produtoCombina(p, busca)), [produtos, busca, categoria, fornecedor, filtro]);

  const contagem = useMemo(() => Object.fromEntries(FILTROS.map(([f]) => [f, (produtos || []).filter(p => passaFiltro(p, f)).length])), [produtos]);

  const alternarAtivo = async produto => {
    try {
      await api.patch(`/admin/produtos/${produto.id}/ativo`, { ativo: !produto.ativo });
      setProdutos(lista => lista.map(p => (p.id === produto.id ? { ...p, ativo: !produto.ativo } : p)));
      avisar(produto.ativo ? `"${produto.nome}" saiu do site.` : `"${produto.nome}" voltou para o site.`);
    } catch (falha) {
      avisar(mensagemErro(falha, 'Não foi possível alterar o produto.'), 'erro');
    }
  };

  const excluir = async produto => {
    if (!window.confirm(`Excluir "${produto.nome}"?`)) return;
    try {
      await api.delete(`/admin/produtos/${produto.id}`);
      setProdutos(lista => lista.filter(p => p.id !== produto.id));
      avisar('Produto excluído.');
    } catch (falha) {
      avisar(mensagemErro(falha, 'Não foi possível excluir o produto.'), 'erro');
    }
  };

  const exportar = () => baixarCSV('produtos', [
    ['Código', p => p.codigo], ['Código de barras', p => p.codigo_barras], ['Produto', p => p.nome], ['Marca', p => p.marca],
    ['Categoria', p => p.categoria_nome], ['Fornecedor', p => p.fornecedor_nome], ['Unidade', p => p.unidade],
    ['Estoque', p => p.estoque], ['Reservado', p => p.reservado], ['Disponível', p => p.disponivel],
    ['Mínimo', p => p.estoque_minimo], ['Máximo', p => p.estoque_maximo], ['Localização', p => p.localizacao],
    ['Custo', p => p.custo], ['Preço', p => p.preco], ['Margem %', p => margem(p.preco, p.custo)],
    ['Situação', p => SITUACOES_ESTOQUE[situacaoEstoque(p)]], ['No site', p => (p.ativo ? 'Sim' : 'Não')],
  ], filtrados);

  return (
    <>
      <div className="adm-cabecalho">
        <div><span className="adm-etiqueta">Estoque</span><h1>Produtos</h1><p>Cadastro completo: código, código de barras, custo, preço, estoque mínimo/máximo e localização. Clique em um produto para ver o histórico.</p></div>
        <div className="adm-acoes">
          <button className="adm-botao" onClick={exportar} disabled={!filtrados.length}><Download size={16} /> Exportar</button>
          <button className="adm-botao adm-botao--primario" onClick={() => setEditando({})}><Plus size={17} /> Novo produto</button>
        </div>
      </div>

      <div className="adm-abas">
        {FILTROS.map(([valor, nome]) => <button key={valor} className={filtro === valor ? 'ativo' : ''} onClick={() => mudarParametro('filtro', valor)}>{nome} <em>{contagem[valor]}</em></button>)}
      </div>

      <section className="adm-cartao adm-cartao--sem-espaco">
        <div className="adm-barra">
          <label className="adm-busca"><Search size={17} /><input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Código, código de barras, nome ou marca" />{busca && <button onClick={() => setBusca('')} aria-label="Limpar busca"><X size={15} /></button>}</label>
          <select className="adm-select" value={categoria} onChange={e => setCategoria(e.target.value)} aria-label="Filtrar por categoria"><option value="">Todas as categorias</option>{categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select>
          <select className="adm-select" value={fornecedor} onChange={e => mudarParametro('fornecedor', e.target.value)} aria-label="Filtrar por fornecedor"><option value="">Todos os fornecedores</option>{fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}</select>
          <span className="adm-mudo">{filtrados.length} {filtrados.length === 1 ? 'produto' : 'produtos'}</span>
        </div>

        {!produtos && <Carregando />}
        {produtos && !filtrados.length && <Vazio icone={Package} titulo="Nenhum produto encontrado" texto="Ajuste os filtros ou cadastre um novo produto." />}
        {produtos && filtrados.length > 0 && (
          <div className="adm-tabela-rolagem">
            <table className="adm-tabela">
              <thead><tr><th>Produto</th><th className="adm-col-opcional">Categoria</th><th>Estoque</th><th>Preço / custo</th><th>No site</th><th aria-label="Ações" /></tr></thead>
              <tbody>
                {filtrados.map(produto => {
                  const m = margem(produto.preco, produto.custo);
                  return (
                    <tr key={produto.id} className={produto.ativo ? '' : 'adm-linha-inativa'} onClick={() => navigate(`/admin/produtos/${produto.id}`)}>
                      <td>
                        <div className="adm-produto-celula">
                          {produto.imagem_url ? <img src={produto.imagem_url} alt="" /> : <span className="adm-miniatura">{produto.nome.charAt(0)}</span>}
                          <div><strong>{produto.nome}</strong><small><code className="adm-codigo">{produto.codigo}</code>{produto.marca && ` · ${produto.marca}`}{produto.localizacao && ` · ${produto.localizacao}`}</small></div>
                        </div>
                      </td>
                      <td data-rotulo="Categoria" className="adm-col-opcional">{produto.categoria_nome || <span className="adm-mudo">Sem categoria</span>}</td>
                      <td data-rotulo="Estoque">
                        {produto.controla_estoque ? (
                          <>
                            <strong className={produto.estoque < 0 ? 'adm-qtd-sai' : ''}>{quantidade(produto.estoque)} {produto.unidade || 'un'}</strong>
                            <small>{produto.reservado > 0 ? `${quantidade(produto.disponivel)} disponível · ` : ''}<SeloEstoque produto={produto} /></small>
                          </>
                        ) : <span className="adm-mudo">Não controla</span>}
                      </td>
                      <td data-rotulo="Preço / custo">
                        {produto.preco !== null ? <strong>{dinheiro(produto.preco)}</strong> : <span className="adm-texto-alerta">Sem preço</span>}
                        <small>{produto.custo !== null ? `custo ${dinheiro(produto.custo)} · margem ${percentual(m)}` : 'sem custo'}</small>
                      </td>
                      <td data-rotulo="No site" onClick={e => e.stopPropagation()}><button className={`adm-interruptor ${produto.ativo ? 'ligado' : ''}`} role="switch" aria-checked={Boolean(produto.ativo)} onClick={() => alternarAtivo(produto)} aria-label={`Mostrar ${produto.nome} no site`}><span /></button></td>
                      <td data-acoes onClick={e => e.stopPropagation()}>
                        <div className="adm-acoes-linha">
                          <button className="adm-icone-botao" onClick={() => setMovimentando(produto)} title="Movimentar estoque" aria-label={`Movimentar estoque de ${produto.nome}`}><ArrowLeftRight size={16} /></button>
                          <button className="adm-icone-botao" onClick={() => setEditando(produto)} title="Editar" aria-label={`Editar ${produto.nome}`}><Pencil size={16} /></button>
                          <button className="adm-icone-botao" onClick={() => excluir(produto)} title="Excluir" aria-label={`Excluir ${produto.nome}`}><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editando && (
        <FormProduto
          produto={editando}
          onFechar={() => setEditando(null)}
          onSalvo={(novo, resposta) => { setEditando(null); carregar(); avisar(novo ? `Produto cadastrado com o código ${resposta?.codigo}.` : 'Produto atualizado.'); }}
        />
      )}
      {movimentando && (
        <MovimentarEstoque
          produto={movimentando}
          onFechar={() => setMovimentando(null)}
          onSalvo={() => { setMovimentando(null); carregar(); avisar('Movimentação registrada.'); }}
        />
      )}
    </>
  );
}
