// Relatórios de estoque: reposição (pedido de compra), curva ABC, produtos parados,
// valor por categoria e resultado do período (faturamento x custo das mercadorias).
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, MessageCircle, RefreshCw, ShoppingCart, ChartColumnBig, Hourglass, Layers } from 'lucide-react';
import api from '../services/api';
import { Carregando, Vazio } from './componentes';
import { baixarCSV, dataCurta, dinheiro, linkWhatsApp, percentual, quantidade } from './util';

const PERIODOS = [[30, '30 dias'], [90, '90 dias'], [180, '6 meses'], [365, '12 meses']];
const ABAS = [['reposicao', 'Reposição', ShoppingCart], ['abc', 'Curva ABC', ChartColumnBig], ['parados', 'Produtos parados', Hourglass], ['categorias', 'Por categoria', Layers]];

// Quanto comprar: até o máximo (ou o dobro do mínimo, se não houver máximo)
const sugerido = p => {
  const alvo = p.estoque_maximo ?? Math.max(p.estoque_minimo * 2, p.estoque_minimo + 1);
  return Math.max(Math.ceil(alvo - p.disponivel), 1);
};

export default function Relatorios() {
  const [dias, setDias] = useState(90);
  const [aba, setAba] = useState('reposicao');
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(false);

  const carregar = () => {
    setErro(false);
    setDados(null);
    api.get('/admin/estoque/relatorios', { params: { dias } }).then(({ data }) => setDados(data)).catch(() => setErro(true));
  };
  useEffect(carregar, [dias]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div className="adm-cabecalho">
        <div><span className="adm-etiqueta">Estoque</span><h1>Relatórios</h1><p>O que comprar, o que mais vende, o que está parado e quanto o estoque rendeu no período.</p></div>
        <div className="adm-abas adm-abas--compacta">
          {PERIODOS.map(([d, nome]) => <button key={d} className={dias === d ? 'ativo' : ''} onClick={() => setDias(d)}>{nome}</button>)}
        </div>
      </div>

      {erro && <Vazio titulo="Não foi possível carregar os relatórios"><button className="adm-botao" onClick={carregar}><RefreshCw size={16} /> Tentar novamente</button></Vazio>}
      {!erro && !dados && <Carregando />}
      {dados && (
        <>
          <Resultado resultado={dados.resultado} dias={dados.dias} />
          <div className="adm-abas">
            {ABAS.map(([k, nome, Icone]) => <button key={k} className={aba === k ? 'ativo' : ''} onClick={() => setAba(k)}><Icone size={15} /> {nome}</button>)}
          </div>
          {aba === 'reposicao' && <Reposicao itens={dados.reposicao} />}
          {aba === 'abc' && <CurvaAbc itens={dados.curva_abc} dias={dados.dias} />}
          {aba === 'parados' && <Parados itens={dados.parados} dias={dados.dias} />}
          {aba === 'categorias' && <PorCategoria itens={dados.por_categoria} />}
        </>
      )}
    </>
  );
}

function Resultado({ resultado: r, dias }) {
  const margemBruta = r.faturamento ? (r.lucro_bruto / r.faturamento) * 100 : null;
  return (
    <section className="adm-indicadores">
      <div className="adm-indicador adm-indicador--fixo"><small>Faturamento</small><strong>{dinheiro(r.faturamento)}</strong><p>itens de pedidos concluídos ({dias} dias)</p></div>
      <div className="adm-indicador adm-indicador--fixo"><small>Custo das mercadorias</small><strong>{dinheiro(r.cmv)}</strong><p>pelo custo médio na baixa</p></div>
      <div className="adm-indicador adm-indicador--fixo adm-indicador--destaque"><small>Lucro bruto</small><strong>{dinheiro(r.lucro_bruto)}</strong><p>margem {percentual(margemBruta)}</p></div>
      <div className="adm-indicador adm-indicador--fixo"><small>Compras</small><strong>{dinheiro(r.compras)}</strong><p>entradas de mercadoria</p></div>
      <div className="adm-indicador adm-indicador--fixo"><small>Perdas e ajustes</small><strong className={r.perdas > 0 ? 'adm-qtd-sai' : ''}>{dinheiro(r.perdas)}</strong><p>ajustes/inventário: {dinheiro(r.ajustes)}</p></div>
    </section>
  );
}

