// Posição de estoque: quanto tem, quanto vale e o que precisa de atenção.
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import {
  Search, X, Download, PackagePlus, ClipboardCheck, ArrowLeftRight, Warehouse, TriangleAlert,
  BadgeDollarSign, Tag, PackageX, Lock, ArrowRight, Sparkles
} from 'lucide-react';
import { produtosApi, estoqueApi, categoriasApi } from '../../services/api/admin';
import { Carregando, SeloEstoque, Vazio } from '../../components/admin';
import MovimentarEstoque from '../../components/admin/MovimentarEstoque';
import { SITUACOES_ESTOQUE } from '../../constants/estoque';
import { dinheiro, quantidade } from '../../utils/formatacao';
import { produtoCombina, situacaoEstoque } from '../../utils/estoque';
import { baixarCSV } from '../../utils/csv';

const ABAS = [['', 'Todos'], ['baixo', 'Abaixo do mínimo'], ['zerado', 'Sem estoque'], ['negativo', 'Negativo'], ['excesso', 'Acima do máximo'], ['ok', 'Normal']];
const ORDENS = {
  nome: ['Nome', (a, b) => a.nome.localeCompare(b.nome, 'pt-BR')],
  codigo: ['Código', (a, b) => a.codigo.localeCompare(b.codigo, 'pt-BR', { numeric: true })],
  valor: ['Maior valor parado', (a, b) => valorDe(b) - valorDe(a)],
  saldo: ['Menor saldo', (a, b) => a.disponivel - b.disponivel],
  local: ['Localização', (a, b) => (a.localizacao || '~').localeCompare(b.localizacao || '~', 'pt-BR', { numeric: true })],
};
const valorDe = p => (p.estoque > 0 && p.custo !== null ? p.estoque * p.custo : 0);

