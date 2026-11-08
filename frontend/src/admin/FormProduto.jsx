// Cadastro completo do produto: identificação, preço/custo, estoque e exibição no site.
import { useEffect, useRef, useState } from 'react';
import { Package, ImageUp, LoaderCircle, Barcode, BadgeDollarSign, Warehouse, Globe } from 'lucide-react';
import api from '../services/api';
import { Modal } from './componentes';
import { UNIDADES, dinheiro, lerNumero, margem, mensagemErro, percentual } from './util';

const texto = v => (v === null || v === undefined ? '' : String(v));

export default function FormProduto({ produto, onFechar, onSalvo }) {
  const novo = !produto.id;
  const [categorias, setCategorias] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [dados, setDados] = useState({
    codigo: produto.codigo || '',
    codigo_barras: produto.codigo_barras || '',
    nome: produto.nome || '',
    marca: produto.marca || '',
    categoria_id: produto.categoria_id || '',
    unidade: produto.unidade || 'un',
    custo: texto(produto.custo),
    preco: texto(produto.preco),
    controla_estoque: novo ? true : Boolean(produto.controla_estoque),
    estoque_inicial: '',
    estoque_minimo: texto(produto.estoque_minimo),
    estoque_maximo: texto(produto.estoque_maximo),
    localizacao: produto.localizacao || '',
    fornecedor_id: produto.fornecedor_id || '',
    descricao: produto.descricao || '',
    imagem_url: produto.imagem_url || '',
    ativo: novo ? true : Boolean(produto.ativo),
  });
  const [margemDesejada, setMargemDesejada] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const arquivo = useRef(null);

  useEffect(() => {
    api.get('/admin/categorias').then(({ data }) => setCategorias(data)).catch(() => {});
    api.get('/admin/fornecedores').then(({ data }) => setFornecedores(data)).catch(() => {});
  }, []);

  const mudar = (campo, valor) => setDados(d => ({ ...d, [campo]: valor }));
  const custo = lerNumero(dados.custo);
  const preco = lerNumero(dados.preco);
  const margemAtual = margem(preco, custo);

  // Preço = custo / (1 - margem): margem de 30% sobre a venda
  const aplicarMargem = () => {
    const m = lerNumero(margemDesejada);
    if (custo === null || m === null || m >= 100) return;
    mudar('preco', (Math.ceil((custo / (1 - m / 100)) * 100) / 100).toFixed(2));
  };

  const enviarFoto = async e => {
    const foto = e.target.files?.[0];
    if (!foto) return;
    setEnviandoFoto(true);
    setErro('');
    try {
      const corpo = new FormData();
      corpo.append('imagem', foto);
      const { data } = await api.post('/admin/upload', corpo);
      mudar('imagem_url', data.url);
    } catch (falha) {
      setErro(mensagemErro(falha, 'Não foi possível enviar a foto.'));
    } finally {
      setEnviandoFoto(false);
      e.target.value = '';
    }
  };

  const salvar = async e => {
    e.preventDefault();
    setSalvando(true);
    setErro('');
    try {
      let resposta;
      if (novo) resposta = (await api.post('/admin/produtos', dados)).data;
      else await api.put(`/admin/produtos/${produto.id}`, dados);
      onSalvo(novo, resposta);
    } catch (falha) {
      setErro(mensagemErro(falha, 'Não foi possível salvar o produto.'));
      setSalvando(false);
    }
  };

  return (
    <Modal titulo={novo ? 'Novo produto' : 'Editar produto'} subtitulo={novo ? undefined : `${produto.codigo} · ${produto.nome}`} onFechar={onFechar} largura={760}>
      <form className="adm-formulario" onSubmit={salvar}>
        {erro && <p className="adm-erro">{erro}</p>}

        <fieldset className="adm-secao-form">
          <legend><Barcode size={16} /> Identificação</legend>
          <label className="adm-campo"><span>Nome *</span><input value={dados.nome} onChange={e => mudar('nome', e.target.value)} required autoFocus placeholder="Ex.: Cimento CP II 50kg" maxLength={150} /></label>
          <div className="adm-formulario--3">
            <label className="adm-campo"><span>Código interno <small>(vazio = automático)</small></span><input value={dados.codigo} onChange={e => mudar('codigo', e.target.value.toUpperCase())} placeholder="Ex.: CIM-001" maxLength={30} /></label>
            <label className="adm-campo"><span>Código de barras</span><input value={dados.codigo_barras} onChange={e => mudar('codigo_barras', e.target.value.replace(/\s/g, ''))} placeholder="EAN / GTIN" maxLength={30} inputMode="numeric" /></label>
            <label className="adm-campo"><span>Marca</span><input value={dados.marca} onChange={e => mudar('marca', e.target.value)} placeholder="Ex.: Votoran" maxLength={80} /></label>
          </div>
          <div className="adm-formulario--2">
            <label className="adm-campo"><span>Categoria</span><select value={dados.categoria_id} onChange={e => mudar('categoria_id', e.target.value)}><option value="">Sem categoria</option>{categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></label>
            <label className="adm-campo"><span>Unidade de venda</span><select value={dados.unidade} onChange={e => mudar('unidade', e.target.value)}>{[...new Set([...UNIDADES, dados.unidade])].map(u => <option key={u}>{u}</option>)}</select></label>
          </div>
        </fieldset>

        <fieldset className="adm-secao-form">
          <legend><BadgeDollarSign size={16} /> Custo e preço</legend>
          <div className="adm-formulario--3">
            <label className="adm-campo"><span>Custo <small>(médio)</small></span><div className="adm-campo-dinheiro"><span>R$</span><input type="number" min="0" step="0.01" value={dados.custo} onChange={e => mudar('custo', e.target.value)} placeholder="0,00" /></div></label>
            <label className="adm-campo"><span>Preço de venda</span><div className="adm-campo-dinheiro"><span>R$</span><input type="number" min="0" step="0.01" value={dados.preco} onChange={e => mudar('preco', e.target.value)} placeholder="0,00" /></div></label>
            <div className="adm-campo"><span>Margem</span><div className={`adm-margem ${margemAtual !== null && margemAtual < 0 ? 'adm-margem--negativa' : ''}`}>{percentual(margemAtual)}{preco !== null && custo !== null && <small>lucro {dinheiro(preco - custo)} por {dados.unidade}</small>}</div></div>
          </div>
          <div className="adm-linha-margem">
            <span>Calcular o preço com margem de</span>
            <div className="adm-campo-unidade"><input type="number" min="0" max="99" step="0.5" value={margemDesejada} onChange={e => setMargemDesejada(e.target.value)} placeholder="30" aria-label="Margem desejada" /><span>%</span></div>
            <button type="button" className="adm-botao adm-botao--pequeno" onClick={aplicarMargem} disabled={custo === null || !margemDesejada}>Aplicar</button>
          </div>
          <small className="adm-ajuda">O custo médio é recalculado sozinho a cada entrada de mercadoria com custo. O preço entra automaticamente nos novos pedidos.</small>
        </fieldset>

        <fieldset className="adm-secao-form">
          <legend><Warehouse size={16} /> Estoque</legend>
          <label className="adm-checkbox"><input type="checkbox" checked={dados.controla_estoque} onChange={e => mudar('controla_estoque', e.target.checked)} /> Controlar o estoque deste produto <small className="adm-mudo">(desmarque para serviços ou itens sob encomenda)</small></label>
          {dados.controla_estoque && (
            <>
              <div className={novo ? 'adm-formulario--3' : 'adm-formulario--2'}>
                {novo && <label className="adm-campo"><span>Estoque inicial</span><div className="adm-campo-unidade adm-campo-unidade--largo"><input type="number" min="0" step="0.001" value={dados.estoque_inicial} onChange={e => mudar('estoque_inicial', e.target.value)} placeholder="0" /><span>{dados.unidade}</span></div></label>}
                <label className="adm-campo"><span>Estoque mínimo <small>(alerta)</small></span><div className="adm-campo-unidade adm-campo-unidade--largo"><input type="number" min="0" step="0.001" value={dados.estoque_minimo} onChange={e => mudar('estoque_minimo', e.target.value)} placeholder="—" /><span>{dados.unidade}</span></div></label>
                <label className="adm-campo"><span>Estoque máximo <small>(reposição)</small></span><div className="adm-campo-unidade adm-campo-unidade--largo"><input type="number" min="0" step="0.001" value={dados.estoque_maximo} onChange={e => mudar('estoque_maximo', e.target.value)} placeholder="—" /><span>{dados.unidade}</span></div></label>
              </div>
              {!novo && <small className="adm-ajuda">Saldo atual: <strong>{produto.estoque} {dados.unidade}</strong>. Para mudar o saldo use <em>Movimentar</em> (entrada, saída, ajuste) — assim tudo fica registrado no histórico.</small>}
            </>
          )}
          <div className="adm-formulario--2">
            <label className="adm-campo"><span>Localização</span><input value={dados.localizacao} onChange={e => mudar('localizacao', e.target.value)} placeholder="Ex.: Galpão 2 · Corredor B · Prat. 3" maxLength={60} /></label>
            <label className="adm-campo"><span>Fornecedor principal</span><select value={dados.fornecedor_id} onChange={e => mudar('fornecedor_id', e.target.value)}><option value="">Não definido</option>{fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}{f.ativo ? '' : ' (inativo)'}</option>)}</select></label>
          </div>
        </fieldset>

        <fieldset className="adm-secao-form">
          <legend><Globe size={16} /> No site</legend>
          <div className="adm-foto-produto">
            {dados.imagem_url ? <img src={dados.imagem_url} alt="" /> : <span className="adm-miniatura adm-miniatura--grande"><Package size={30} /></span>}
            <div>
              <button type="button" className="adm-botao adm-botao--pequeno" onClick={() => arquivo.current.click()} disabled={enviandoFoto}>{enviandoFoto ? <LoaderCircle size={15} className="adm-girando" /> : <ImageUp size={15} />} {dados.imagem_url ? 'Trocar foto' : 'Enviar foto'}</button>
              {dados.imagem_url && <button type="button" className="adm-link" onClick={() => mudar('imagem_url', '')}>Remover foto</button>}
              <small>JPG, PNG ou WEBP de até 4 MB.</small>
              <input ref={arquivo} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={enviarFoto} />
            </div>
          </div>
          <label className="adm-campo"><span>Descrição</span><textarea rows="3" value={dados.descricao} onChange={e => mudar('descricao', e.target.value)} placeholder="Aparece no card do produto no site." /></label>
          <label className="adm-checkbox"><input type="checkbox" checked={dados.ativo} onChange={e => mudar('ativo', e.target.checked)} /> Mostrar este produto no site</label>
        </fieldset>

        <footer className="adm-modal-rodape"><button type="button" className="adm-botao" onClick={onFechar}>Cancelar</button><button className="adm-botao adm-botao--primario" disabled={salvando || enviandoFoto}>{salvando && <LoaderCircle size={16} className="adm-girando" />} {novo ? 'Cadastrar produto' : 'Salvar alterações'}</button></footer>
      </form>
    </Modal>
  );
}
