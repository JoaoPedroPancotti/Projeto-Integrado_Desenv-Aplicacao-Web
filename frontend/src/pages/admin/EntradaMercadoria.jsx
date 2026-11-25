// Entrada de mercadoria: lança a nota fiscal do fornecedor inteira de uma vez.
// Aceita leitor de código de barras: cada leitura soma 1 na quantidade do produto.
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { ArrowLeft, Trash2, LoaderCircle, PackagePlus, ScanBarcode } from 'lucide-react';
import { produtosApi, estoqueApi, fornecedoresApi } from '../../services/api/admin';
import { Carregando, SeletorProduto, Vazio } from '../../components/admin';
import { dinheiro, percentual, quantidade } from '../../utils/formatacao';
import { lerNumero } from '../../utils/numeros';
import { margem } from '../../utils/estoque';
import { mensagemErro } from '../../utils/erros';

export default function EntradaMercadoria() {
  const navigate = useNavigate();
  const { avisar } = useOutletContext();
  const [produtos, setProdutos] = useState(null);
  const [fornecedores, setFornecedores] = useState([]);
  const [nota, setNota] = useState({ fornecedor_id: '', documento: '', observacao: '' });
  const [itens, setItens] = useState([]);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    produtosApi.listar().then(setProdutos).catch(() => setProdutos([]));
    fornecedoresApi.listar().then(data => setFornecedores(data.filter(f => f.ativo))).catch(() => {});
  }, []);

  const adicionar = produto => {
    setItens(lista => {
      const existente = lista.find(i => i.produto.id === produto.id);
      if (existente) return lista.map(i => (i === existente ? { ...i, quantidade: String((lerNumero(i.quantidade) || 0) + 1) } : i));
      return [...lista, { produto, quantidade: '1', custo_unitario: produto.custo !== null ? String(produto.custo) : '', preco_venda: '' }];
    });
  };
  const mudarItem = (id, campo, valor) => setItens(lista => lista.map(i => (i.produto.id === id ? { ...i, [campo]: valor } : i)));
  const remover = id => setItens(lista => lista.filter(i => i.produto.id !== id));

  const total = useMemo(() => itens.reduce((s, i) => s + (lerNumero(i.quantidade) || 0) * (lerNumero(i.custo_unitario) || 0), 0), [itens]);
  const semCusto = itens.filter(i => lerNumero(i.custo_unitario) === null).length;

  const salvar = async e => {
    e.preventDefault();
    if (!itens.length) { setErro('Adicione pelo menos um produto.'); return; }
    if (!window.confirm(`Registrar a entrada de ${itens.length} ${itens.length === 1 ? 'produto' : 'produtos'} (${dinheiro(total)})?`)) return;
    setSalvando(true);
    setErro('');
    try {
      const data = await estoqueApi.registrarEntrada({
        ...nota,
        fornecedor_id: nota.fornecedor_id || null,
        itens: itens.map(i => ({ produto_id: i.produto.id, quantidade: lerNumero(i.quantidade), custo_unitario: lerNumero(i.custo_unitario), preco_venda: lerNumero(i.preco_venda) })),
      });
      avisar(data.mensagem);
      navigate('/admin/estoque/movimentacoes?tipo=entrada');
    } catch (falha) {
      setErro(mensagemErro(falha, 'Não foi possível registrar a entrada.'));
      setSalvando(false);
    }
  };

  if (!produtos) return <Carregando />;

  return (
    <form onSubmit={salvar}>
      <Link to="/admin/estoque" className="adm-voltar"><ArrowLeft size={16} /> Estoque</Link>
      <div className="adm-cabecalho">
        <div><span className="adm-etiqueta">Estoque</span><h1>Entrada de mercadoria</h1><p>Lance a nota do fornecedor: o saldo de cada produto aumenta e o custo médio é recalculado. Se quiser, já atualize o preço de venda.</p></div>
      </div>

      {erro && <p className="adm-erro adm-erro--espaco">{erro}</p>}

      <section className="adm-cartao adm-espaco-baixo">
        <header className="adm-cartao-topo"><div><h2>Dados da nota</h2></div><Link to="/admin/fornecedores">Cadastrar fornecedor</Link></header>
        <div className="adm-formulario--3">
          <label className="adm-campo"><span>Fornecedor</span><select value={nota.fornecedor_id} onChange={e => setNota(n => ({ ...n, fornecedor_id: e.target.value }))}><option value="">Não informado</option>{fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}</select></label>
          <label className="adm-campo"><span>Nota fiscal / documento</span><input value={nota.documento} onChange={e => setNota(n => ({ ...n, documento: e.target.value }))} placeholder="Ex.: NF 004512" maxLength={60} /></label>
          <label className="adm-campo"><span>Observação</span><input value={nota.observacao} onChange={e => setNota(n => ({ ...n, observacao: e.target.value }))} placeholder="Opcional" maxLength={255} /></label>
        </div>
      </section>

      <section className="adm-cartao">
        <header className="adm-cartao-topo">
          <div><h2>Produtos da nota</h2><p><ScanBarcode size={14} /> Digite ou passe o leitor de código de barras e aperte Enter. Ler o mesmo produto de novo soma 1.</p></div>
        </header>
        <SeletorProduto produtos={produtos} onEscolher={adicionar} autoFocus />

        {!itens.length ? <Vazio icone={PackagePlus} titulo="Nenhum produto ainda" texto="Busque acima pelo código, código de barras ou nome." /> : (
          <div className="adm-tabela-rolagem adm-espaco-cima">
            <table className="adm-tabela adm-tabela--itens adm-tabela--entrada">
              <thead><tr><th>Produto</th><th>Quantidade</th><th>Custo unitário</th><th>Subtotal</th><th>Novo preço de venda</th><th aria-label="Remover" /></tr></thead>
              <tbody>
                {itens.map(item => {
                  const p = item.produto;
                  const custo = lerNumero(item.custo_unitario);
                  const novoPreco = lerNumero(item.preco_venda);
                  const m = margem(novoPreco ?? p.preco, custo);
                  return (
                    <tr key={p.id}>
                      <td><strong>{p.nome}</strong><small><code className="adm-codigo">{p.codigo}</code> · saldo {quantidade(p.estoque)} {p.unidade || 'un'}{p.custo !== null && ` · custo atual ${dinheiro(p.custo)}`}</small></td>
                      <td data-campo="Quantidade"><label className="adm-campo-unidade"><input type="number" min="0.001" step="0.001" value={item.quantidade} onChange={e => mudarItem(p.id, 'quantidade', e.target.value)} required aria-label={`Quantidade de ${p.nome}`} /><span>{p.unidade || 'un'}</span></label></td>
                      <td data-campo="Custo unitário"><label className="adm-campo-dinheiro"><span>R$</span><input type="number" min="0" step="0.0001" value={item.custo_unitario} onChange={e => mudarItem(p.id, 'custo_unitario', e.target.value)} placeholder="0,00" className={custo === null ? 'adm-input-vazio' : ''} aria-label={`Custo de ${p.nome}`} /></label></td>
                      <td><strong>{dinheiro((lerNumero(item.quantidade) || 0) * (custo || 0))}</strong></td>
                      <td data-campo="Novo preço de venda">
                        <label className="adm-campo-dinheiro"><span>R$</span><input type="number" min="0" step="0.01" value={item.preco_venda} onChange={e => mudarItem(p.id, 'preco_venda', e.target.value)} placeholder={p.preco !== null ? String(p.preco) : 'manter'} aria-label={`Novo preço de ${p.nome}`} /></label>
                        <small className={m !== null && m < 0 ? 'adm-qtd-sai' : ''}>margem {percentual(m)}</small>
                      </td>
                      <td><button type="button" className="adm-icone-botao" onClick={() => remover(p.id)} title="Remover" aria-label={`Remover ${p.nome}`}><Trash2 size={16} /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {itens.length > 0 && (
        <div className="adm-barra-salvar">
          <span>{itens.length} {itens.length === 1 ? 'produto' : 'produtos'} · <strong>{dinheiro(total)}</strong>{semCusto > 0 && ` · ${semCusto} sem custo`}</span>
          <button type="button" className="adm-botao" onClick={() => setItens([])} disabled={salvando}>Limpar</button>
          <button className="adm-botao adm-botao--primario" disabled={salvando}>{salvando ? <LoaderCircle size={16} className="adm-girando" /> : <PackagePlus size={16} />} Registrar entrada</button>
        </div>
      )}
    </form>
  );
}
