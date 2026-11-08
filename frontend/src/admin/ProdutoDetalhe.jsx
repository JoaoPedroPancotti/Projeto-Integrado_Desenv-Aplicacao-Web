// Ficha do produto: saldo, reservas, custo, margem, kardex e pedidos em aberto.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, PackagePlus, PackageMinus, SlidersHorizontal, Download, History, ClipboardList, Info } from 'lucide-react';
import api from '../services/api';
import { Carregando, Quantidade, Selo, SeloEstoque, SeloMovimento, Vazio } from './componentes';
import FormProduto from './FormProduto';
import MovimentarEstoque from './MovimentarEstoque';
import { TIPOS_MOVIMENTO, baixarCSV, dataHora, dinheiro, margem, percentual, protocolo, quantidade } from './util';

export default function ProdutoDetalhe() {
  const { id } = useParams();
  const { avisar } = useOutletContext();
  const [produto, setProduto] = useState(null);
  const [erro, setErro] = useState(null);
  const [editando, setEditando] = useState(false);
  const [movimento, setMovimento] = useState(null);
  const [tipoFiltro, setTipoFiltro] = useState('');

  // erro: null | 'nao-encontrado' | 'falha' (servidor fora do ar, sem conexão etc.)
  const carregar = useCallback(() => api.get(`/admin/produtos/${id}`)
    .then(({ data }) => { setProduto(data); setErro(null); })
    .catch(e => setErro(e.response?.status === 404 ? 'nao-encontrado' : 'falha')), [id]);
  useEffect(() => { setProduto(null); setErro(null); carregar(); }, [carregar]);

  const movimentos = useMemo(() => (produto?.movimentacoes || []).filter(m => !tipoFiltro || m.tipo === tipoFiltro), [produto, tipoFiltro]);

  if (erro === 'nao-encontrado') return <Vazio titulo="Produto não encontrado"><Link className="adm-botao" to="/admin/produtos">Voltar aos produtos</Link></Vazio>;
  if (erro && !produto) return (
    <Vazio titulo="Não foi possível carregar o produto" texto="Verifique sua conexão ou se o servidor está no ar.">
      <button type="button" className="adm-botao" onClick={() => { setErro(null); carregar(); }}>Tentar novamente</button>
      <Link className="adm-botao" to="/admin/produtos">Voltar aos produtos</Link>
    </Vazio>
  );
  if (!produto) return <Carregando />;

  const un = produto.unidade || 'un';
  const m = margem(produto.preco, produto.custo);
  const valorEstoque = produto.custo !== null && produto.estoque > 0 ? produto.estoque * produto.custo : null;

  const exportar = () => baixarCSV(`kardex-${produto.codigo}`, [
    ['Data', x => dataHora(x.criado_em)], ['Tipo', x => TIPOS_MOVIMENTO[x.tipo]?.nome], ['Quantidade', x => x.quantidade],
    ['Saldo anterior', x => x.saldo_anterior], ['Saldo posterior', x => x.saldo_posterior], ['Custo unitário', x => x.custo_unitario],
    ['Documento', x => x.documento], ['Pedido', x => (x.orcamento_id ? protocolo(x.orcamento_id) : '')], ['Fornecedor', x => x.fornecedor_nome],
    ['Usuário', x => x.administrador_nome], ['Observação', x => x.observacao],
  ], movimentos);

  return (
    <>
      <Link to="/admin/produtos" className="adm-voltar"><ArrowLeft size={16} /> Produtos</Link>
      <div className="adm-cabecalho">
        <div className="adm-produto-titulo">
          {produto.imagem_url ? <img src={produto.imagem_url} alt="" /> : <span className="adm-miniatura adm-miniatura--grande">{produto.nome.charAt(0)}</span>}
          <div>
            <span className="adm-etiqueta"><code className="adm-codigo">{produto.codigo}</code>{produto.codigo_barras && <> · EAN {produto.codigo_barras}</>}</span>
            <h1>{produto.nome} <SeloEstoque produto={produto} />{!produto.ativo && <span className="adm-selo adm-selo--cancelado">Fora do site</span>}</h1>
            <p>{[produto.marca, produto.categoria_nome, produto.localizacao && `📍 ${produto.localizacao}`].filter(Boolean).join(' · ') || 'Sem marca e categoria'}</p>
          </div>
        </div>
        <div className="adm-acoes">
          <button className="adm-botao" onClick={() => setMovimento('entrada')}><PackagePlus size={16} /> Entrada</button>
          <button className="adm-botao" onClick={() => setMovimento('saida')}><PackageMinus size={16} /> Saída</button>
          <button className="adm-botao" onClick={() => setMovimento('ajuste')}><SlidersHorizontal size={16} /> Ajuste</button>
          <button className="adm-botao adm-botao--primario" onClick={() => setEditando(true)}><Pencil size={16} /> Editar</button>
        </div>
      </div>

      <section className="adm-indicadores adm-indicadores--6">
        <div className="adm-indicador"><small>Estoque atual</small><strong className={produto.estoque < 0 ? 'adm-qtd-sai' : ''}>{produto.controla_estoque ? quantidade(produto.estoque) : '—'}</strong><p>{un}{produto.estoque_minimo !== null ? ` · mín. ${quantidade(produto.estoque_minimo)}` : ''}{produto.estoque_maximo !== null ? ` · máx. ${quantidade(produto.estoque_maximo)}` : ''}</p></div>
        <div className="adm-indicador"><small>Reservado</small><strong>{quantidade(produto.reservado)}</strong><p>em pedidos aprovados</p></div>
        <div className="adm-indicador"><small>Disponível</small><strong className={produto.disponivel < 0 ? 'adm-qtd-sai' : ''}>{quantidade(produto.disponivel)}</strong><p>estoque − reservado</p></div>
        <div className="adm-indicador"><small>Custo médio</small><strong>{dinheiro(produto.custo)}</strong><p>por {un}</p></div>
        <div className="adm-indicador"><small>Preço de venda</small><strong>{dinheiro(produto.preco)}</strong><p>margem {percentual(m)}</p></div>
        <div className="adm-indicador"><small>Valor em estoque</small><strong>{dinheiro(valorEstoque)}</strong><p>pelo custo médio</p></div>
      </section>

      <div className="adm-detalhe">
        <div className="adm-detalhe-principal">
          <section className="adm-cartao adm-cartao--sem-espaco">
            <header className="adm-cartao-topo adm-cartao-topo--interno">
              <div><h2><History size={16} /> Histórico de movimentações (kardex)</h2><p>Cada entrada e saída, com o saldo antes e depois.</p></div>
              <div className="adm-acoes">
                <select className="adm-select" value={tipoFiltro} onChange={e => setTipoFiltro(e.target.value)} aria-label="Filtrar por tipo"><option value="">Todos os tipos</option>{Object.entries(TIPOS_MOVIMENTO).map(([k, t]) => <option key={k} value={k}>{t.nome}</option>)}</select>
                <button className="adm-botao adm-botao--pequeno" onClick={exportar} disabled={!movimentos.length}><Download size={15} /> CSV</button>
              </div>
            </header>
            {!movimentos.length ? <Vazio titulo="Nenhuma movimentação" texto="Registre uma entrada ou faça um inventário para começar o controle deste produto." /> : (
              <div className="adm-tabela-rolagem">
                <table className="adm-tabela adm-tabela--estatica">
                  <thead><tr><th>Data</th><th>Movimento</th><th>Quantidade</th><th>Saldo</th><th className="adm-col-opcional">Custo unit.</th><th>Origem</th></tr></thead>
                  <tbody>
                    {movimentos.map(mov => (
                      <tr key={mov.id}>
                        <td>{dataHora(mov.criado_em)}<small>{mov.administrador_nome || 'Sistema'}</small></td>
                        <td data-rotulo="Movimento"><SeloMovimento tipo={mov.tipo} />{mov.observacao && <small className="adm-uma-linha" title={mov.observacao}>{mov.observacao}</small>}</td>
                        <td data-rotulo="Quantidade"><Quantidade valor={mov.quantidade} unidade={un} /></td>
                        <td data-rotulo="Saldo"><span className="adm-saldo"><span className="adm-mudo">{quantidade(mov.saldo_anterior)} →</span> <strong>{quantidade(mov.saldo_posterior)}</strong></span></td>
                        <td data-rotulo="Custo unit." className="adm-col-opcional">{dinheiro(mov.custo_unitario)}</td>
                        <td data-rotulo="Origem">
                          {mov.orcamento_id ? <Link className="adm-link-forte" to={`/admin/pedidos/${mov.orcamento_id}`}>Pedido {protocolo(mov.orcamento_id)}</Link> : (mov.documento || <span className="adm-mudo">—</span>)}
                          {mov.fornecedor_nome && <small>{mov.fornecedor_nome}</small>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <aside className="adm-detalhe-lateral">
          <section className="adm-cartao">
            <h2 className="adm-titulo-lateral"><Info size={16} /> Cadastro</h2>
            <dl className="adm-ficha">
              <div><dt>Código</dt><dd><code className="adm-codigo">{produto.codigo}</code></dd></div>
              <div><dt>Código de barras</dt><dd>{produto.codigo_barras || '—'}</dd></div>
              <div><dt>Marca</dt><dd>{produto.marca || '—'}</dd></div>
              <div><dt>Categoria</dt><dd>{produto.categoria_nome || '—'}</dd></div>
              <div><dt>Unidade</dt><dd>{un}</dd></div>
              <div><dt>Localização</dt><dd>{produto.localizacao || '—'}</dd></div>
              <div><dt>Fornecedor</dt><dd>{produto.fornecedor_nome ? <Link className="adm-link-forte" to={`/admin/fornecedores?ver=${produto.fornecedor_id}`}>{produto.fornecedor_nome}</Link> : '—'}</dd></div>
              <div><dt>Controla estoque</dt><dd>{produto.controla_estoque ? 'Sim' : 'Não'}</dd></div>
              <div><dt>Pedidos com ele</dt><dd>{produto.pedidos}</dd></div>
            </dl>
          </section>

          <section className="adm-cartao">
            <h2 className="adm-titulo-lateral">Últimos 90 dias</h2>
            <dl className="adm-ficha">
              <div><dt>Vendido</dt><dd>{quantidade(produto.giro.vendido_90d)} {un}</dd></div>
              <div><dt>Comprado</dt><dd>{quantidade(produto.giro.comprado_90d)} {un}</dd></div>
              <div><dt>Perdas</dt><dd className={produto.giro.perdas_90d > 0 ? 'adm-qtd-sai' : ''}>{quantidade(produto.giro.perdas_90d)} {un}</dd></div>
              <div><dt>Cobertura</dt><dd>{produto.giro.vendido_90d > 0 && produto.estoque > 0 ? `≈ ${Math.round(produto.estoque / (produto.giro.vendido_90d / 90))} dias` : '—'}</dd></div>
            </dl>
          </section>

          <section className="adm-cartao">
            <h2 className="adm-titulo-lateral"><ClipboardList size={16} /> Pedidos em aberto</h2>
            {produto.pedidos_abertos.length ? (
              <ul className="adm-lista-simples">
                {produto.pedidos_abertos.map(p => (
                  <li key={p.id}><Link to={`/admin/pedidos/${p.id}`}><strong>{protocolo(p.id)}</strong> {p.cliente_nome}<small>{quantidade(p.quantidade)} {un}</small></Link><Selo status={p.status} /></li>
                ))}
              </ul>
            ) : <p className="adm-mudo">Nenhum pedido em aberto com este produto.</p>}
          </section>
        </aside>
      </div>

      {editando && <FormProduto produto={produto} onFechar={() => setEditando(false)} onSalvo={() => { setEditando(false); carregar(); avisar('Produto atualizado.'); }} />}
      {movimento && <MovimentarEstoque produto={produto} tipoInicial={movimento} onFechar={() => setMovimento(null)} onSalvo={() => { setMovimento(null); carregar(); avisar('Movimentação registrada.'); }} />}
    </>
  );
}
