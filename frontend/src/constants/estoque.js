// frontend/src/constants/estoque.js

// sinal: +1 entra, -1 sai, 0 = o sistema calcula (ajuste/inventário)
export const TIPOS_MOVIMENTO = {
  entrada: { nome: 'Entrada', descricao: 'Compra ou recebimento de mercadoria', sinal: 1 },
  devolucao: { nome: 'Devolução', descricao: 'Cliente devolveu a mercadoria', sinal: 1 },
  saida: { nome: 'Saída', descricao: 'Uso interno ou retirada sem pedido', sinal: -1 },
  perda: { nome: 'Perda', descricao: 'Quebra, avaria ou vencimento', sinal: -1 },
  ajuste: { nome: 'Ajuste', descricao: 'Corrigir o saldo para o valor certo', sinal: 0 },
  venda: { nome: 'Venda', descricao: 'Baixa automática do pedido concluído', sinal: -1 },
  estorno: { nome: 'Estorno', descricao: 'Pedido reaberto ou excluído', sinal: 1 },
  inventario: { nome: 'Inventário', descricao: 'Diferença encontrada na contagem', sinal: 0 },
};

// Tipos que a pessoa lança à mão (venda, estorno e inventário são automáticos)
export const TIPOS_MANUAIS = ['entrada', 'saida', 'perda', 'devolucao', 'ajuste'];

export const SITUACOES_ESTOQUE = {
  ok: 'Normal',
  baixo: 'Abaixo do mínimo',
  zerado: 'Sem estoque',
  negativo: 'Negativo',
  excesso: 'Acima do máximo',
  'nao-controla': 'Não controla',
};
