// backend/src/validators/produto.js
// Normaliza e valida o cadastro de produto enviado pelo painel
// (as colunas gravadas ficam em repositories/produtos.js).
const { numero, texto, ligado } = require('../utils/conversores');

function dadosProduto(body) {
  return {
    codigo: texto(body.codigo)?.toUpperCase() || null,
    codigo_barras: texto(body.codigo_barras),
    categoria_id: body.categoria_id || null,
    fornecedor_id: body.fornecedor_id || null,
    nome: String(body.nome || '').trim(),
    marca: texto(body.marca),
    descricao: texto(body.descricao),
    preco: numero(body.preco),
    custo: numero(body.custo),
    unidade: texto(body.unidade),
    imagem_url: texto(body.imagem_url),
    ativo: ligado(body.ativo),
    controla_estoque: ligado(body.controla_estoque),
    estoque_minimo: numero(body.estoque_minimo),
    estoque_maximo: numero(body.estoque_maximo),
    localizacao: texto(body.localizacao),
  };
}

// Devolve a mensagem do primeiro problema encontrado, ou null se estiver tudo certo
function validarProduto(d) {
  if (!d.nome) return 'Informe o nome do produto.';
  if (d.preco !== null && (Number.isNaN(d.preco) || d.preco < 0)) return 'Preço inválido.';
  if (d.custo !== null && (Number.isNaN(d.custo) || d.custo < 0)) return 'Custo inválido.';
  if (d.estoque_minimo !== null && d.estoque_maximo !== null && d.estoque_maximo < d.estoque_minimo) {
    return 'O estoque máximo não pode ser menor que o mínimo.';
  }
  return null;
}

module.exports = { dadosProduto, validarProduto };
