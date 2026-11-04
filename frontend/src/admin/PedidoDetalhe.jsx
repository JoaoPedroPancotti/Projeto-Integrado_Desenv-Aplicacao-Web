import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import {
  ArrowLeft, MessageCircle, Printer, Trash2, Plus, Save, LoaderCircle,
  Phone, Mail, User, StickyNote, History, TriangleAlert, Send
} from 'lucide-react';
import api from '../services/api';
import { Carregando, Modal, Selo, Vazio } from './componentes';
import {
  FORMAS_PAGAMENTO, STATUS, STATUS_DESCRICAO, dataHora, dinheiro,
  linkWhatsApp, mensagemErro, protocolo, quantidade
} from './util';

const numero = v => (v === '' || v === null || v === undefined ? null : Number(String(v).replace(',', '.')));
const texto = v => (v === null || v === undefined ? '' : String(v));

function paraFormulario(pedido) {
  return {
    status: pedido.status,
    valor_frete: texto(pedido.valor_frete),
    desconto: texto(pedido.desconto),
    forma_pagamento: pedido.forma_pagamento || '',
    resposta: pedido.resposta || '',
    notas_internas: pedido.notas_internas || '',
  };
}

const paraItens = itens => itens.map(item => ({ ...item, quantidade: texto(item.quantidade), preco_unitario: texto(item.preco_unitario) }));

