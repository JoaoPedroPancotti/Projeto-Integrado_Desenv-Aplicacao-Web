// frontend/src/admin/util.js
// Formatação e textos usados em várias telas do painel.

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

export const UNIDADES = ['un', 'saco', 'm³', 'm²', 'm', 'milheiro', 'barra', 'rolo', 'lata', 'galão', 'kg', 'caixa', 'peça'];

export const classeStatus = status => `adm-selo adm-selo--${(status || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, '-')}`;

export const protocolo = id => `#${String(id).padStart(6, '0')}`;

export const dinheiro = valor => (valor === null || valor === undefined || valor === ''
  ? '—'
  : Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));

export const quantidade = valor => Number(valor).toLocaleString('pt-BR', { maximumFractionDigits: 3 });

export const dataHora = data => new Date(data).toLocaleString('pt-BR', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

export const dataCurta = data => new Date(data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

export function haQuanto(data) {
  const minutos = Math.round((Date.now() - new Date(data)) / 60000);
  if (minutos < 1) return 'agora';
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.round(horas / 24);
  if (dias < 30) return `há ${dias} ${dias === 1 ? 'dia' : 'dias'}`;
  return dataCurta(data);
}

export function linkWhatsApp(telefone, texto = '') {
  let numero = String(telefone || '').replace(/\D/g, '');
  if (numero.length === 10 || numero.length === 11) numero = `55${numero}`;
  return `https://wa.me/${numero}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`;
}

export const mensagemErro = (erro, padrao) => erro.response?.data?.erro || padrao;

// ==========================================
// ESTOQUE
// ==========================================

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

export function situacaoEstoque(p) {
  if (!p.controla_estoque) return 'nao-controla';
  if (p.estoque < 0) return 'negativo';
  if (p.estoque === 0) return 'zerado';
  if (p.estoque_minimo !== null && p.estoque_minimo !== undefined && p.estoque <= p.estoque_minimo) return 'baixo';
  if (p.estoque_maximo !== null && p.estoque_maximo !== undefined && p.estoque > p.estoque_maximo) return 'excesso';
  return 'ok';
}

// Margem sobre o preço de venda
export const margem = (preco, custo) => (preco && custo !== null && custo !== undefined ? ((preco - custo) / preco) * 100 : null);

export const percentual = v => (v === null || v === undefined || Number.isNaN(v)
  ? '—'
  : `${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`);

// Aceita "1,5" e "1.5"; vazio vira null
export const lerNumero = v => (v === '' || v === null || v === undefined ? null : Number(String(v).replace(',', '.')));

export const hojeISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Planilha CSV que abre direto no Excel em português (separador ";" e vírgula decimal)
export function baixarCSV(nomeArquivo, colunas, linhas) {
  const celula = v => {
    if (v === null || v === undefined) return '';
    if (typeof v === 'number') return String(Math.round(v * 10000) / 10000).replace('.', ',');
    const s = String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const conteudo = [colunas.map(c => c[0]), ...linhas.map(l => colunas.map(([, ler]) => ler(l)))]
    .map(linha => linha.map(celula).join(';'))
    .join('\r\n');
  const blob = new Blob([`﻿${conteudo}`], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${nomeArquivo}-${hojeISO()}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

// Busca de produto por código, código de barras, nome ou marca
export const semAcento = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const produtoCombina = (p, termo) => {
  const t = semAcento(termo).trim();
  if (!t) return true;
  return semAcento(`${p.codigo} ${p.codigo_barras || ''} ${p.nome} ${p.marca || ''} ${p.descricao || ''}`).includes(t);
};
