// backend/src/app.js
// Monta a aplicação Express: middlewares globais, rotas e tratamento de erros.
// Usado pelo servidor local (server.js) e pela Vercel (api/index.js).
require('./config/env');
const express = require('express');
const cors = require('cors');
const rotas = require('./routes');
const { PASTA_LOCAL } = require('./services/armazenamento');
const { rotaNaoEncontrada, tratarErros } = require('./middlewares/erros');

const app = express();

app.use(cors());
app.use(express.json());

// Fotos enviadas pelo painel quando nem S3 nem Supabase Storage estão configurados
app.use('/uploads', express.static(PASTA_LOCAL));

app.use('/api', rotas);

app.use(rotaNaoEncontrada);
app.use(tratarErros);

module.exports = app;
