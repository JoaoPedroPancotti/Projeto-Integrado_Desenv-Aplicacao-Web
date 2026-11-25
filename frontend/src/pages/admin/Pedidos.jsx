import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, RefreshCw, ClipboardList, MessageCircle, X } from 'lucide-react';
import { pedidosApi } from '../../services/api/admin';
import { Carregando, Selo, Vazio } from '../../components/admin';
import { STATUS } from '../../constants/pedidos';
import { dataHora, dinheiro, haQuanto } from '../../utils/formatacao';
import { protocolo } from '../../utils/pedidos';
import { linkWhatsApp } from '../../utils/whatsapp';

export default function Pedidos() {
  const navigate = useNavigate();
  const [parametros, setParametros] = useSearchParams();
  const [pedidos, setPedidos] = useState(null);
  const [erro, setErro] = useState(false);
  const [busca, setBusca] = useState('');
  const filtroStatus = parametros.get('status') || '';

  const carregar = () => {
    setErro(false);
    pedidosApi.listar().then(setPedidos).catch(() => setErro(true));
  };
  useEffect(carregar, []);

  const contagem = useMemo(() => Object.fromEntries(STATUS.map(s => [s, (pedidos || []).filter(p => p.status === s).length])), [pedidos]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const digitos = termo.replace(/\D/g, '');
    return (pedidos || []).filter(pedido => {
      if (filtroStatus && pedido.status !== filtroStatus) return false;
      if (!termo) return true;
      return pedido.cliente_nome.toLowerCase().includes(termo)
        || (digitos && (pedido.cliente_telefone.replace(/\D/g, '').includes(digitos) || String(pedido.id) === String(Number(digitos))))
        || (pedido.cliente_email || '').toLowerCase().includes(termo);
    });
  }, [pedidos, busca, filtroStatus]);

  const escolherStatus = status => setParametros(status ? { status } : {});

  return (
    <>
      <div className="adm-cabecalho">
        <div><span className="adm-etiqueta">Atendimento</span><h1>Pedidos de orçamento</h1><p>Abra um pedido para precificar, responder o cliente e acompanhar o status.</p></div>
        <button className="adm-botao" onClick={() => { setPedidos(null); carregar(); }}><RefreshCw size={16} /> Atualizar</button>
      </div>

      <div className="adm-abas" role="tablist">
        <button role="tab" aria-selected={!filtroStatus} className={!filtroStatus ? 'ativo' : ''} onClick={() => escolherStatus('')}>Todos <em>{pedidos?.length ?? 0}</em></button>
        {STATUS.map(status => (
          <button key={status} role="tab" aria-selected={filtroStatus === status} className={filtroStatus === status ? 'ativo' : ''} onClick={() => escolherStatus(status)}>{status} <em>{contagem[status]}</em></button>
        ))}
      </div>

      <section className="adm-cartao adm-cartao--sem-espaco">
        <div className="adm-barra">
          <label className="adm-busca"><Search size={17} /><input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por cliente, telefone, e-mail ou nº do pedido" />{busca && <button onClick={() => setBusca('')} aria-label="Limpar busca"><X size={15} /></button>}</label>
          <span className="adm-mudo">{filtrados.length} {filtrados.length === 1 ? 'pedido' : 'pedidos'}</span>
        </div>

        {erro && <Vazio titulo="Não foi possível carregar os pedidos" texto="Verifique se o servidor está ligado."><button className="adm-botao" onClick={carregar}>Tentar novamente</button></Vazio>}
        {!erro && !pedidos && <Carregando />}
        {pedidos && !filtrados.length && <Vazio icone={ClipboardList} titulo="Nenhum pedido encontrado" texto={busca || filtroStatus ? 'Tente outro filtro ou busca.' : 'Os pedidos feitos no site aparecem aqui.'} />}

        {pedidos && filtrados.length > 0 && (
          <div className="adm-tabela-rolagem">
            <table className="adm-tabela">
              <thead><tr><th>Pedido</th><th>Cliente</th><th>Itens</th><th>Total</th><th>Status</th><th>Recebido</th><th aria-label="Ações" /></tr></thead>
              <tbody>
                {filtrados.map(pedido => (
                  <tr key={pedido.id} onClick={() => navigate(`/admin/pedidos/${pedido.id}`)} className={pedido.status === 'Pendente' ? 'adm-linha-nova' : ''}>
                    <td><strong>{protocolo(pedido.id)}</strong></td>
                    <td data-rotulo="Cliente">{pedido.cliente_nome}<small>{pedido.cliente_telefone}</small></td>
                    <td data-rotulo="Itens">{pedido.qtd_itens} {pedido.qtd_itens === 1 ? 'produto' : 'produtos'}{pedido.itens_sem_preco > 0 && <small className="adm-texto-alerta">{pedido.itens_sem_preco} sem preço</small>}</td>
                    <td data-rotulo="Total">{pedido.subtotal ? <strong>{dinheiro(pedido.total)}</strong> : <span className="adm-mudo">A precificar</span>}</td>
                    <td data-rotulo="Status"><Selo status={pedido.status} /></td>
                    <td data-rotulo="Recebido" title={dataHora(pedido.criado_em)}>{haQuanto(pedido.criado_em)}<small>{dataHora(pedido.criado_em)}</small></td>
                    <td data-acoes onClick={e => e.stopPropagation()}>
                      <a className="adm-icone-botao adm-icone-botao--whats" href={linkWhatsApp(pedido.cliente_telefone)} target="_blank" rel="noreferrer" title="Conversar no WhatsApp" aria-label={`Conversar com ${pedido.cliente_nome} no WhatsApp`}><MessageCircle size={17} /></a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
