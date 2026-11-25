// backend/src/validators/consulta.js
// Validação de dados vindos da URL (parâmetros de rota e query string).
//
// Regra de segurança da API: valores do usuário NUNCA são interpolados no SQL.
// Eles sempre vão como parâmetro ("?" -> $1, $2...) e, antes disso, passam por
// aqui para chegar com o tipo e o formato esperados.
const AppError = require('../utils/AppError');

const TAMANHO_MAXIMO_BUSCA = 100;
const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

// Query string repetida (?a=1&a=2) ou com colchetes (?a[x]=1) chega como array/objeto:
// só aceitamos texto simples. Vazio = filtro não informado.
function textoDaQuery(valor) {
  if (valor === undefined) return undefined;
  if (typeof valor !== 'string') throw new AppError('Parâmetro de consulta inválido.');
  return valor.trim() || undefined;
}

// Inteiro positivo dentro do limite seguro do JS (ids do banco); senão null
function idValido(valor) {
  const texto = typeof valor === 'number' ? String(valor) : valor;
  if (typeof texto !== 'string' || !/^\d{1,15}$/.test(texto)) return null;
  const id = Number(texto);
  return id > 0 ? id : null;
}

function idDaQuery(valor, campo) {
  const texto = textoDaQuery(valor);
  if (texto === undefined) return undefined;
  const id = idValido(texto);
  if (!id) throw new AppError(`Parâmetro "${campo}" inválido.`);
  return id;
}

// Data no formato AAAA-MM-DD e que exista no calendário
function dataDaQuery(valor, campo) {
  const texto = textoDaQuery(valor);
  if (texto === undefined) return undefined;
  const data = new Date(`${texto}T00:00:00Z`);
  if (!DATA_ISO.test(texto) || Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== texto) {
    throw new AppError(`Parâmetro "${campo}" inválido (use AAAA-MM-DD).`);
  }
  return texto;
}

// Valor que precisa estar numa lista fechada (status, tipo de movimentação...)
function opcaoDaQuery(valor, opcoes, campo) {
  const texto = textoDaQuery(valor);
  if (texto === undefined) return undefined;
  if (!opcoes.includes(texto)) throw new AppError(`Parâmetro "${campo}" inválido.`);
  return texto;
}

/**
 * Padrão para ILIKE: "%termo%" com os curingas do usuário escapados.
 * Sem o escape, buscar "%" ou "_" casaria com qualquer registro.
 * (No PostgreSQL a barra invertida é o caractere de escape padrão do LIKE.)
 */
function padraoBusca(valor) {
  const texto = textoDaQuery(valor);
  if (texto === undefined) return null;
  const escapado = texto.slice(0, TAMANHO_MAXIMO_BUSCA).replace(/[\\%_]/g, c => `\\${c}`);
  return `%${escapado}%`;
}

module.exports = { textoDaQuery, idValido, idDaQuery, dataDaQuery, opcaoDaQuery, padraoBusca };
