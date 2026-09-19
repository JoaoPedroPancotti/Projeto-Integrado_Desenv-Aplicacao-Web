// backend/src/server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const db = require('./db');
const app = express();

app.use(cors());
app.use(express.json());

// [C] CREATE - Criar um novo produto (Corrigido para a estrutura real do MySQL)
app.post('/api/produtos', async (req, res) => {
  const { categoria_id, nome, descricao, imagem_url } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO produtos (categoria_id, nome, descricao, imagem_url) VALUES (?, ?, ?, ?)',
      [categoria_id, nome, descricao, imagem_url]
    );
    return res.status(201).json({ id: result.insertId, message: 'Produto criado com sucesso!' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

// [R] READ - Listar todos os produtos
app.get('/api/produtos', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM produtos');
    return res.status(200).json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

// [R] READ - Buscar produto por ID
app.get('/api/produtos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query('SELECT * FROM produtos WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Produto não encontrado' });
    }
    return res.status(200).json(rows[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

// [U] UPDATE - Atualizar um produto
app.put('/api/produtos/:id', async (req, res) => {
  const { id } = req.params;
  const { categoria_id, nome, descricao, imagem_url } = req.body;
  try {
    const [result] = await db.query(
      'UPDATE produtos SET categoria_id = ?, nome = ?, descricao = ?, imagem_url = ? WHERE id = ?',
      [categoria_id, nome, descricao, imagem_url, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Produto não encontrado' });
    }
    return res.status(200).json({ message: 'Produto atualizado com sucesso!' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

// [D] DELETE - Remover um produto
app.delete('/api/produtos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query('DELETE FROM produtos WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Produto não encontrado' });
    }
    return res.status(200).json({ message: 'Produto eliminado com sucesso!' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});