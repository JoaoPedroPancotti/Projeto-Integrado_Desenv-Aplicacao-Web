import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Trash2, Save, LoaderCircle, ClipboardList } from 'lucide-react';
import { clientesApi } from '../../services/api/admin';
import { Carregando, Selo, Vazio } from '../../components/admin';
import { dataCurta, dataHora, dinheiro } from '../../utils/formatacao';
import { protocolo } from '../../utils/pedidos';
import { linkWhatsApp } from '../../utils/whatsapp';
import { mensagemErro } from '../../utils/erros';

export default function ClienteDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { avisar } = useOutletContext();
  const [cliente, setCliente] = useState(null);
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(() => clientesApi.buscar(id)
    .then(data => { setCliente(data); setDados({ nome: data.nome, telefone: data.telefone, email: data.email || '' }); })
    .catch(() => setErro(true)), [id]);
  useEffect(() => { carregar(); }, [carregar]);

  if (erro) return <Vazio titulo="Cliente não encontrado"><Link className="adm-botao" to="/admin/clientes">Voltar aos clientes</Link></Vazio>;
  if (!cliente) return <Carregando />;

  const fechados = cliente.pedidos.filter(p => ['Aprovado', 'Concluído'].includes(p.status));
  const mudar = (campo, valor) => setDados(d => ({ ...d, [campo]: valor }));

  const salvar = async e => {
    e.preventDefault();
    setSalvando(true);
    try {
      await clientesApi.atualizar(id, dados);
      await carregar();
      avisar('Cliente atualizado.');
    } catch (falha) {
      avisar(mensagemErro(falha, 'Não foi possível salvar.'), 'erro');
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async () => {
    if (!window.confirm(`Excluir ${cliente.nome} e os ${cliente.pedidos.length} pedidos dele? Use apenas quando o cliente pedir a remoção dos dados (LGPD).`)) return;
    try {
      await clientesApi.excluir(id);
      avisar('Cliente excluído.');
      navigate('/admin/clientes');
    } catch (falha) {
      avisar(mensagemErro(falha, 'Não foi possível excluir.'), 'erro');
    }
  };

  return (
    <>
      <Link to="/admin/clientes" className="adm-voltar"><ArrowLeft size={16} /> Clientes</Link>
      <div className="adm-cabecalho">
        <div><span className="adm-etiqueta">Cliente desde {dataCurta(cliente.criado_em)}</span><h1>{cliente.nome}</h1><p>{cliente.pedidos.length} {cliente.pedidos.length === 1 ? 'pedido' : 'pedidos'} · {dinheiro(fechados.reduce((s, p) => s + p.total, 0))} em pedidos fechados</p></div>
        <div className="adm-acoes">
          <a className="adm-botao adm-botao--whats" href={linkWhatsApp(cliente.telefone)} target="_blank" rel="noreferrer"><MessageCircle size={16} /> WhatsApp</a>
          <button className="adm-botao adm-botao--perigo" onClick={excluir}><Trash2 size={16} /> Excluir dados</button>
        </div>
      </div>

      <div className="adm-detalhe">
        <section className="adm-cartao adm-cartao--sem-espaco adm-detalhe-principal">
          <header className="adm-cartao-topo adm-cartao-topo--interno"><div><h2>Pedidos</h2></div></header>
          {cliente.pedidos.length ? (
            <div className="adm-tabela-rolagem">
              <table className="adm-tabela">
                <thead><tr><th>Pedido</th><th>Itens</th><th>Total</th><th>Status</th><th>Data</th></tr></thead>
                <tbody>
                  {cliente.pedidos.map(pedido => (
                    <tr key={pedido.id} onClick={() => navigate(`/admin/pedidos/${pedido.id}`)}>
                      <td><strong>{protocolo(pedido.id)}</strong></td>
                      <td data-rotulo="Itens">{pedido.qtd_itens}</td>
                      <td data-rotulo="Total">{pedido.subtotal ? dinheiro(pedido.total) : <span className="adm-mudo">A precificar</span>}</td>
                      <td data-rotulo="Status"><Selo status={pedido.status} /></td>
                      <td data-rotulo="Data" className="adm-mudo">{dataHora(pedido.criado_em)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Vazio icone={ClipboardList} titulo="Nenhum pedido" />}
        </section>

        <aside className="adm-detalhe-lateral">
          <form className="adm-cartao adm-formulario" onSubmit={salvar}>
            <h2 className="adm-titulo-lateral">Dados de contato</h2>
            <label className="adm-campo"><span>Nome</span><input value={dados.nome} onChange={e => mudar('nome', e.target.value)} required /></label>
            <label className="adm-campo"><span>Telefone / WhatsApp</span><input value={dados.telefone} onChange={e => mudar('telefone', e.target.value)} required /></label>
            <label className="adm-campo"><span>E-mail</span><input type="email" value={dados.email} onChange={e => mudar('email', e.target.value)} /></label>
            <button className="adm-botao adm-botao--primario adm-botao--largo" disabled={salvando}>{salvando ? <LoaderCircle size={16} className="adm-girando" /> : <Save size={16} />} Salvar</button>
          </form>
        </aside>
      </div>
    </>
  );
}
