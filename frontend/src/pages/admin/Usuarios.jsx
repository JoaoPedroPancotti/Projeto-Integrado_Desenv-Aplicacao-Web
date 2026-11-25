import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Pencil, Trash2, LoaderCircle, KeyRound } from 'lucide-react';
import { autenticacaoApi, usuariosApi } from '../../services/api/admin';
import { Carregando, Modal } from '../../components/admin';
import { haQuanto } from '../../utils/formatacao';
import { mensagemErro } from '../../utils/erros';

export default function Usuarios() {
  const { avisar, admin } = useOutletContext();
  const [usuarios, setUsuarios] = useState(null);
  const [editando, setEditando] = useState(null);

  const carregar = () => usuariosApi.listar().then(setUsuarios).catch(() => setUsuarios([]));
  useEffect(() => { carregar(); }, []);

  const excluir = async usuario => {
    if (!window.confirm(`Excluir o acesso de ${usuario.nome}?`)) return;
    try {
      await usuariosApi.excluir(usuario.id);
      carregar();
      avisar('Usuário excluído.');
    } catch (falha) {
      avisar(mensagemErro(falha, 'Não foi possível excluir.'), 'erro');
    }
  };

  return (
    <>
      <div className="adm-cabecalho">
        <div><span className="adm-etiqueta">Acesso</span><h1>Usuários do painel</h1><p>Quem pode entrar no painel e atender os pedidos.</p></div>
        <button className="adm-botao adm-botao--primario" onClick={() => setEditando({})}><Plus size={17} /> Novo usuário</button>
      </div>

      <div className="adm-detalhe">
        <section className="adm-cartao adm-cartao--sem-espaco adm-detalhe-principal">
          {!usuarios ? <Carregando /> : (
            <div className="adm-tabela-rolagem">
              <table className="adm-tabela adm-tabela--estatica">
                <thead><tr><th>Usuário</th><th>Situação</th><th>Último acesso</th><th aria-label="Ações" /></tr></thead>
                <tbody>
                  {usuarios.map(usuario => (
                    <tr key={usuario.id} className={usuario.ativo ? '' : 'adm-linha-inativa'}>
                      <td><div className="adm-produto-celula"><span className="adm-avatar">{usuario.nome.charAt(0)}</span><div><strong>{usuario.nome}{usuario.id === admin?.id && <em className="adm-voce">você</em>}</strong><small>{usuario.email}</small></div></div></td>
                      <td data-rotulo="Situação">{usuario.ativo ? <span className="adm-selo adm-selo--aprovado">Ativo</span> : <span className="adm-selo adm-selo--cancelado">Bloqueado</span>}</td>
                      <td data-rotulo="Último acesso" className="adm-mudo">{usuario.ultimo_acesso ? haQuanto(usuario.ultimo_acesso) : 'Nunca entrou'}</td>
                      <td data-acoes>
                        <div className="adm-acoes-linha">
                          <button className="adm-icone-botao" onClick={() => setEditando(usuario)} title="Editar" aria-label={`Editar ${usuario.nome}`}><Pencil size={16} /></button>
                          {usuario.id !== admin?.id && <button className="adm-icone-botao" onClick={() => excluir(usuario)} title="Excluir" aria-label={`Excluir ${usuario.nome}`}><Trash2 size={16} /></button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <aside className="adm-detalhe-lateral"><MinhaSenha avisar={avisar} /></aside>
      </div>

      {editando && <FormUsuario usuario={editando} proprio={editando.id === admin?.id} onFechar={() => setEditando(null)} onSalvo={novo => { setEditando(null); carregar(); avisar(novo ? 'Usuário criado.' : 'Usuário atualizado.'); }} />}
    </>
  );
}

function FormUsuario({ usuario, proprio, onFechar, onSalvo }) {
  const novo = !usuario.id;
  const [dados, setDados] = useState({ nome: usuario.nome || '', email: usuario.email || '', senha: '', ativo: novo ? true : Boolean(usuario.ativo) });
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const mudar = (campo, valor) => setDados(d => ({ ...d, [campo]: valor }));

  const salvar = async e => {
    e.preventDefault();
    setSalvando(true);
    try {
      if (novo) await usuariosApi.criar(dados);
      else await usuariosApi.atualizar(usuario.id, dados);
      onSalvo(novo);
    } catch (falha) {
      setErro(mensagemErro(falha, 'Não foi possível salvar.'));
      setSalvando(false);
    }
  };

  return (
    <Modal titulo={novo ? 'Novo usuário' : 'Editar usuário'} onFechar={onFechar}>
      <form className="adm-formulario" onSubmit={salvar}>
        {erro && <p className="adm-erro">{erro}</p>}
        <label className="adm-campo"><span>Nome *</span><input value={dados.nome} onChange={e => mudar('nome', e.target.value)} required autoFocus /></label>
        <label className="adm-campo"><span>E-mail *</span><input type="email" value={dados.email} onChange={e => mudar('email', e.target.value)} required autoComplete="off" /></label>
        <label className="adm-campo"><span>{novo ? 'Senha *' : 'Nova senha'} <small>{novo ? '(mínimo 6 caracteres)' : '(deixe em branco para manter)'}</small></span><input type="password" value={dados.senha} onChange={e => mudar('senha', e.target.value)} required={novo} minLength={6} autoComplete="new-password" /></label>
        {!novo && !proprio && <label className="adm-checkbox"><input type="checkbox" checked={dados.ativo} onChange={e => mudar('ativo', e.target.checked)} /> Acesso liberado</label>}
        <footer className="adm-modal-rodape"><button type="button" className="adm-botao" onClick={onFechar}>Cancelar</button><button className="adm-botao adm-botao--primario" disabled={salvando}>{salvando && <LoaderCircle size={16} className="adm-girando" />} Salvar</button></footer>
      </form>
    </Modal>
  );
}

function MinhaSenha({ avisar }) {
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const salvar = async e => {
    e.preventDefault();
    setErro('');
    if (nova !== confirmacao) { setErro('A confirmação não confere com a nova senha.'); return; }
    setSalvando(true);
    try {
      await autenticacaoApi.alterarMinhaSenha({ senha_atual: atual, nova_senha: nova });
      setAtual(''); setNova(''); setConfirmacao('');
      avisar('Senha alterada.');
    } catch (falha) {
      setErro(mensagemErro(falha, 'Não foi possível alterar a senha.'));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <form className="adm-cartao adm-formulario" onSubmit={salvar}>
      <h2 className="adm-titulo-lateral"><KeyRound size={16} /> Minha senha</h2>
      {erro && <p className="adm-erro">{erro}</p>}
      <label className="adm-campo"><span>Senha atual</span><input type="password" value={atual} onChange={e => setAtual(e.target.value)} required autoComplete="current-password" /></label>
      <label className="adm-campo"><span>Nova senha</span><input type="password" value={nova} onChange={e => setNova(e.target.value)} required minLength={6} autoComplete="new-password" /></label>
      <label className="adm-campo"><span>Confirmar nova senha</span><input type="password" value={confirmacao} onChange={e => setConfirmacao(e.target.value)} required minLength={6} autoComplete="new-password" /></label>
      <button className="adm-botao adm-botao--primario adm-botao--largo" disabled={salvando}>{salvando && <LoaderCircle size={16} className="adm-girando" />} Alterar senha</button>
    </form>
  );
}
