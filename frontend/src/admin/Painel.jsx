import { useEffect, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { ClipboardList, Clock, CalendarDays, BadgeDollarSign, Users, ArrowRight, TriangleAlert, RefreshCw } from 'lucide-react';
import api from '../services/api';
import { Carregando, Selo, Vazio } from './componentes';
import { STATUS, classeStatus, dinheiro, haQuanto, protocolo, quantidade } from './util';

// Últimos 14 dias, preenchendo com zero os dias sem pedido
function montarDias(porDia) {
  return Array.from({ length: 14 }, (_, i) => {
    const dia = new Date();
    dia.setDate(dia.getDate() - (13 - i));
    const chave = `${dia.getFullYear()}-${String(dia.getMonth() + 1).padStart(2, '0')}-${String(dia.getDate()).padStart(2, '0')}`;
    return { chave, rotulo: dia.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), total: porDia.find(d => d.dia === chave)?.total || 0 };
  });
}

export default function Painel() {
  const navigate = useNavigate();
  const { admin } = useOutletContext();
  const [resumo, setResumo] = useState(null);
  const [erro, setErro] = useState(false);

  const carregar = () => {
    setErro(false);
    api.get('/admin/resumo').then(({ data }) => setResumo(data)).catch(() => setErro(true));
  };
  useEffect(carregar, []);

  if (erro) return <Vazio titulo="Não foi possível carregar o resumo" texto="Verifique se o servidor está ligado."><button className="adm-botao" onClick={carregar}><RefreshCw size={16} /> Tentar novamente</button></Vazio>;
  if (!resumo) return <Carregando />;

  const dias = montarDias(resumo.por_dia);
  const maiorDia = Math.max(1, ...dias.map(d => d.total));
  const totalStatus = Math.max(1, resumo.total_pedidos);
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';

  const indicadores = [
    ['Aguardando resposta', resumo.por_status['Pendente'], 'pedidos novos do site', ClipboardList, '/admin/pedidos?status=Pendente', true],
    ['Em andamento', resumo.por_status['Em Andamento'], 'orçamentos sendo montados', Clock, '/admin/pedidos?status=Em Andamento'],
    ['Pedidos hoje', resumo.hoje, `${resumo.ultimos30} nos últimos 30 dias`, CalendarDays, '/admin/pedidos'],
    ['Fechado no mês', dinheiro(resumo.vendido_mes), 'aprovados e concluídos', BadgeDollarSign, '/admin/pedidos?status=Aprovado'],
    ['Clientes', resumo.clientes, 'cadastrados pelos pedidos', Users, '/admin/clientes'],
  ];

  return (
    <>
      <div className="adm-cabecalho">
        <div>
          <span className="adm-etiqueta">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          <h1>{saudacao}, {admin?.nome?.split(' ')[0]}</h1>
          <p>Veja o que chegou pelo site e o andamento dos orçamentos.</p>
        </div>
        <Link to="/admin/pedidos" className="adm-botao adm-botao--primario">Ver pedidos <ArrowRight size={17} /></Link>
      </div>

      {resumo.produtos_sem_preco > 0 && (
        <Link to="/admin/produtos?filtro=sem-preco" className="adm-alerta">
          <TriangleAlert size={19} />
          <span><strong>{resumo.produtos_sem_preco} {resumo.produtos_sem_preco === 1 ? 'produto ativo está' : 'produtos ativos estão'} sem preço.</strong> Cadastre o preço para os orçamentos já virem calculados.</span>
          <ArrowRight size={17} />
        </Link>
      )}

      <section className="adm-indicadores">
        {indicadores.map(([titulo, numero, legenda, Icone, link, destaque]) => (
          <Link key={titulo} to={link} className={`adm-indicador ${destaque && numero > 0 ? 'adm-indicador--destaque' : ''}`}>
            <span><Icone size={19} /></span>
            <small>{titulo}</small>
            <strong>{numero}</strong>
            <p>{legenda}</p>
          </Link>
        ))}
      </section>

      <div className="adm-grade-2">
        <section className="adm-cartao">
          <header className="adm-cartao-topo"><div><h2>Pedidos por dia</h2><p>Últimos 14 dias</p></div></header>
          <div className="adm-grafico" role="img" aria-label="Gráfico de pedidos por dia nos últimos 14 dias">
            {dias.map(dia => (
              <div key={dia.chave} className="adm-grafico-coluna" title={`${dia.rotulo}: ${dia.total} ${dia.total === 1 ? 'pedido' : 'pedidos'}`}>
                <span className="adm-grafico-valor">{dia.total || ''}</span>
                <div className={`adm-grafico-barra ${dia.total ? '' : 'adm-grafico-barra--vazia'}`} style={{ height: `${(dia.total / maiorDia) * 100}%` }} />
                <small>{dia.rotulo.slice(0, 2)}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="adm-cartao">
          <header className="adm-cartao-topo"><div><h2>Pedidos por status</h2><p>{resumo.total_pedidos} no total</p></div></header>
          <ul className="adm-funil">
            {STATUS.map(status => (
              <li key={status}>
                <Link to={`/admin/pedidos?status=${status}`}>
                  <span className={classeStatus(status)}>{status}</span>
                  <div><i className={classeStatus(status)} style={{ width: `${(resumo.por_status[status] / totalStatus) * 100}%` }} /></div>
                  <strong>{resumo.por_status[status]}</strong>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="adm-grade-2 adm-grade-2--larga">
        <section className="adm-cartao">
          <header className="adm-cartao-topo"><div><h2>Pedidos recentes</h2><p>Os últimos que chegaram</p></div><Link to="/admin/pedidos">Ver todos</Link></header>
          {resumo.recentes.length ? (
            <table className="adm-tabela">
              <thead><tr><th>Pedido</th><th>Cliente</th><th>Total</th><th>Status</th><th>Quando</th></tr></thead>
              <tbody>
                {resumo.recentes.map(pedido => (
                  <tr key={pedido.id} onClick={() => navigate(`/admin/pedidos/${pedido.id}`)}>
                    <td><strong>{protocolo(pedido.id)}</strong></td>
                    <td>{pedido.cliente_nome}<small>{pedido.qtd_itens} {pedido.qtd_itens === 1 ? 'produto' : 'produtos'}</small></td>
                    <td>{pedido.subtotal ? dinheiro(pedido.total) : <span className="adm-mudo">A precificar</span>}</td>
                    <td><Selo status={pedido.status} /></td>
                    <td className="adm-mudo">{haQuanto(pedido.criado_em)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <Vazio titulo="Nenhum pedido ainda" texto="Os pedidos feitos no site aparecem aqui." />}
        </section>

        <section className="adm-cartao">
          <header className="adm-cartao-topo"><div><h2>Mais pedidos</h2><p>Produtos que mais aparecem nos orçamentos</p></div></header>
          {resumo.mais_pedidos.length ? (
            <ol className="adm-ranking">
              {resumo.mais_pedidos.map((produto, i) => (
                <li key={produto.id}>
                  <span className="adm-ranking-posicao">{i + 1}</span>
                  {produto.imagem_url ? <img src={produto.imagem_url} alt="" /> : <span className="adm-miniatura">{produto.nome.charAt(0)}</span>}
                  <div><strong>{produto.nome}</strong><small>{produto.pedidos} {produto.pedidos === 1 ? 'pedido' : 'pedidos'} · {quantidade(produto.quantidade)} {produto.quantidade === 1 ? 'unidade' : 'unidades'}</small></div>
                </li>
              ))}
            </ol>
          ) : <Vazio titulo="Sem dados ainda" />}
        </section>
      </div>
    </>
  );
}
