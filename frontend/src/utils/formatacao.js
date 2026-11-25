// frontend/src/utils/formatacao.js
// Exibição de valores no padrão brasileiro.
import { NOMES_UNIDADES } from '../constants/produtos';

// Unidade de venda por extenso ("sc" -> "saco"); desconhecida volta como veio
export const nomeUnidade = unidade => (unidade ? NOMES_UNIDADES[unidade.toLowerCase()] ?? unidade : null);

export const dinheiro = valor => (valor === null || valor === undefined || valor === ''
  ? '—'
  : Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));

export const quantidade = valor => Number(valor).toLocaleString('pt-BR', { maximumFractionDigits: 3 });

export const percentual = v => (v === null || v === undefined || Number.isNaN(v)
  ? '—'
  : `${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`);

export const dataHora = data => new Date(data).toLocaleString('pt-BR', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

export const dataCurta = data => new Date(data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

// "agora", "há 5 min", "há 3 h", "há 2 dias" ou a data
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
