// frontend/src/utils/estoque.js
import { semAcento } from './texto';

// Chave de SITUACOES_ESTOQUE (constants/estoque.js) para o produto
export function situacaoEstoque(p) {
  if (!p.controla_estoque) return 'nao-controla';
  if (p.estoque < 0) return 'negativo';
  if (p.estoque === 0) return 'zerado';
  if (p.estoque_minimo !== null && p.estoque_minimo !== undefined && p.estoque <= p.estoque_minimo) return 'baixo';
  if (p.estoque_maximo !== null && p.estoque_maximo !== undefined && p.estoque > p.estoque_maximo) return 'excesso';
  return 'ok';
}

// Margem sobre o preço de venda, em %
export const margem = (preco, custo) => (preco && custo !== null && custo !== undefined ? ((preco - custo) / preco) * 100 : null);

// Busca de produto por código, código de barras, nome, marca ou descrição
export const produtoCombina = (p, termo) => {
  const t = semAcento(termo).trim();
  if (!t) return true;
  return semAcento(`${p.codigo} ${p.codigo_barras || ''} ${p.nome} ${p.marca || ''} ${p.descricao || ''}`).includes(t);
};