function Reposicao({ itens }) {
  // Agrupa por fornecedor para virar pedido de compra
  const grupos = useMemo(() => {
    const mapa = new Map();
    itens.forEach(p => {
      const chave = p.fornecedor_id || 0;
      if (!mapa.has(chave)) mapa.set(chave, { id: p.fornecedor_id, nome: p.fornecedor_nome || 'Sem fornecedor definido', telefone: p.fornecedor_telefone, itens: [] });
      mapa.get(chave).itens.push({ ...p, sugerido: sugerido(p) });
    });
    return [...mapa.values()];
  }, [itens]);

  const exportar = () => baixarCSV('reposicao', [
    ['Fornecedor', p => p.fornecedor_nome], ['Código', p => p.codigo], ['Produto', p => p.nome], ['Unidade', p => p.unidade],
    ['Estoque', p => p.estoque], ['Reservado', p => p.reservado], ['Disponível', p => p.disponivel], ['Mínimo', p => p.estoque_minimo],
    ['Máximo', p => p.estoque_maximo], ['Comprar', sugerido], ['Custo unitário', p => p.custo], ['Custo estimado', p => sugerido(p) * (p.custo || 0)],
  ], itens);

  const mensagem = grupo => [
    'Olá! Aqui é da *Comercial Pancotti*. Gostaria de fazer um pedido:', '',
    ...grupo.itens.map(p => `• ${p.sugerido} ${p.unidade || 'un'} - ${p.nome}${p.codigo_barras ? ` (EAN ${p.codigo_barras})` : ''}`),
    '', 'Pode me passar valores e prazo de entrega?',
  ].join('\n');

  if (!itens.length) return <section className="adm-cartao"><Vazio icone={ShoppingCart} titulo="Nada para repor" texto="Nenhum produto ativo está com o disponível no mínimo ou abaixo. Produtos sem estoque mínimo cadastrado não entram neste relatório." /></section>;

  return (
    <>
      <div className="adm-barra-acoes"><span className="adm-mudo">{itens.length} produtos no mínimo ou abaixo · sugestão calculada até o estoque máximo</span><button className="adm-botao adm-botao--pequeno" onClick={exportar}><Download size={15} /> CSV</button></div>
      {grupos.map(g => {
        const total = g.itens.reduce((s, p) => s + p.sugerido * (p.custo || 0), 0);
        return (
          <section key={g.id || 0} className="adm-cartao adm-cartao--sem-espaco adm-espaco-baixo">
            <header className="adm-cartao-topo adm-cartao-topo--interno">
              <div><h2>{g.nome}</h2><p>{g.itens.length} produtos · estimado {dinheiro(total)}</p></div>
              {g.telefone && <a className="adm-botao adm-botao--whats adm-botao--pequeno" href={linkWhatsApp(g.telefone, mensagem(g))} target="_blank" rel="noreferrer"><MessageCircle size={15} /> Pedir no WhatsApp</a>}
            </header>
            <div className="adm-tabela-rolagem">
              <table className="adm-tabela adm-tabela--estatica">
                <thead><tr><th>Produto</th><th>Disponível</th><th>Mín. / Máx.</th><th>Comprar</th><th>Custo estimado</th></tr></thead>
                <tbody>
                  {g.itens.map(p => (
                    <tr key={p.id}>
                      <td><Link className="adm-link-forte" to={`/admin/produtos/${p.id}`}>{p.nome}</Link><small><code className="adm-codigo">{p.codigo}</code>{p.reservado > 0 && ` · ${quantidade(p.reservado)} reservado`}</small></td>
                      <td data-rotulo="Disponível"><strong className={p.disponivel <= 0 ? 'adm-qtd-sai' : 'adm-texto-alerta'}>{quantidade(p.disponivel)} {p.unidade || 'un'}</strong></td>
                      <td data-rotulo="Mín. / Máx." className="adm-mudo">{quantidade(p.estoque_minimo)} / {p.estoque_maximo !== null ? quantidade(p.estoque_maximo) : '—'}</td>
                      <td data-rotulo="Comprar"><strong>{quantidade(p.sugerido)} {p.unidade || 'un'}</strong></td>
                      <td data-rotulo="Custo estimado">{p.custo !== null ? dinheiro(p.sugerido * p.custo) : <span className="adm-mudo">sem custo</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </>
  );
}

function CurvaAbc({ itens, dias }) {
  const resumo = ['A', 'B', 'C'].map(c => {
    const lista = itens.filter(i => i.classe === c);
    return { classe: c, produtos: lista.length, faturamento: lista.reduce((s, i) => s + i.faturamento, 0) };
  });
  const exportar = () => baixarCSV('curva-abc', [
    ['Classe', i => i.classe], ['Código', i => i.codigo], ['Produto', i => i.nome], ['Categoria', i => i.categoria_nome],
    ['Quantidade vendida', i => i.quantidade], ['Pedidos', i => i.pedidos], ['Faturamento', i => i.faturamento],
    ['Custo estimado', i => i.custo_estimado], ['Participação %', i => i.participacao], ['Acumulado %', i => i.acumulado], ['Estoque atual', i => i.estoque],
  ], itens);

  if (!itens.length) return <section className="adm-cartao"><Vazio icone={ChartColumnBig} titulo="Sem vendas no período" texto={`Nenhum pedido concluído nos últimos ${dias} dias.`} /></section>;

  return (
    <section className="adm-cartao adm-cartao--sem-espaco">
      <header className="adm-cartao-topo adm-cartao-topo--interno">
        <div><h2>Curva ABC por faturamento</h2><p><strong>A</strong>: 80% do faturamento — nunca pode faltar. <strong>B</strong>: os 15% seguintes. <strong>C</strong>: os 5% finais.</p></div>
        <button className="adm-botao adm-botao--pequeno" onClick={exportar}><Download size={15} /> CSV</button>
      </header>
      <div className="adm-abc-resumo">
        {resumo.map(r => <div key={r.classe} className={`adm-abc-bloco adm-abc--${r.classe}`}><strong>{r.classe}</strong><span>{r.produtos} produtos</span><small>{dinheiro(r.faturamento)}</small></div>)}
      </div>
      <div className="adm-tabela-rolagem">
        <table className="adm-tabela adm-tabela--estatica">
          <thead><tr><th>Produto</th><th>Classe</th><th>Vendido</th><th>Faturamento</th><th>Participação</th><th>Estoque atual</th></tr></thead>
          <tbody>
            {itens.map(i => (
              <tr key={i.id}>
                <td><Link className="adm-link-forte" to={`/admin/produtos/${i.id}`}>{i.nome}</Link><small><code className="adm-codigo">{i.codigo}</code>{i.categoria_nome && ` · ${i.categoria_nome}`}</small></td>
                <td data-rotulo="Classe"><span className={`adm-selo adm-abc--${i.classe}`}>{i.classe}</span></td>
                <td data-rotulo="Vendido">{quantidade(i.quantidade)} {i.unidade || 'un'}<small>{i.pedidos} pedidos</small></td>
                <td data-rotulo="Faturamento"><strong>{dinheiro(i.faturamento)}</strong></td>
                <td data-rotulo="Participação"><div className="adm-barra-pct"><i style={{ width: `${Math.min(i.participacao, 100)}%` }} /></div><small>{percentual(i.participacao)} · acum. {percentual(i.acumulado)}</small></td>
                <td data-rotulo="Estoque atual">{quantidade(i.estoque)} {i.unidade || 'un'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Parados({ itens, dias }) {
  const total = itens.reduce((s, i) => s + i.valor_parado, 0);
  const exportar = () => baixarCSV('produtos-parados', [
    ['Código', i => i.codigo], ['Produto', i => i.nome], ['Categoria', i => i.categoria_nome], ['Localização', i => i.localizacao],
    ['Estoque', i => i.estoque], ['Unidade', i => i.unidade], ['Custo médio', i => i.custo], ['Valor parado', i => i.valor_parado],
    ['Última saída', i => (i.ultima_saida ? dataCurta(i.ultima_saida) : 'nunca')],
  ], itens);

  if (!itens.length) return <section className="adm-cartao"><Vazio icone={Hourglass} titulo="Nenhum produto parado" texto={`Tudo o que tem saldo teve saída nos últimos ${dias} dias.`} /></section>;

  return (
    <section className="adm-cartao adm-cartao--sem-espaco">
      <header className="adm-cartao-topo adm-cartao-topo--interno">
        <div><h2>Sem saída nos últimos {dias} dias</h2><p>{itens.length} produtos · {dinheiro(total)} parados no estoque. Considere promoção, devolução ao fornecedor ou parar de comprar.</p></div>
        <button className="adm-botao adm-botao--pequeno" onClick={exportar}><Download size={15} /> CSV</button>
      </header>
      <div className="adm-tabela-rolagem">
        <table className="adm-tabela adm-tabela--estatica">
          <thead><tr><th>Produto</th><th>Local</th><th>Estoque</th><th>Valor parado</th><th>Última saída</th></tr></thead>
          <tbody>
            {itens.map(i => (
              <tr key={i.id}>
                <td><Link className="adm-link-forte" to={`/admin/produtos/${i.id}`}>{i.nome}</Link><small><code className="adm-codigo">{i.codigo}</code>{i.categoria_nome && ` · ${i.categoria_nome}`}</small></td>
                <td data-rotulo="Local" className="adm-mudo">{i.localizacao || '—'}</td>
                <td data-rotulo="Estoque">{quantidade(i.estoque)} {i.unidade || 'un'}</td>
                <td data-rotulo="Valor parado"><strong>{i.custo !== null ? dinheiro(i.valor_parado) : <span className="adm-mudo">sem custo</span>}</strong></td>
                <td data-rotulo="Última saída">{i.ultima_saida ? dataCurta(i.ultima_saida) : <span className="adm-mudo">nunca</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PorCategoria({ itens }) {
  const maior = Math.max(1, ...itens.map(i => i.valor_custo));
  const total = itens.reduce((s, i) => ({ custo: s.custo + i.valor_custo, venda: s.venda + i.valor_venda }), { custo: 0, venda: 0 });
  const exportar = () => baixarCSV('estoque-por-categoria', [
    ['Categoria', i => i.categoria], ['Produtos', i => i.produtos], ['Valor de custo', i => i.valor_custo], ['Valor de venda', i => i.valor_venda],
  ], itens);

  return (
    <section className="adm-cartao adm-cartao--sem-espaco">
      <header className="adm-cartao-topo adm-cartao-topo--interno">
        <div><h2>Valor do estoque por categoria</h2><p>Total: {dinheiro(total.custo)} de custo · {dinheiro(total.venda)} a preço de venda</p></div>
        <button className="adm-botao adm-botao--pequeno" onClick={exportar} disabled={!itens.length}><Download size={15} /> CSV</button>
      </header>
      {!itens.length ? <Vazio titulo="Sem produtos com estoque" /> : (
        <div className="adm-tabela-rolagem">
          <table className="adm-tabela adm-tabela--estatica">
            <thead><tr><th>Categoria</th><th>Produtos</th><th>Valor de custo</th><th>Valor de venda</th></tr></thead>
            <tbody>
              {itens.map(i => (
                <tr key={i.categoria}>
                  <td><strong>{i.categoria}</strong><div className="adm-barra-pct"><i style={{ width: `${(i.valor_custo / maior) * 100}%` }} /></div></td>
                  <td data-rotulo="Produtos">{i.produtos}</td>
                  <td data-rotulo="Valor de custo"><strong>{dinheiro(i.valor_custo)}</strong><small>{total.custo ? percentual((i.valor_custo / total.custo) * 100) : '—'} do total</small></td>
                  <td data-rotulo="Valor de venda">{dinheiro(i.valor_venda)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
