// backend/src/server.js
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Configuração da ligação com o MySQL
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '12345',
  database: process.env.DB_NAME || 'comercial_pancotti'
});

db.connect((err) => {
  if (err) {
    console.error('ERRO AO LIGAR AO MYSQL:', err.message);
    return;
  }
  console.log('SUCESSO: Ligado ao MySQL da Comercial Pancotti!');
});

// Endpoint para listar os produtos
app.get('/api/produtos', (req, res) => {
  db.query('SELECT * FROM produtos', (err, results) => {
    if (err) {
      console.error('Erro na query:', err.message);
      return res.status(500).json({ erro: err.message });
    }
    res.json(results);
  });
});

// Endpoint para guardar o orçamento e respetivos itens
app.post('/api/orcamentos', (req, res) => {
  const { cliente, itens, observacoes } = req.body;

  if (!cliente || !cliente.nome || !cliente.telefone || !itens || itens.length === 0) {
    return res.status(400).json({ erro: 'Dados incompletos. Nome, telefone e itens são obrigatórios.' });
  }

  db.beginTransaction((err) => {
    if (err) {
      return res.status(500).json({ erro: 'Erro ao iniciar transação.' });
    }

    const queryCliente = 'INSERT INTO clientes (nome, email, telefone) VALUES (?, ?, ?)';
    db.query(queryCliente, [cliente.nome, cliente.email, cliente.telefone], (err, resultCliente) => {
      if (err) {
        return db.rollback(() => res.status(500).json({ erro: 'Erro ao registar cliente.' }));
      }

      const clienteId = resultCliente.insertId;
      const queryOrcamento = 'INSERT INTO orcamentos (cliente_id, observacoes, status) VALUES (?, ?, "Pendente")';
      
      db.query(queryOrcamento, [clienteId, observacoes || ''], (err, resultOrcamento) => {
        if (err) {
          return db.rollback(() => res.status(500).json({ erro: 'Erro ao criar orçamento.' }));
        }

        const orcamentoId = resultOrcamento.insertId;
        const queryItens = 'INSERT INTO itens_orcamento (orcamento_id, produto_id, quantidade) VALUES ?';
        const itensValues = itens.map(item => [orcamentoId, item.produto_id, item.quantidade]);

        db.query(queryItens, [itensValues], (err) => {
          if (err) {
            return db.rollback(() => res.status(500).json({ erro: 'Erro ao guardar os itens do orçamento.' }));
          }

          db.commit((err) => {
            if (err) {
              return db.rollback(() => res.status(500).json({ erro: 'Erro ao finalizar transação.' }));
            }

            return res.status(201).json({
              mensagem: 'Orçamento solicitado com sucesso!',
              protocolo: orcamentoId
            });
          });
        });
      });
    });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor a correr na porta ${PORT}`);
});