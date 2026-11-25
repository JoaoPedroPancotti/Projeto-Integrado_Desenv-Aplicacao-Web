// Todas as movimentações de estoque, com filtros por tipo, período e produto/documento.
import { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import { Search, X, Download, ArrowLeftRight, Plus, RefreshCw } from 'lucide-react';
import { estoqueApi } from '../../services/api/admin';
import { Carregando, Quantidade, SeloMovimento, Vazio } from '../../components/admin';
import MovimentarEstoque from '../../components/admin/MovimentarEstoque';
import { TIPOS_MOVIMENTO } from '../../constants/estoque';
import { dataHora, dinheiro, quantidade } from '../../utils/formatacao';
import { protocolo } from '../../utils/pedidos';
import { baixarCSV } from '../../utils/csv';

export default function Movimentacoes() {
  const { avisar } = useOutletContext();
  const [parametros, setParametros] = useSearchParams();
  const [lista, setLista] = useState(null);
  const [erro, setErro] = useState(false);
  const [busca, setBusca] = useState(parametros.get('busca') || '');
  const [novo, setNovo] = useState(false);
  const tipo = parametros.get('tipo') || '';
  const de = parametros.get('de') || '';
  const ate = parametros.get('ate') || '';
  const buscaUrl = parametros.get('busca') || '';

  const mudar = (chave, valor) => {
    const p = new URLSearchParams(parametros);
    if (valor) p.set(chave, valor); else p.delete(chave);
    setParametros(p, { replace: true });
  };

  // Espera a pessoa parar de digitar antes de buscar no servidor
  useEffect(() => {
    const t = setTimeout(() => { if (busca !== buscaUrl) mudar('busca', busca.trim()); }, 400);
    return () => clearTimeout(t);
  }, [busca]); // eslint-disable-line react-hooks/exhaustive-deps

  const carregar = () => {
    setErro(false);
    setLista(null);
    estoqueApi.listarMovimentacoes({ tipo: tipo || undefined, de: de || undefined, ate: ate || undefined, busca: buscaUrl || undefined })
      .then(setLista).catch(() => setErro(true));
  };
  useEffect(carregar, [tipo, de, ate, buscaUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const totais = useMemo(() => (lista || []).reduce((t, m) => {
    const valor = Math.abs(m.quantidade) * (m.custo_unitario || 0);
    if (m.quantidade > 0) t.entradas += valor; else t.saidas += valor;
    return t;
  }, { entradas: 0, saidas: 0 }), [lista]);

  const exportar = () => baixarCSV('movimentacoes', [
    ['Data', m => dataHora(m.criado_em)], ['Código', m => m.produto_codigo], ['Produto', m => m.produto_nome],
    ['Tipo', m => TIPOS_MOVIMENTO[m.tipo]?.nome], ['Quantidade', m => m.quantidade], ['Unidade', m => m.unidade],
    ['Saldo anterior', m => m.saldo_anterior], ['Saldo posterior', m => m.saldo_posterior], ['Custo unitário', m => m.custo_unitario],
    ['Valor', m => Math.abs(m.quantidade) * (m.custo_unitario || 0)], ['Documento', m => m.documento],
    ['Pedido', m => (m.orcamento_id ? protocolo(m.orcamento_id) : '')], ['Fornecedor', m => m.fornecedor_nome],
    ['Usuário', m => m.administrador_nome], ['Observação', m => m.observacao],
  ], lista || []);

  const algumFiltro = tipo || de || ate || buscaUrl;

  return (
    <>
      <div className="adm-cabecalho">
        <div><span className="adm-etiqueta">Estoque</span><h1>Movimentações</h1><p>Tudo o que entrou e saiu do estoque: compras, vendas, perdas, ajustes e inventários. Nada é apagado.</p></div>
        <div className="adm-acoes">
          <button className="adm-botao" onClick={exportar} disabled={!lista?.length}><Download size={16} /> Exportar</button>
          <button className="adm-botao adm-botao--primario" onClick={() => setNovo(true)}><Plus size={17} /> Nova movimentação</button>
        </div>
      </div>

      <div className="adm-abas">
        <button className={!tipo ? 'ativo' : ''} onClick={() => mudar('tipo', '')}>Todas</button>
        {Object.entries(TIPOS_MOVIMENTO).map(([k, t]) => <button key={k} className={tipo === k ? 'ativo' : ''} onClick={() => mudar('tipo', k)}>{t.nome}</button>)}
      </div>

      <section className="adm-cartao adm-cartao--sem-espaco">
        <div className="adm-barra">
          <label className="adm-busca"><Search size={17} /><input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Produto, código, nota fiscal ou observação" />{busca && <button onClick={() => setBusca('')} aria-label="Limpar busca"><X size={15} /></button>}</label>
          <label className="adm-data"><span>De</span><input type="date" value={de} onChange={e => mudar('de', e.target.value)} /></label>
          <label className="adm-data"><span>Até</span><input type="date" value={ate} onChange={e => mudar('ate', e.target.value)} /></label>
          {algumFiltro && <button className="adm-link" onClick={() => { setBusca(''); setParametros({}); }}>Limpar filtros</button>}
          {lista && <span className="adm-mudo">{lista.length}{lista.length === 1000 ? '+' : ''} registros · entradas {dinheiro(totais.entradas)} · saídas {dinheiro(totais.saidas)}</span>}
        </div>

        {erro && <Vazio titulo="Não foi possível carregar"><button className="adm-botao" onClick={carregar}><RefreshCw size={16} /> Tentar novamente</button></Vazio>}
        {!erro && !lista && <Carregando />}
        {lista && !lista.length && <Vazio icone={ArrowLeftRight} titulo="Nenhuma movimentação" texto={algumFiltro ? 'Nada com esses filtros.' : 'Registre uma entrada de mercadoria ou faça um inventário para começar.'} />}
        {lista && lista.length > 0 && (
          <div className="adm-tabela-rolagem">
            <table className="adm-tabela adm-tabela--estatica">
              <thead><tr><th>Produto</th><th>Movimento</th><th>Quantidade</th><th>Saldo</th><th className="adm-col-opcional">Custo / valor</th><th>Origem</th><th>Quando</th></tr></thead>
              <tbody>
                {lista.map(m => (
                  <tr key={m.id}>
                    <td><Link className="adm-link-forte" to={`/admin/produtos/${m.produto_id}`}>{m.produto_nome}</Link><small><code className="adm-codigo">{m.produto_codigo}</code></small></td>
                    <td data-rotulo="Movimento"><SeloMovimento tipo={m.tipo} />{m.observacao && <small className="adm-uma-linha" title={m.observacao}>{m.observacao}</small>}</td>
                    <td data-rotulo="Quantidade"><Quantidade valor={m.quantidade} unidade={m.unidade} /></td>
                    <td data-rotulo="Saldo"><span className="adm-saldo"><span className="adm-mudo">{quantidade(m.saldo_anterior)} →</span> <strong>{quantidade(m.saldo_posterior)}</strong></span></td>
                    <td data-rotulo="Custo / valor" className="adm-col-opcional">{dinheiro(m.custo_unitario)}<small>{m.custo_unitario !== null ? dinheiro(Math.abs(m.quantidade) * m.custo_unitario) : ''}</small></td>
                    <td data-rotulo="Origem">
                      {m.orcamento_id ? <Link className="adm-link-forte" to={`/admin/pedidos/${m.orcamento_id}`}>Pedido {protocolo(m.orcamento_id)}</Link> : (m.documento || <span className="adm-mudo">—</span>)}
                      {m.fornecedor_nome && <small>{m.fornecedor_nome}</small>}
                    </td>
                    <td data-rotulo="Quando">{dataHora(m.criado_em)}<small>{m.administrador_nome || 'Sistema'}</small></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {novo && <MovimentarEstoque onFechar={() => setNovo(false)} onSalvo={() => { setNovo(false); carregar(); avisar('Movimentação registrada.'); }} />}
    </>
  );
}
