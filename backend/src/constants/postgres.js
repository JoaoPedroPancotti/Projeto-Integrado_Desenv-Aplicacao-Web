// backend/src/constants/postgres.js
// Códigos de erro do PostgreSQL tratados pela API
module.exports = {
  ERRO_EM_USO: '23503',    // chave estrangeira: o registro é referenciado por outro
  ERRO_DUPLICADO: '23505', // valor único repetido
};
