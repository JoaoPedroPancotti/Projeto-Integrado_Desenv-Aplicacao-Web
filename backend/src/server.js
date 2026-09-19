// backend/src/server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const db = require('./db');
const app = express();

app.use(cors());
app.use(express.json());

// ==========================================
// ROTAS DE PRODUTOS (CRUD)
// ==========================================

// [C] CREATE - Criar produto
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

// [U] UPDATE - Atualizar produto
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

// [D] DELETE - Remover produto
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

// ==========================================
// ROTA DE ORÇAMENTOS (INTEGRAÇÃO COM O CHECKOUT)
// ==========================================

app.post('/api/orcamentos', async (req, res) => {
  const { cliente, itens, observacoes } = req.body;

  if (!itens || itens.length === 0) {
    return res.status(400).json({ erro: 'O carrinho está vazio.' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Regista/Insere o cliente ou cria registo básico
    const [clienteResult] = await connection.query(
      'INSERT INTO clientes (nome, email, telefone) VALUES (?, ?, ?)',
      [cliente.nome, cliente.email || '', cliente.telefone]
    );
    const clienteId = clienteResult.insertId;

    // 2. Insere a capa do orçamento
    const [orcamentoResult] = await connection.query(
      'INSERT INTO orcamentos (cliente_id, observacoes, data_criacao) VALUES (?, ?, NOW())',
      [clienteId, observacoes || '']
    );
    const orcamentoId = orcamentoResult.insertId;

    // 3. Insere os itens na tabela itens_orcamento
    for (const item of itens) {
      await connection.query(
        'INSERT INTO itens_orcamento (orcamento_id, produto_id, quantidade) VALUES (?, ?, ?)',
        [orcamentoId, item.produto_id, item.quantidade || 1]
      );
    }

    await connection.commit();
    connection.release();

    return res.status(201).json({
      mensagem: 'Orçamento gravado com sucesso!',
      protocolo: orcamentoId
    });
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error('Erro ao salvar orçamento:', error);
    return res.status(500).json({ erro: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});