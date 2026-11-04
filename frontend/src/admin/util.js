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
