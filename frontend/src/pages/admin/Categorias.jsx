import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Plus, Pencil, Trash2, Tags, LoaderCircle } from 'lucide-react';
import { categoriasApi } from '../../services/api/admin';
import { Carregando, Modal, Vazio } from '../../components/admin';
import { mensagemErro } from '../../utils/erros';

export default function Categorias() {
  const { avisar } = useOutletContext();
  const [categorias, setCategorias] = useState(null);
  const [editando, setEditando] = useState(null);

  const carregar = () => categoriasApi.listar().then(setCategorias).catch(() => setCategorias([]));
  useEffect(() => { carregar(); }, []);

  const excluir = async categoria => {
    const aviso = categoria.produtos ? `\n\nOs ${categoria.produtos} produtos dela vão ficar sem categoria.` : '';
    if (!window.confirm(`Excluir a categoria "${categoria.nome}"?${aviso}`)) return;
    try {
      await categoriasApi.excluir(categoria.id);
      carregar();
      avisar('Categoria excluída.');
    } catch (falha) {
      avisar(mensagemErro(falha, 'Não foi possível excluir a categoria.'), 'erro');
    }
  };

  return (
    <>
      <div className="adm-cabecalho">
        <div><span className="adm-etiqueta">Catálogo</span><h1>Categorias</h1><p>Organize os produtos em departamentos.</p></div>
        <button className="adm-botao adm-botao--primario" onClick={() => setEditando({})}><Plus size={17} /> Nova categoria</button>
      </div>

      {!categorias && <Carregando />}
      {categorias && !categorias.length && <section className="adm-cartao"><Vazio icone={Tags} titulo="Nenhuma categoria" texto="Crie a primeira para organizar o catálogo." /></section>}
      {categorias && categorias.length > 0 && (
        <div className="adm-cards-categorias">
          {categorias.map(categoria => (
            <article key={categoria.id} className="adm-cartao adm-categoria">
              <span className="adm-categoria-icone"><Tags size={19} /></span>
              <h2>{categoria.nome}</h2>
              <p>{categoria.descricao || <span className="adm-mudo">Sem descrição</span>}</p>
              <footer>
                <Link to="/admin/produtos">{categoria.produtos} {categoria.produtos === 1 ? 'produto' : 'produtos'}</Link>
                <div className="adm-acoes-linha">
                  <button className="adm-icone-botao" onClick={() => setEditando(categoria)} title="Editar" aria-label={`Editar ${categoria.nome}`}><Pencil size={16} /></button>
                  <button className="adm-icone-botao" onClick={() => excluir(categoria)} title="Excluir" aria-label={`Excluir ${categoria.nome}`}><Trash2 size={16} /></button>
                </div>
              </footer>
            </article>
          ))}
        </div>
      )}

      {editando && <FormCategoria categoria={editando} onFechar={() => setEditando(null)} onSalvo={novo => { setEditando(null); carregar(); avisar(novo ? 'Categoria criada.' : 'Categoria atualizada.'); }} />}
    </>
  );
}

function FormCategoria({ categoria, onFechar, onSalvo }) {
  const novo = !categoria.id;
  const [nome, setNome] = useState(categoria.nome || '');
  const [descricao, setDescricao] = useState(categoria.descricao || '');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const salvar = async e => {
    e.preventDefault();
    setSalvando(true);
    try {
      if (novo) await categoriasApi.criar({ nome, descricao });
      else await categoriasApi.atualizar(categoria.id, { nome, descricao });
      onSalvo(novo);
    } catch (falha) {
      setErro(mensagemErro(falha, 'Não foi possível salvar a categoria.'));
      setSalvando(false);
    }
  };

  return (
    <Modal titulo={novo ? 'Nova categoria' : 'Editar categoria'} onFechar={onFechar}>
      <form className="adm-formulario" onSubmit={salvar}>
        {erro && <p className="adm-erro">{erro}</p>}
        <label className="adm-campo"><span>Nome *</span><input value={nome} onChange={e => setNome(e.target.value)} required autoFocus placeholder="Ex.: Hidráulica" /></label>
        <label className="adm-campo"><span>Descrição</span><textarea rows="3" value={descricao} onChange={e => setDescricao(e.target.value)} /></label>
        <footer className="adm-modal-rodape"><button type="button" className="adm-botao" onClick={onFechar}>Cancelar</button><button className="adm-botao adm-botao--primario" disabled={salvando}>{salvando && <LoaderCircle size={16} className="adm-girando" />} Salvar</button></footer>
      </form>
    </Modal>
  );
}