export default function PedidoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { avisar, atualizarPendentes } = useOutletContext();
  const [pedido, setPedido] = useState(null);
  const [erro, setErro] = useState(false);
  const [form, setForm] = useState(null);
  const [itens, setItens] = useState([]);
  const [alterado, setAlterado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [adicionando, setAdicionando] = useState(false);

  const carregar = useCallback((manterEdicao = false) => {
    setErro(false);
    return api.get(`/admin/orcamentos/${id}`).then(({ data }) => {
      setPedido(data);
      setItens(locais => {
        const novos = paraItens(data.itens);
        return manterEdicao ? novos.map(n => locais.find(l => l.id === n.id) || n) : novos;
      });
      if (!manterEdicao) { setForm(paraFormulario(data)); setAlterado(false); }
    }).catch(() => setErro(true));
  }, [id]);

  useEffect(() => { carregar(); }, [carregar]);

  // Abrir um pedido pendente já o coloca "Em Andamento"
  const jaMarcado = useRef(false);
  useEffect(() => {
    if (pedido?.status !== 'Pendente' || pedido.historico.length > 1 || jaMarcado.current) return;
    jaMarcado.current = true;
    api.put(`/admin/orcamentos/${id}`, { ...paraFormulario(pedido), status: 'Em Andamento', itens: [] })
      .then(() => { carregar(); atualizarPendentes(); })
      .catch(() => { });
  }, [pedido, id, carregar, atualizarPendentes]);

  useEffect(() => {
    if (!alterado) return undefined;
    const avisarSaida = e => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', avisarSaida);
    return () => window.removeEventListener('beforeunload', avisarSaida);
  }, [alterado]);

  const totais = useMemo(() => {
    const subtotal = itens.reduce((soma, item) => soma + (numero(item.preco_unitario) ?? 0) * (numero(item.quantidade) || 0), 0);
    const semPreco = itens.filter(item => numero(item.preco_unitario) === null).length;
    const frete = numero(form?.valor_frete) ?? 0;
    const desconto = numero(form?.desconto) ?? 0;
    return { subtotal, semPreco, frete, desconto, total: Math.max(subtotal + frete - desconto, 0) };
  }, [itens, form]);

  if (erro) return <Vazio titulo="Pedido não encontrado" texto="Ele pode ter sido excluído."><Link className="adm-botao" to="/admin/pedidos">Voltar aos pedidos</Link></Vazio>;
  if (!pedido || !form) return <Carregando />;

  const mudar = (campo, valor) => { setForm(f => ({ ...f, [campo]: valor })); setAlterado(true); };
  const mudarItem = (itemId, campo, valor) => { setItens(lista => lista.map(i => (i.id === itemId ? { ...i, [campo]: valor } : i))); setAlterado(true); };
  const aplicarPercentual = pct => mudar('desconto', (Math.round(totais.subtotal * pct) / 100).toFixed(2));

  const salvar = async (extra = {}) => {
    setSalvando(true);
    try {
      await api.put(`/admin/orcamentos/${id}`, {
        ...form, ...extra,
        itens: itens.map(item => ({ id: item.id, quantidade: numero(item.quantidade), preco_unitario: numero(item.preco_unitario) })),
      });
      await carregar();
      atualizarPendentes();
      avisar('Pedido salvo.');
      return true;
    } catch (falha) {
      avisar(mensagemErro(falha, 'Não foi possível salvar o pedido.'), 'erro');
      return false;
    } finally {
      setSalvando(false);
    }
  };

  const mensagemWhatsApp = () => {
    const linhas = [
      `Olá, ${pedido.cliente_nome.split(' ')[0]}! Aqui é da *Comercial Pancotti*.`,
      `Segue o orçamento do seu pedido ${protocolo(pedido.id)}:`, '',
      ...itens.map(item => {
        const preco = numero(item.preco_unitario);
        const qtd = numero(item.quantidade) || 0;
        return `• ${quantidade(qtd)} ${item.unidade || 'un'} - ${item.nome}: ${preco === null ? 'a confirmar' : dinheiro(preco * qtd)}`;
      }),
      '', `Subtotal: ${dinheiro(totais.subtotal)}`,
      totais.frete ? `Frete: ${dinheiro(totais.frete)}` : 'Frete: grátis / retirada na loja',
      ...(totais.desconto ? [`Desconto: - ${dinheiro(totais.desconto)}`] : []),
      `*Total: ${dinheiro(totais.total)}*`,
      ...(form.forma_pagamento ? [`Pagamento: ${form.forma_pagamento}`] : []),
      ...(form.resposta.trim() ? ['', form.resposta.trim()] : []),
      '', 'Qualquer dúvida é só responder esta mensagem.',
    ];
    return linhas.join('\n');
  };

  // Salva, marca como respondido e abre o WhatsApp com o orçamento pronto
  const enviarWhatsApp = async () => {
    const janela = window.open('about:blank', '_blank');
    const status = ['Pendente', 'Em Andamento'].includes(form.status) ? 'Respondido' : form.status;
    const link = linkWhatsApp(pedido.cliente_telefone, mensagemWhatsApp());
    if (await salvar({ status })) {
      if (janela) janela.location.href = link; else window.location.href = link;
    } else {
      janela?.close();
    }
  };

  const removerItem = async item => {
    if (!window.confirm(`Remover "${item.nome}" deste pedido?`)) return;
    try {
      await api.delete(`/admin/orcamentos/${id}/itens/${item.id}`);
      await carregar(true);
      avisar('Item removido.');
    } catch (falha) {
      avisar(mensagemErro(falha, 'Não foi possível remover o item.'), 'erro');
    }
  };

  const excluir = async () => {
    if (!window.confirm(`Excluir o pedido ${protocolo(pedido.id)}? Esta ação não pode ser desfeita.`)) return;
    try {
      await api.delete(`/admin/orcamentos/${id}`);
      atualizarPendentes();
      avisar('Pedido excluído.');
      navigate('/admin/pedidos');
    } catch (falha) {
      avisar(mensagemErro(falha, 'Não foi possível excluir o pedido.'), 'erro');
    }
  };

  return (
    <>
      <div className="adm-nao-imprimir">
        <Link to="/admin/pedidos" className="adm-voltar"><ArrowLeft size={16} /> Pedidos</Link>
        <div className="adm-cabecalho">
          <div>
            <span className="adm-etiqueta">Recebido em {dataHora(pedido.criado_em)}</span>
            <h1>Pedido {protocolo(pedido.id)} <Selo status={pedido.status} /></h1>
            <p>{pedido.cliente_nome} · {pedido.qtd_itens} {pedido.qtd_itens === 1 ? 'produto' : 'produtos'}</p>
          </div>
          <div className="adm-acoes">
            <button className="adm-botao" onClick={() => window.print()}><Printer size={16} /> Imprimir</button>
            <button className="adm-botao adm-botao--perigo" onClick={excluir}><Trash2 size={16} /> Excluir</button>
          </div>
        </div>

        <div className="adm-detalhe">
          <div className="adm-detalhe-principal">
            <section className="adm-cartao">
              <header className="adm-cartao-topo">
                <div><h2>Itens do pedido</h2><p>Ajuste quantidades e preços unitários. O preço vem do cadastro do produto.</p></div>
                <button className="adm-botao adm-botao--pequeno" onClick={() => setAdicionando(true)}><Plus size={15} /> Adicionar item</button>
              </header>
              {totais.semPreco > 0 && <div className="adm-alerta adm-alerta--interno"><TriangleAlert size={17} /><span>{totais.semPreco} {totais.semPreco === 1 ? 'item está' : 'itens estão'} sem preço. Preencha antes de enviar ao cliente.</span></div>}
              <div className="adm-tabela-rolagem">
                <table className="adm-tabela adm-tabela--itens">
                  <thead><tr><th>Produto</th><th>Quantidade</th><th>Preço unitário</th><th>Total</th><th aria-label="Remover" /></tr></thead>
                  <tbody>
                    {itens.map(item => {
                      const preco = numero(item.preco_unitario);
                      return (
                        <tr key={item.id}>
                          <td>
                            <div className="adm-produto-celula">
                              {item.imagem_url ? <img src={item.imagem_url} alt="" /> : <span className="adm-miniatura">{item.nome.charAt(0)}</span>}
                              <div><strong>{item.nome}</strong>{item.preco_referencia !== null && preco !== item.preco_referencia && <small>Cadastro: {dinheiro(item.preco_referencia)}</small>}</div>
                            </div>
                          </td>
                          <td><label className="adm-campo-unidade"><input type="number" min="0" step="0.001" value={item.quantidade} onChange={e => mudarItem(item.id, 'quantidade', e.target.value)} aria-label={`Quantidade de ${item.nome}`} /><span>{item.unidade || 'un'}</span></label></td>
                          <td><label className="adm-campo-dinheiro"><span>R$</span><input type="number" min="0" step="0.01" value={item.preco_unitario} placeholder="0,00" onChange={e => mudarItem(item.id, 'preco_unitario', e.target.value)} aria-label={`Preço unitário de ${item.nome}`} className={preco === null ? 'adm-input-vazio' : ''} /></label></td>
                          <td><strong>{preco === null ? '—' : dinheiro(preco * (numero(item.quantidade) || 0))}</strong></td>
                          <td><button className="adm-icone-botao" onClick={() => removerItem(item)} title="Remover item" aria-label={`Remover ${item.nome}`}><Trash2 size={16} /></button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="adm-cartao">
              <header className="adm-cartao-topo"><div><h2>Valores e pagamento</h2><p>Entregas somente em São João da Boa Vista e cidades vizinhas.</p></div></header>
              <div className="adm-valores">
                <div className="adm-formulario adm-formulario--2">
                  <label className="adm-campo"><span>Frete</span><div className="adm-campo-dinheiro"><span>R$</span><input type="number" min="0" step="0.01" value={form.valor_frete} placeholder="0,00 (retirada ou grátis)" onChange={e => mudar('valor_frete', e.target.value)} /></div></label>
                  <label className="adm-campo"><span>Forma de pagamento</span><select value={form.forma_pagamento} onChange={e => mudar('forma_pagamento', e.target.value)}><option value="">Não definida</option>{FORMAS_PAGAMENTO.map(f => <option key={f}>{f}</option>)}</select></label>
                  <label className="adm-campo"><span>Desconto</span><div className="adm-campo-dinheiro"><span>R$</span><input type="number" min="0" step="0.01" value={form.desconto} placeholder="0,00" onChange={e => mudar('desconto', e.target.value)} /></div></label>
                  <div className="adm-campo"><span>Desconto rápido sobre o subtotal</span><div className="adm-chips">{[3, 5, 10].map(pct => <button key={pct} type="button" onClick={() => aplicarPercentual(pct)} disabled={!totais.subtotal}>{pct}%</button>)}<button type="button" onClick={() => mudar('desconto', '')}>Sem desconto</button></div>{['Pix', 'Dinheiro'].includes(form.forma_pagamento) && <small className="adm-dica">Pix e dinheiro podem ter desconto.</small>}</div>
                </div>
                <dl className="adm-totais">
                  <div><dt>Subtotal</dt><dd>{dinheiro(totais.subtotal)}</dd></div>
                  <div><dt>Frete</dt><dd>{totais.frete ? dinheiro(totais.frete) : 'Grátis / retirada'}</dd></div>
                  {totais.desconto > 0 && <div className="adm-totais-desconto"><dt>Desconto</dt><dd>- {dinheiro(totais.desconto)}</dd></div>}
                  <div className="adm-totais-final"><dt>Total</dt><dd>{dinheiro(totais.total)}</dd></div>
                </dl>
              </div>
            </section>

            <section className="adm-cartao">
              <header className="adm-cartao-topo"><div><h2>Resposta ao cliente</h2><p>Vai junto na mensagem do WhatsApp e na impressão. Ex.: prazo de entrega, validade do orçamento.</p></div></header>
              <textarea className="adm-textarea" rows="4" value={form.resposta} onChange={e => mudar('resposta', e.target.value)} placeholder="Ex.: Entrega em até 2 dias úteis. Orçamento válido por 7 dias." />
              <label className="adm-campo adm-campo--espaco"><span><StickyNote size={14} /> Anotações internas <small>(o cliente não vê)</small></span><textarea className="adm-textarea" rows="3" value={form.notas_internas} onChange={e => mudar('notas_internas', e.target.value)} placeholder="Ex.: separar no estoque dos fundos, cliente prefere entrega de manhã." /></label>
            </section>
          </div>

          <aside className="adm-detalhe-lateral">
            <section className="adm-cartao adm-cartao--destaque">
              <h2>Responder o cliente</h2>
              <p>Salva o pedido, marca como <strong>Respondido</strong> e abre o WhatsApp com o orçamento escrito.</p>
              <button className="adm-botao adm-botao--whats adm-botao--largo" onClick={enviarWhatsApp} disabled={salvando}><Send size={17} /> Enviar orçamento no WhatsApp</button>
              <div className="adm-total-lateral"><small>Total do orçamento</small><strong>{dinheiro(totais.total)}</strong></div>
            </section>

            <section className="adm-cartao">
              <h2 className="adm-titulo-lateral">Status</h2>
              <select className="adm-select-status" value={form.status} onChange={e => mudar('status', e.target.value)}>{STATUS.map(s => <option key={s}>{s}</option>)}</select>
              <p className="adm-mudo adm-descricao-status">{STATUS_DESCRICAO[form.status]}</p>
            </section>

            <section className="adm-cartao">
              <h2 className="adm-titulo-lateral">Cliente</h2>
              <ul className="adm-dados">
                <li><User size={16} /><Link to={`/admin/clientes/${pedido.cliente_id}`}>{pedido.cliente_nome}</Link></li>
                <li><Phone size={16} /><a href={linkWhatsApp(pedido.cliente_telefone)} target="_blank" rel="noreferrer">{pedido.cliente_telefone}</a></li>
                {pedido.cliente_email && <li><Mail size={16} /><a href={`mailto:${pedido.cliente_email}`}>{pedido.cliente_email}</a></li>}
              </ul>
              <a className="adm-botao adm-botao--largo" href={linkWhatsApp(pedido.cliente_telefone)} target="_blank" rel="noreferrer"><MessageCircle size={16} /> Abrir conversa</a>
              {pedido.observacoes && <div className="adm-observacao"><small>Observações do cliente</small><p>{pedido.observacoes}</p></div>}
            </section>

            <section className="adm-cartao">
              <h2 className="adm-titulo-lateral"><History size={16} /> Histórico</h2>
              <ol className="adm-linha-tempo">
                {pedido.historico.map(evento => (
                  <li key={evento.id}><strong>{evento.descricao}</strong><small>{dataHora(evento.criado_em)}{evento.administrador_nome ? ` · ${evento.administrador_nome}` : ''}</small></li>
                ))}
                {!pedido.historico.length && <li><small>Sem registros.</small></li>}
              </ol>
            </section>
          </aside>
        </div>

        {alterado && (
          <div className="adm-barra-salvar">
            <span>Você tem alterações não salvas.</span>
            <button className="adm-botao" onClick={() => carregar()} disabled={salvando}>Descartar</button>
            <button className="adm-botao adm-botao--primario" onClick={() => salvar()} disabled={salvando}>{salvando ? <LoaderCircle size={16} className="adm-girando" /> : <Save size={16} />} Salvar pedido</button>
          </div>
        )}
      </div>

      <Impressao pedido={pedido} itens={itens} form={form} totais={totais} />
      {adicionando && <AdicionarItem pedidoId={id} onFechar={() => setAdicionando(false)} onAdicionado={async () => { setAdicionando(false); await carregar(true); avisar('Item adicionado.'); }} />}
    </>
  );
}

function AdicionarItem({ pedidoId, onFechar, onAdicionado }) {
  const [produtos, setProdutos] = useState(null);
  const [produtoId, setProdutoId] = useState('');
  const [qtd, setQtd] = useState('1');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => { api.get('/admin/produtos').then(({ data }) => setProdutos(data.filter(p => p.ativo))); }, []);

  const adicionar = async e => {
    e.preventDefault();
    setEnviando(true);
    try {
      await api.post(`/admin/orcamentos/${pedidoId}/itens`, { produto_id: produtoId, quantidade: numero(qtd) });
      onAdicionado();
    } catch (falha) {
      setErro(mensagemErro(falha, 'Não foi possível adicionar o item.'));
      setEnviando(false);
    }
  };

  return (
    <Modal titulo="Adicionar item" subtitulo="O preço do cadastro entra automaticamente." onFechar={onFechar}>
      {!produtos ? <Carregando /> : (
        <form className="adm-formulario" onSubmit={adicionar}>
          {erro && <p className="adm-erro">{erro}</p>}
          <label className="adm-campo"><span>Produto</span><select value={produtoId} onChange={e => setProdutoId(e.target.value)} required autoFocus><option value="">Escolha um produto</option>{produtos.map(p => <option key={p.id} value={p.id}>{p.nome}{p.preco !== null ? ` — ${dinheiro(p.preco)}` : ''}</option>)}</select></label>
          <label className="adm-campo"><span>Quantidade</span><input type="number" min="0.001" step="0.001" value={qtd} onChange={e => setQtd(e.target.value)} required /></label>
          <footer className="adm-modal-rodape"><button type="button" className="adm-botao" onClick={onFechar}>Cancelar</button><button className="adm-botao adm-botao--primario" disabled={enviando || !produtoId}><Plus size={16} /> Adicionar</button></footer>
        </form>
      )}
    </Modal>
  );
}

// Versão limpa do orçamento que só aparece ao imprimir
function Impressao({ pedido, itens, form, totais }) {
  return (
    <div className="adm-so-impressao">
      <header className="adm-impressao-topo">
        <img src="/logotipo.png" alt="Comercial Pancotti" />
        <div><h1>Orçamento {protocolo(pedido.id)}</h1><p>Emitido em {new Date().toLocaleDateString('pt-BR')}</p></div>
      </header>
      <p><strong>Cliente:</strong> {pedido.cliente_nome} · {pedido.cliente_telefone}{pedido.cliente_email ? ` · ${pedido.cliente_email}` : ''}</p>
      <table>
        <thead><tr><th>Produto</th><th>Qtd.</th><th>Unitário</th><th>Total</th></tr></thead>
        <tbody>
          {itens.map(item => {
            const preco = numero(item.preco_unitario);
            const qtd = numero(item.quantidade) || 0;
            return <tr key={item.id}><td>{item.nome}</td><td>{quantidade(qtd)} {item.unidade || 'un'}</td><td>{dinheiro(preco)}</td><td>{preco === null ? '—' : dinheiro(preco * qtd)}</td></tr>;
          })}
        </tbody>
      </table>
      <dl>
        <div><dt>Subtotal</dt><dd>{dinheiro(totais.subtotal)}</dd></div>
        <div><dt>Frete</dt><dd>{totais.frete ? dinheiro(totais.frete) : 'Grátis / retirada'}</dd></div>
        {totais.desconto > 0 && <div><dt>Desconto</dt><dd>- {dinheiro(totais.desconto)}</dd></div>}
        <div className="adm-impressao-total"><dt>Total</dt><dd>{dinheiro(totais.total)}</dd></div>
      </dl>
      {form.forma_pagamento && <p><strong>Pagamento:</strong> {form.forma_pagamento}</p>}
      {form.resposta && <p className="adm-impressao-resposta">{form.resposta}</p>}
      <footer>Comercial Pancotti · Materiais para construção · Entregas em São João da Boa Vista e cidades vizinhas</footer>
    </div>
  );
}