export default function Estoque() {
  const { avisar } = useOutletContext();
  const navigate = useNavigate();
  const [parametros, setParametros] = useSearchParams();
  const [produtos, setProdutos] = useState(null);
  const [resumo, setResumo] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState('');
  const [ordem, setOrdem] = useState('nome');
  const [movimentando, setMovimentando] = useState(null);
  const situacao = parametros.get('situacao') || '';

  const carregar = () => {
    produtosApi.listar().then(data => setProdutos(data.filter(p => p.controla_estoque))).catch(() => setProdutos([]));
    estoqueApi.resumo().then(setResumo).catch(() => {});
  };
  useEffect(() => {
    carregar();
    categoriasApi.listar().then(setCategorias).catch(() => {});
  }, []);

  const contagem = useMemo(() => Object.fromEntries(ABAS.map(([s]) => [s, (produtos || []).filter(p => !s || situacaoEstoque(p) === s).length])), [produtos]);
  const filtrados = useMemo(() => (produtos || [])
    .filter(p => (!situacao || situacaoEstoque(p) === situacao) && (!categoria || String(p.categoria_id) === categoria) && produtoCombina(p, busca))
    .sort(ORDENS[ordem][1]), [produtos, situacao, categoria, busca, ordem]);
  const totalFiltrado = filtrados.reduce((s, p) => s + valorDe(p), 0);

  const exportar = () => baixarCSV('posicao-estoque', [
    ['Código', p => p.codigo], ['Produto', p => p.nome], ['Categoria', p => p.categoria_nome], ['Localização', p => p.localizacao],
    ['Unidade', p => p.unidade], ['Estoque', p => p.estoque], ['Reservado', p => p.reservado], ['Disponível', p => p.disponivel],
    ['Mínimo', p => p.estoque_minimo], ['Máximo', p => p.estoque_maximo], ['Custo médio', p => p.custo], ['Valor em estoque', valorDe],
    ['Situação', p => SITUACOES_ESTOQUE[situacaoEstoque(p)]],
  ], filtrados);

  const indicadores = resumo ? [
    ['Valor em estoque', dinheiro(resumo.valor_custo), 'pelo custo médio', BadgeDollarSign, null],
    ['Valor de venda', dinheiro(resumo.valor_venda), 'pelo preço cadastrado', Tag, null],
    ['Abaixo do mínimo', resumo.abaixo_minimo, 'precisam de reposição', TriangleAlert, 'baixo', resumo.abaixo_minimo > 0],
    ['Sem estoque', resumo.zerados, 'produtos ativos zerados', PackageX, 'zerado', resumo.zerados > 0],
    ['Reservado', quantidade(resumo.unidades_reservadas), 'unidades em pedidos aprovados', Lock, null],
  ] : [];

  return (
    <>
      <div className="adm-cabecalho">
        <div><span className="adm-etiqueta">Estoque</span><h1>Posição de estoque</h1><p>Saldo, reservas e valor de cada produto. Pedidos aprovados reservam o estoque; ao concluir o pedido a baixa é automática.</p></div>
        <div className="adm-acoes">
          <button className="adm-botao" onClick={() => setMovimentando({})}><ArrowLeftRight size={16} /> Movimentar</button>
          <Link className="adm-botao" to="/admin/estoque/inventario"><ClipboardCheck size={16} /> Inventário</Link>
          <Link className="adm-botao adm-botao--primario" to="/admin/estoque/entrada"><PackagePlus size={17} /> Entrada de mercadoria</Link>
        </div>
      </div>

      {resumo && resumo.total_movimentacoes === 0 && (
        <Link to="/admin/estoque/inventario" className="adm-alerta adm-alerta--info">
          <Sparkles size={19} />
          <span><strong>Comece pelo inventário.</strong> Conte o que existe hoje na loja e no depósito e lance tudo de uma vez — o sistema cria o saldo inicial de cada produto.</span>
          <ArrowRight size={17} />
        </Link>
      )}
      {resumo?.negativos > 0 && (
        <button type="button" onClick={() => setParametros({ situacao: 'negativo' })} className="adm-alerta adm-alerta--perigo">
          <TriangleAlert size={19} />
          <span><strong>{resumo.negativos} {resumo.negativos === 1 ? 'produto está' : 'produtos estão'} com saldo negativo.</strong> Normalmente é venda concluída sem a entrada da mercadoria lançada. Registre a entrada ou faça um ajuste.</span>
          <ArrowRight size={17} />
        </button>
      )}
      {resumo && (resumo.sem_custo > 0 || resumo.sem_minimo > 0) && resumo.total_movimentacoes > 0 && (
        <p className="adm-dica-linha">
          {resumo.sem_custo > 0 && <Link to="/admin/produtos?filtro=sem-custo">{resumo.sem_custo} sem custo cadastrado</Link>}
          {resumo.sem_custo > 0 && resumo.sem_minimo > 0 && ' · '}
          {resumo.sem_minimo > 0 && <span>{resumo.sem_minimo} sem estoque mínimo (não geram alerta de reposição)</span>}
        </p>
      )}

      <section className="adm-indicadores">
        {indicadores.map(([titulo, numero, legenda, Icone, filtro, destaque]) => {
          const conteudo = <><span><Icone size={19} /></span><small>{titulo}</small><strong>{numero}</strong><p>{legenda}</p></>;
          return filtro
            ? <button type="button" key={titulo} className={`adm-indicador ${destaque ? 'adm-indicador--destaque' : ''}`} onClick={() => setParametros({ situacao: filtro })}>{conteudo}</button>
            : <div key={titulo} className="adm-indicador adm-indicador--fixo">{conteudo}</div>;
        })}
      </section>

      <div className="adm-abas">
        {ABAS.map(([valor, nome]) => <button key={valor} className={situacao === valor ? 'ativo' : ''} onClick={() => setParametros(valor ? { situacao: valor } : {})}>{nome} <em>{contagem[valor]}</em></button>)}
      </div>

      <section className="adm-cartao adm-cartao--sem-espaco">
        <div className="adm-barra">
          <label className="adm-busca"><Search size={17} /><input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Código, código de barras ou nome" />{busca && <button onClick={() => setBusca('')} aria-label="Limpar busca"><X size={15} /></button>}</label>
          <select className="adm-select" value={categoria} onChange={e => setCategoria(e.target.value)} aria-label="Filtrar por categoria"><option value="">Todas as categorias</option>{categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select>
          <select className="adm-select" value={ordem} onChange={e => setOrdem(e.target.value)} aria-label="Ordenar">{Object.entries(ORDENS).map(([k, [nome]]) => <option key={k} value={k}>Ordenar: {nome}</option>)}</select>
          <span className="adm-mudo">{filtrados.length} itens · {dinheiro(totalFiltrado)}</span>
          <button className="adm-botao adm-botao--pequeno" onClick={exportar} disabled={!filtrados.length}><Download size={15} /> CSV</button>
        </div>

        {!produtos && <Carregando />}
        {produtos && !filtrados.length && <Vazio icone={Warehouse} titulo="Nenhum produto aqui" texto="Ajuste os filtros. Produtos marcados como “não controla estoque” não aparecem nesta tela." />}
        {produtos && filtrados.length > 0 && (
          <div className="adm-tabela-rolagem">
            <table className="adm-tabela">
              <thead><tr><th>Produto</th><th className="adm-col-opcional">Local</th><th>Estoque</th><th className="adm-col-opcional">Reservado</th><th>Disponível</th><th className="adm-col-opcional">Mín. / Máx.</th><th>Custo médio</th><th>Valor</th><th aria-label="Ações" /></tr></thead>
              <tbody>
                {filtrados.map(p => {
                  const un = p.unidade || 'un';
                  return (
                    <tr key={p.id} onClick={() => navigate(`/admin/produtos/${p.id}`)}>
                      <td><div className="adm-produto-celula"><div><strong>{p.nome}</strong><small><code className="adm-codigo">{p.codigo}</code> · <SeloEstoque produto={p} /></small></div></div></td>
                      <td data-rotulo="Local" className="adm-col-opcional">{p.localizacao || <span className="adm-mudo">—</span>}</td>
                      <td data-rotulo="Estoque"><span><strong className={p.estoque < 0 ? 'adm-qtd-sai' : ''}>{quantidade(p.estoque)}</strong> <small className="adm-inline">{un}</small></span></td>
                      <td data-rotulo="Reservado" className="adm-col-opcional">{p.reservado > 0 ? quantidade(p.reservado) : <span className="adm-mudo">—</span>}</td>
                      <td data-rotulo="Disponível"><strong className={p.disponivel < 0 ? 'adm-qtd-sai' : ''}>{quantidade(p.disponivel)}</strong></td>
                      <td data-rotulo="Mín. / Máx." className="adm-mudo adm-col-opcional">{p.estoque_minimo !== null ? quantidade(p.estoque_minimo) : '—'} / {p.estoque_maximo !== null ? quantidade(p.estoque_maximo) : '—'}</td>
                      <td data-rotulo="Custo médio">{p.custo !== null ? dinheiro(p.custo) : <span className="adm-texto-alerta">Sem custo</span>}</td>
                      <td data-rotulo="Valor"><strong>{dinheiro(valorDe(p))}</strong></td>
                      <td data-acoes onClick={e => e.stopPropagation()}><button className="adm-icone-botao" onClick={() => setMovimentando(p)} title="Movimentar" aria-label={`Movimentar ${p.nome}`}><ArrowLeftRight size={16} /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {movimentando && (
        <MovimentarEstoque
          produto={movimentando.id ? movimentando : null}
          onFechar={() => setMovimentando(null)}
          onSalvo={() => { setMovimentando(null); carregar(); avisar('Movimentação registrada.'); }}
        />
      )}
    </>
  );
}
