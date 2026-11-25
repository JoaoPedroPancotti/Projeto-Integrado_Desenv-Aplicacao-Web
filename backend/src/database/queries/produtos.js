// backend/src/database/queries/produtos.js
// Trechos SQL fixos, escritos no próprio código. Nunca interpole aqui valores da requisição:
// eles vão sempre como parâmetro ("?") em db.query(sql, params).

// Só o que o site precisa: custo, saldo, fornecedor e localização ficam restritos ao painel
const CAMPOS_PUBLICOS = 'id, categoria_id, codigo, nome, marca, descricao, preco, unidade, imagem_url, ativo';

// Quantidade reservada = itens de pedidos aprovados que ainda não foram entregues
const SQL_RESERVADO = `
  SELECT i.produto_id, SUM(i.quantidade) AS reservado
  FROM itens_orcamento i JOIN orcamentos o ON o.id = i.orcamento_id
  WHERE o.status = 'Aprovado' GROUP BY i.produto_id`;

// Produto completo para o painel: categoria, fornecedor, reservado, disponível e uso em pedidos
const SQL_PRODUTOS = `
  SELECT p.*, c.nome AS categoria_nome, f.nome AS fornecedor_nome, f.telefone AS fornecedor_telefone,
         COALESCE(r.reservado, 0) AS reservado,
         p.estoque - COALESCE(r.reservado, 0) AS disponivel,
         (SELECT COUNT(DISTINCT orcamento_id) FROM itens_orcamento WHERE produto_id = p.id) AS pedidos,
         (SELECT MAX(criado_em) FROM movimentacoes_estoque WHERE produto_id = p.id) AS ultima_movimentacao
  FROM produtos p
  LEFT JOIN categorias c ON c.id = p.categoria_id
  LEFT JOIN fornecedores f ON f.id = p.fornecedor_id
  LEFT JOIN (${SQL_RESERVADO}) r ON r.produto_id = p.id`;

module.exports = { CAMPOS_PUBLICOS, SQL_PRODUTOS };
