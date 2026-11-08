// Modal de movimentação avulsa: entrada, saída, perda, devolução ou ajuste de um produto.
import { useEffect, useState } from 'react';
import { ArrowRight, LoaderCircle } from 'lucide-react';
import api from '../services/api';
import { Modal, SeletorProduto } from './componentes';
import { TIPOS_MANUAIS, TIPOS_MOVIMENTO, dinheiro, lerNumero, mensagemErro, quantidade } from './util';

export default function MovimentarEstoque({ produto: produtoInicial, tipoInicial = 'entrada', onFechar, onSalvo }) {
  const [produto, setProduto] = useState(produtoInicial || null);
  const [produtos, setProdutos] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [tipo, setTipo] = useState(tipoInicial);
  const [dados, setDados] = useState({ quantidade: '', novo_saldo: '', custo_unitario: '', documento: '', fornecedor_id: '', observacao: '' });
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!produtoInicial) api.get('/admin/produtos').then(({ data }) => setProdutos(data)).catch(() => {});
    api.get('/admin/fornecedores').then(({ data }) => setFornecedores(data.filter(f => f.ativo))).catch(() => {});
  }, [produtoInicial]);

  useEffect(() => {
    if (produto && tipo === 'entrada') {
      setDados(d => ({ ...d, custo_unitario: d.custo_unitario || (produto.custo ?? ''), fornecedor_id: d.fornecedor_id || (produto.fornecedor_id ?? '') }));
    }
    if (produto && tipo === 'ajuste') setDados(d => ({ ...d, novo_saldo: d.novo_saldo === '' ? String(produto.estoque) : d.novo_saldo }));
  }, [produto, tipo]);

  const mudar = (campo, valor) => setDados(d => ({ ...d, [campo]: valor }));
  const unidade = produto?.unidade || 'un';
  const qtd = lerNumero(dados.quantidade) || 0;
  const saldoApos = !produto ? null
    : tipo === 'ajuste' ? lerNumero(dados.novo_saldo)
      : Math.round((produto.estoque + qtd * TIPOS_MOVIMENTO[tipo].sinal) * 1000) / 1000;
  const motivoObrigatorio = tipo === 'perda' || tipo === 'ajuste';

  const salvar = async e => {
    e.preventDefault();
    if (!produto) { setErro('Escolha o produto.'); return; }
    setSalvando(true);
    setErro('');
    try {
      const { data } = await api.post('/admin/estoque/movimentacoes', {
        produto_id: produto.id, tipo,
        quantidade: lerNumero(dados.quantidade),
        novo_saldo: lerNumero(dados.novo_saldo),
        custo_unitario: lerNumero(dados.custo_unitario),
        documento: dados.documento, fornecedor_id: dados.fornecedor_id || null, observacao: dados.observacao,
      });
      onSalvo(data);
    } catch (falha) {
      setErro(mensagemErro(falha, 'Não foi possível registrar a movimentação.'));
      setSalvando(false);
    }
  };

  return (
    <Modal titulo="Movimentar estoque" subtitulo={produto ? `${produto.codigo} · ${produto.nome}` : 'Escolha o produto e o tipo de movimento.'} onFechar={onFechar} largura={600}>
      <form className="adm-formulario" onSubmit={salvar}>
        {erro && <p className="adm-erro">{erro}</p>}

        {!produtoInicial && (
          <div className="adm-campo">
            <span>Produto *</span>
            {produto
              ? <div className="adm-produto-escolhido"><code>{produto.codigo}</code><strong>{produto.nome}</strong><button type="button" className="adm-link" onClick={() => setProduto(null)}>Trocar</button></div>
              : <SeletorProduto produtos={produtos} onEscolher={setProduto} autoFocus />}
          </div>
        )}

        <div className="adm-campo">
          <span>Tipo de movimento</span>
          <div className="adm-tipos-mov">
            {TIPOS_MANUAIS.map(t => (
              <button key={t} type="button" className={`${tipo === t ? 'ativo' : ''} adm-tipo--${TIPOS_MOVIMENTO[t].sinal > 0 ? 'entra' : TIPOS_MOVIMENTO[t].sinal < 0 ? 'sai' : 'ajusta'}`} onClick={() => setTipo(t)}>
                <strong>{TIPOS_MOVIMENTO[t].nome}</strong><small>{TIPOS_MOVIMENTO[t].descricao}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="adm-formulario--2">
          {tipo === 'ajuste' ? (
            <label className="adm-campo"><span>Saldo correto *</span><div className="adm-campo-unidade adm-campo-unidade--largo"><input type="number" step="0.001" value={dados.novo_saldo} onChange={e => mudar('novo_saldo', e.target.value)} required autoFocus={Boolean(produtoInicial)} /><span>{unidade}</span></div></label>
          ) : (
            <label className="adm-campo"><span>Quantidade *</span><div className="adm-campo-unidade adm-campo-unidade--largo"><input type="number" min="0.001" step="0.001" value={dados.quantidade} onChange={e => mudar('quantidade', e.target.value)} required autoFocus={Boolean(produtoInicial)} /><span>{unidade}</span></div></label>
          )}
          {tipo === 'entrada' && (
            <label className="adm-campo"><span>Custo unitário <small>(atualiza o custo médio)</small></span><div className="adm-campo-dinheiro"><span>R$</span><input type="number" min="0" step="0.01" value={dados.custo_unitario} onChange={e => mudar('custo_unitario', e.target.value)} placeholder="0,00" /></div></label>
          )}
        </div>

        {tipo === 'entrada' && (
          <div className="adm-formulario--2">
            <label className="adm-campo"><span>Fornecedor</span><select value={dados.fornecedor_id} onChange={e => mudar('fornecedor_id', e.target.value)}><option value="">Não informado</option>{fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}</select></label>
            <label className="adm-campo"><span>Nota fiscal / documento</span><input value={dados.documento} onChange={e => mudar('documento', e.target.value)} placeholder="Ex.: NF 12345" /></label>
          </div>
        )}

        <label className="adm-campo">
          <span>{motivoObrigatorio ? 'Motivo *' : 'Observação'}</span>
          <input value={dados.observacao} onChange={e => mudar('observacao', e.target.value)} required={motivoObrigatorio} maxLength={255}
            placeholder={tipo === 'perda' ? 'Ex.: 2 sacos rasgados na descarga' : tipo === 'ajuste' ? 'Ex.: contagem do galpão 2' : 'Opcional'} />
        </label>

        {produto && produto.controla_estoque && (
          <div className="adm-previa-saldo">
            <div><small>Saldo atual</small><strong>{quantidade(produto.estoque)} {unidade}</strong></div>
            <ArrowRight size={18} />
            <div><small>Depois do movimento</small><strong className={saldoApos !== null && saldoApos < 0 ? 'adm-qtd-sai' : ''}>{saldoApos === null || Number.isNaN(saldoApos) ? '—' : `${quantidade(saldoApos)} ${unidade}`}</strong></div>
            {tipo === 'entrada' && lerNumero(dados.custo_unitario) !== null && qtd > 0 && <div><small>Total da entrada</small><strong>{dinheiro(qtd * lerNumero(dados.custo_unitario))}</strong></div>}
          </div>
        )}
        {produto && !produto.controla_estoque && <p className="adm-alerta adm-alerta--interno">Este produto está marcado para não controlar estoque. O movimento será registrado mesmo assim.</p>}

        <footer className="adm-modal-rodape">
          <button type="button" className="adm-botao" onClick={onFechar}>Cancelar</button>
          <button className="adm-botao adm-botao--primario" disabled={salvando || !produto}>{salvando && <LoaderCircle size={16} className="adm-girando" />} Registrar {TIPOS_MOVIMENTO[tipo].nome.toLowerCase()}</button>
        </footer>
      </form>
    </Modal>
  );
}
