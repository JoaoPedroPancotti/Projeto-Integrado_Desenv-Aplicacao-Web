// Cadastro de fornecedores, com produtos vinculados e histórico de compras.
import { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import { Plus, Search, X, Truck, Pencil, Trash2, LoaderCircle, MessageCircle, Mail, Package } from 'lucide-react';
import api from '../services/api';
import { Carregando, Modal, Vazio } from './componentes';
import { dataCurta, dinheiro, linkWhatsApp, mensagemErro, semAcento } from './util';

export default function Fornecedores() {
  const { avisar } = useOutletContext();
  const [parametros, setParametros] = useSearchParams();
  const [lista, setLista] = useState(null);
  const [busca, setBusca] = useState('');
  const [editando, setEditando] = useState(null);
  const ver = parametros.get('ver');

  const carregar = () => api.get('/admin/fornecedores').then(({ data }) => setLista(data)).catch(() => setLista([]));
  useEffect(() => { carregar(); }, []);

  // Link vindo da ficha do produto (?ver=ID) abre o fornecedor direto
  useEffect(() => {
    if (ver && lista) {
      const f = lista.find(x => String(x.id) === ver);
      if (f) setEditando(f);
    }
  }, [ver, lista]);

  const fechar = () => { setEditando(null); if (ver) setParametros({}); };

  const filtrados = useMemo(() => (lista || []).filter(f => semAcento(`${f.nome} ${f.cnpj || ''} ${f.contato || ''} ${f.email || ''} ${f.telefone || ''}`).includes(semAcento(busca))), [lista, busca]);

  const excluir = async f => {
    if (!window.confirm(`Excluir o fornecedor "${f.nome}"?\n\nOs produtos e o histórico de compras são mantidos, só perdem o vínculo.`)) return;
    try {
      await api.delete(`/admin/fornecedores/${f.id}`);
      carregar();
      avisar('Fornecedor excluído.');
    } catch (falha) {
      avisar(mensagemErro(falha, 'Não foi possível excluir.'), 'erro');
    }
  };

  return (
    <>
      <div className="adm-cabecalho">
        <div><span className="adm-etiqueta">Estoque</span><h1>Fornecedores</h1><p>De quem a loja compra. O fornecedor aparece na entrada de mercadoria e organiza a lista de reposição.</p></div>
        <button className="adm-botao adm-botao--primario" onClick={() => setEditando({})}><Plus size={17} /> Novo fornecedor</button>
      </div>

      <section className="adm-cartao adm-cartao--sem-espaco">
        <div className="adm-barra">
          <label className="adm-busca"><Search size={17} /><input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Nome, CNPJ, contato ou telefone" />{busca && <button onClick={() => setBusca('')} aria-label="Limpar busca"><X size={15} /></button>}</label>
          <span className="adm-mudo">{filtrados.length} fornecedores</span>
        </div>
        {!lista && <Carregando />}
        {lista && !filtrados.length && <Vazio icone={Truck} titulo="Nenhum fornecedor" texto="Cadastre os fornecedores para vincular aos produtos e às notas de entrada." />}
        {lista && filtrados.length > 0 && (
          <div className="adm-tabela-rolagem">
            <table className="adm-tabela">
              <thead><tr><th>Fornecedor</th><th>Contato</th><th>Produtos</th><th className="adm-col-opcional">Última compra</th><th>Comprado (12 meses)</th><th aria-label="Ações" /></tr></thead>
              <tbody>
                {filtrados.map(f => (
                  <tr key={f.id} onClick={() => setEditando(f)} className={f.ativo ? '' : 'adm-linha-inativa'}>
                    <td><strong>{f.nome}</strong><small>{f.cnpj || 'CNPJ não informado'}{!f.ativo && ' · inativo'}</small></td>
                    <td data-rotulo="Contato">{f.contato || f.telefone || <span className="adm-mudo">—</span>}<small>{f.contato ? f.telefone : f.email}</small></td>
                    <td data-rotulo="Produtos" onClick={e => e.stopPropagation()}><Link className="adm-link-forte" to={`/admin/produtos?fornecedor=${f.id}`}>{f.produtos}</Link></td>
                    <td data-rotulo="Última compra" className="adm-col-opcional">{f.ultima_compra ? dataCurta(f.ultima_compra) : <span className="adm-mudo">—</span>}</td>
                    <td data-rotulo="Comprado (12 meses)">{dinheiro(f.comprado_12m)}</td>
                    <td data-acoes onClick={e => e.stopPropagation()}>
                      <div className="adm-acoes-linha">
                        {f.telefone && <a className="adm-icone-botao adm-icone-botao--whats" href={linkWhatsApp(f.telefone)} target="_blank" rel="noreferrer" title="WhatsApp" aria-label={`WhatsApp de ${f.nome}`}><MessageCircle size={16} /></a>}
                        <button className="adm-icone-botao" onClick={() => setEditando(f)} title="Editar" aria-label={`Editar ${f.nome}`}><Pencil size={16} /></button>
                        <button className="adm-icone-botao" onClick={() => excluir(f)} title="Excluir" aria-label={`Excluir ${f.nome}`}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editando && <FormFornecedor fornecedor={editando} onFechar={fechar} onSalvo={novo => { fechar(); carregar(); avisar(novo ? 'Fornecedor cadastrado.' : 'Fornecedor atualizado.'); }} />}
    </>
  );
}

function FormFornecedor({ fornecedor, onFechar, onSalvo }) {
  const novo = !fornecedor.id;
  const [dados, setDados] = useState({
    nome: fornecedor.nome || '', cnpj: fornecedor.cnpj || '', telefone: fornecedor.telefone || '', email: fornecedor.email || '',
    contato: fornecedor.contato || '', endereco: fornecedor.endereco || '', prazo_entrega_dias: fornecedor.prazo_entrega_dias ?? '',
    observacoes: fornecedor.observacoes || '', ativo: novo ? true : Boolean(fornecedor.ativo),
  });
  const [detalhe, setDetalhe] = useState(null);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!novo) api.get(`/admin/fornecedores/${fornecedor.id}`).then(({ data }) => setDetalhe(data)).catch(() => {});
  }, [novo, fornecedor.id]);

  const mudar = (campo, valor) => setDados(d => ({ ...d, [campo]: valor }));

  const salvar = async e => {
    e.preventDefault();
    setSalvando(true);
    setErro('');
    try {
      if (novo) await api.post('/admin/fornecedores', dados);
      else await api.put(`/admin/fornecedores/${fornecedor.id}`, dados);
      onSalvo(novo);
    } catch (falha) {
      setErro(mensagemErro(falha, 'Não foi possível salvar.'));
      setSalvando(false);
    }
  };

  return (
    <Modal titulo={novo ? 'Novo fornecedor' : fornecedor.nome} subtitulo={novo ? undefined : 'Dados, produtos e compras'} onFechar={onFechar} largura={720}>
      <form className="adm-formulario" onSubmit={salvar}>
        {erro && <p className="adm-erro">{erro}</p>}
        <div className="adm-formulario--2">
          <label className="adm-campo"><span>Nome / razão social *</span><input value={dados.nome} onChange={e => mudar('nome', e.target.value)} required autoFocus maxLength={150} /></label>
          <label className="adm-campo"><span>CNPJ</span><input value={dados.cnpj} onChange={e => mudar('cnpj', e.target.value)} placeholder="00.000.000/0000-00" maxLength={20} /></label>
          <label className="adm-campo"><span>Vendedor / contato</span><input value={dados.contato} onChange={e => mudar('contato', e.target.value)} maxLength={100} /></label>
          <label className="adm-campo"><span>Telefone / WhatsApp</span><input value={dados.telefone} onChange={e => mudar('telefone', e.target.value)} placeholder="(19) 99999-9999" maxLength={20} /></label>
          <label className="adm-campo"><span>E-mail</span><input type="email" value={dados.email} onChange={e => mudar('email', e.target.value)} maxLength={150} /></label>
          <label className="adm-campo"><span>Prazo de entrega</span><div className="adm-campo-unidade adm-campo-unidade--largo"><input type="number" min="0" value={dados.prazo_entrega_dias} onChange={e => mudar('prazo_entrega_dias', e.target.value)} /><span>dias</span></div></label>
        </div>
        <label className="adm-campo"><span>Endereço</span><input value={dados.endereco} onChange={e => mudar('endereco', e.target.value)} maxLength={255} /></label>
        <label className="adm-campo"><span>Observações</span><textarea rows="2" value={dados.observacoes} onChange={e => mudar('observacoes', e.target.value)} placeholder="Condições de pagamento, pedido mínimo, dias de entrega..." /></label>
        <label className="adm-checkbox"><input type="checkbox" checked={dados.ativo} onChange={e => mudar('ativo', e.target.checked)} /> Fornecedor ativo</label>

        {!novo && (
          <div className="adm-grade-2 adm-grade-2--igual">
            <div>
              <h3 className="adm-subtitulo"><Package size={15} /> Produtos ({detalhe?.produtos.length ?? '…'})</h3>
              {detalhe && (detalhe.produtos.length ? (
                <ul className="adm-lista-simples adm-lista-simples--rolagem">
                  {detalhe.produtos.map(p => <li key={p.id}><Link to={`/admin/produtos/${p.id}`}><code className="adm-codigo">{p.codigo}</code> {p.nome}</Link></li>)}
                </ul>
              ) : <p className="adm-mudo">Nenhum produto vinculado.</p>)}
            </div>
            <div>
              <h3 className="adm-subtitulo"><Truck size={15} /> Compras recentes</h3>
              {detalhe && (detalhe.compras.length ? (
                <ul className="adm-lista-simples adm-lista-simples--rolagem">
                  {detalhe.compras.map((c, i) => <li key={i}><span>{dataCurta(c.data)} · {c.documento || 'sem nota'}<small>{c.itens} itens</small></span><strong>{dinheiro(c.valor)}</strong></li>)}
                </ul>
              ) : <p className="adm-mudo">Nenhuma entrada registrada.</p>)}
            </div>
          </div>
        )}

        <footer className="adm-modal-rodape">
          {!novo && dados.email && <a className="adm-botao adm-botao--pequeno adm-rodape-esquerda" href={`mailto:${dados.email}`}><Mail size={15} /> E-mail</a>}
          <button type="button" className="adm-botao" onClick={onFechar}>Cancelar</button>
          <button className="adm-botao adm-botao--primario" disabled={salvando}>{salvando && <LoaderCircle size={16} className="adm-girando" />} Salvar</button>
        </footer>
      </form>
    </Modal>
  );
}
