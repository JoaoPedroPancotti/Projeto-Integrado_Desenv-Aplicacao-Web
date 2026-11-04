import { useEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2, Package, ImageUp, LoaderCircle, X } from 'lucide-react';
import api from '../services/api';
import { Carregando, Modal, Vazio } from './componentes';
import { UNIDADES, dinheiro, mensagemErro } from './util';

const FILTROS = [['', 'Todos'], ['ativos', 'No site'], ['inativos', 'Desativados'], ['sem-preco', 'Sem preço']];

export default function Produtos() {
  const { avisar } = useOutletContext();
  const [parametros, setParametros] = useSearchParams();
  const [produtos, setProdutos] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState('');
  const [editando, setEditando] = useState(null);
  const filtro = parametros.get('filtro') || '';

  const carregar = () => api.get('/admin/produtos').then(({ data }) => setProdutos(data)).catch(() => setProdutos([]));
  useEffect(() => {
    carregar();
    api.get('/admin/categorias').then(({ data }) => setCategorias(data)).catch(() => {});
  }, []);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (produtos || []).filter(p => {
      if (filtro === 'ativos' && !p.ativo) return false;
      if (filtro === 'inativos' && p.ativo) return false;
      if (filtro === 'sem-preco' && (p.preco !== null || !p.ativo)) return false;
      if (categoria && String(p.categoria_id) !== categoria) return false;
      return !termo || p.nome.toLowerCase().includes(termo) || (p.descricao || '').toLowerCase().includes(termo);
    });
  }, [produtos, busca, categoria, filtro]);

  const alternarAtivo = async produto => {
    try {
      await api.put(`/admin/produtos/${produto.id}`, { ...produto, ativo: !produto.ativo });
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

  return (
    <>
      <div className="adm-cabecalho">
        <div><span className="adm-etiqueta">Catálogo</span><h1>Produtos</h1><p>O que está ativo aparece no site. O preço cadastrado entra automaticamente nos novos pedidos.</p></div>
        <button className="adm-botao adm-botao--primario" onClick={() => setEditando({})}><Plus size={17} /> Novo produto</button>
      </div>

      <div className="adm-abas">
        {FILTROS.map(([valor, nome]) => <button key={valor} className={filtro === valor ? 'ativo' : ''} onClick={() => setParametros(valor ? { filtro: valor } : {})}>{nome}</button>)}
      </div>

      <section className="adm-cartao adm-cartao--sem-espaco">
        <div className="adm-barra">
          <label className="adm-busca"><Search size={17} /><input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar produto" />{busca && <button onClick={() => setBusca('')} aria-label="Limpar busca"><X size={15} /></button>}</label>
          <select className="adm-select" value={categoria} onChange={e => setCategoria(e.target.value)} aria-label="Filtrar por categoria"><option value="">Todas as categorias</option>{categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select>
          <span className="adm-mudo">{filtrados.length} {filtrados.length === 1 ? 'produto' : 'produtos'}</span>
        </div>

        {!produtos && <Carregando />}
        {produtos && !filtrados.length && <Vazio icone={Package} titulo="Nenhum produto encontrado" texto="Ajuste os filtros ou cadastre um novo produto." />}
        {produtos && filtrados.length > 0 && (
          <div className="adm-tabela-rolagem">
            <table className="adm-tabela adm-tabela--estatica">
              <thead><tr><th>Produto</th><th>Categoria</th><th>Preço</th><th>Pedidos</th><th>No site</th><th aria-label="Ações" /></tr></thead>
              <tbody>
                {filtrados.map(produto => (
                  <tr key={produto.id} className={produto.ativo ? '' : 'adm-linha-inativa'}>
                    <td>
                      <div className="adm-produto-celula">
                        {produto.imagem_url ? <img src={produto.imagem_url} alt="" /> : <span className="adm-miniatura">{produto.nome.charAt(0)}</span>}
                        <div><strong>{produto.nome}</strong>{produto.descricao && <small className="adm-uma-linha">{produto.descricao}</small>}</div>
                      </div>
                    </td>
                    <td>{produto.categoria_nome || <span className="adm-mudo">Sem categoria</span>}</td>
                    <td>{produto.preco !== null ? <><strong>{dinheiro(produto.preco)}</strong><small>por {produto.unidade || 'un'}</small></> : <span className="adm-texto-alerta">Sem preço</span>}</td>
                    <td>{produto.pedidos}</td>
                    <td><button className={`adm-interruptor ${produto.ativo ? 'ligado' : ''}`} role="switch" aria-checked={Boolean(produto.ativo)} onClick={() => alternarAtivo(produto)} aria-label={`Mostrar ${produto.nome} no site`}><span /></button></td>
                    <td>
                      <div className="adm-acoes-linha">
                        <button className="adm-icone-botao" onClick={() => setEditando(produto)} title="Editar" aria-label={`Editar ${produto.nome}`}><Pencil size={16} /></button>
                        <button className="adm-icone-botao" onClick={() => excluir(produto)} title="Excluir" aria-label={`Excluir ${produto.nome}`}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editando && (
        <FormProduto
          produto={editando}
          categorias={categorias}
          onFechar={() => setEditando(null)}
          onSalvo={novo => { setEditando(null); carregar(); avisar(novo ? 'Produto cadastrado.' : 'Produto atualizado.'); }}
        />
      )}
    </>
  );
}

function FormProduto({ produto, categorias, onFechar, onSalvo }) {
  const novo = !produto.id;
  const [dados, setDados] = useState({
    nome: produto.nome || '',
    categoria_id: produto.categoria_id || '',
    preco: produto.preco ?? '',
    unidade: produto.unidade || 'un',
    descricao: produto.descricao || '',
    imagem_url: produto.imagem_url || '',
    ativo: novo ? true : Boolean(produto.ativo),
  });
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const arquivo = useRef(null);

  const mudar = (campo, valor) => setDados(d => ({ ...d, [campo]: valor }));

  const enviarFoto = async e => {
    const foto = e.target.files?.[0];
    if (!foto) return;
    setEnviandoFoto(true);
    setErro('');
    try {
      const corpo = new FormData();
      corpo.append('imagem', foto);
      const { data } = await api.post('/admin/upload', corpo);
      mudar('imagem_url', data.url);
    } catch (falha) {
      setErro(mensagemErro(falha, 'Não foi possível enviar a foto.'));
    } finally {
      setEnviandoFoto(false);
      e.target.value = '';
    }
  };

  const salvar = async e => {
    e.preventDefault();
    setSalvando(true);
    setErro('');
    try {
      if (novo) await api.post('/admin/produtos', dados);
      else await api.put(`/admin/produtos/${produto.id}`, dados);
      onSalvo(novo);
    } catch (falha) {
      setErro(mensagemErro(falha, 'Não foi possível salvar o produto.'));
      setSalvando(false);
    }
  };

  return (
    <Modal titulo={novo ? 'Novo produto' : 'Editar produto'} onFechar={onFechar} largura={640}>
      <form className="adm-formulario" onSubmit={salvar}>
        {erro && <p className="adm-erro">{erro}</p>}
        <div className="adm-foto-produto">
          {dados.imagem_url ? <img src={dados.imagem_url} alt="" /> : <span className="adm-miniatura adm-miniatura--grande"><Package size={30} /></span>}
          <div>
            <button type="button" className="adm-botao adm-botao--pequeno" onClick={() => arquivo.current.click()} disabled={enviandoFoto}>{enviandoFoto ? <LoaderCircle size={15} className="adm-girando" /> : <ImageUp size={15} />} {dados.imagem_url ? 'Trocar foto' : 'Enviar foto'}</button>
            {dados.imagem_url && <button type="button" className="adm-link" onClick={() => mudar('imagem_url', '')}>Remover foto</button>}
            <small>JPG, PNG ou WEBP de até 5 MB.</small>
            <input ref={arquivo} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={enviarFoto} />
          </div>
        </div>
        <label className="adm-campo"><span>Nome *</span><input value={dados.nome} onChange={e => mudar('nome', e.target.value)} required autoFocus placeholder="Ex.: Cimento CP II 50kg" /></label>
        <div className="adm-formulario--3">
          <label className="adm-campo"><span>Categoria</span><select value={dados.categoria_id} onChange={e => mudar('categoria_id', e.target.value)}><option value="">Sem categoria</option>{categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></label>
          <label className="adm-campo"><span>Preço</span><div className="adm-campo-dinheiro"><span>R$</span><input type="number" min="0" step="0.01" value={dados.preco} onChange={e => mudar('preco', e.target.value)} placeholder="0,00" /></div></label>
          <label className="adm-campo"><span>Vendido por</span><select value={dados.unidade} onChange={e => mudar('unidade', e.target.value)}>{UNIDADES.map(u => <option key={u}>{u}</option>)}</select></label>
        </div>
        <label className="adm-campo"><span>Descrição</span><textarea rows="3" value={dados.descricao} onChange={e => mudar('descricao', e.target.value)} placeholder="Aparece no card do produto no site." /></label>
        <label className="adm-checkbox"><input type="checkbox" checked={dados.ativo} onChange={e => mudar('ativo', e.target.checked)} /> Mostrar este produto no site</label>
        <footer className="adm-modal-rodape"><button type="button" className="adm-botao" onClick={onFechar}>Cancelar</button><button className="adm-botao adm-botao--primario" disabled={salvando || enviandoFoto}>{salvando && <LoaderCircle size={16} className="adm-girando" />} {novo ? 'Cadastrar produto' : 'Salvar alterações'}</button></footer>
      </form>
    </Modal>
  );
}
