// backend/src/validators/fornecedor.js
const { numero, texto, ligado } = require('../utils/conversores');

// Valores na ordem das colunas: nome, cnpj, telefone, email, contato, endereco, prazo_entrega_dias, observacoes, ativo
function dadosFornecedor(body) {
  return [
    String(body.nome || '').trim(), texto(body.cnpj), texto(body.telefone), texto(body.email)?.toLowerCase() || null,
    texto(body.contato), texto(body.endereco), numero(body.prazo_entrega_dias), texto(body.observacoes),
    ligado(body.ativo),
  ];
}

module.exports = { dadosFornecedor };
