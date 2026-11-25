// frontend/src/constants/pedidos.js
// Fluxo do pedido de orçamento (mesma lista do backend: constants/pedidos.js)
export const STATUS = ['Pendente', 'Em Andamento', 'Respondido', 'Aprovado', 'Concluído', 'Cancelado'];

export const STATUS_DESCRICAO = {
  'Pendente': 'Chegou pelo site e ainda não foi visto',
  'Em Andamento': 'A loja está montando o orçamento',
  'Respondido': 'Valores enviados ao cliente',
  'Aprovado': 'Cliente aceitou o orçamento',
  'Concluído': 'Entregue ou retirado',
  'Cancelado': 'Não vai seguir adiante',
};

export const FORMAS_PAGAMENTO = ['Pix', 'Dinheiro', 'Cartão de débito', 'Cartão de crédito', 'Boleto', 'A combinar'];
