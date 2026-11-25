// backend/src/database/queries/datas.js
// Trechos SQL fixos para datas. O servidor do Supabase roda em UTC;
// "hoje" e "mês" são contados no horário de Brasília.
//
// Arquivos em database/queries/ só contêm SQL escrito no próprio código:
// nunca coloque aqui (nem interpole nas consultas) valores vindos da requisição.

// Expressões que DIA_LOCAL aceita. É a única função que monta SQL a partir de um
// argumento, então ela recusa qualquer coisa fora desta lista.
const EXPRESSOES_DE_DATA = ['criado_em', 'atualizado_em', 'now()'];

function DIA_LOCAL(expressao) {
  if (!EXPRESSOES_DE_DATA.includes(expressao)) {
    throw new Error(`DIA_LOCAL: expressão não permitida "${expressao}".`);
  }
  return `(${expressao} AT TIME ZONE 'America/Sao_Paulo')::date`;
}

const HOJE = DIA_LOCAL('now()');
const INICIO_DO_MES = "(date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo')";

module.exports = { DIA_LOCAL, HOJE, INICIO_DO_MES };
