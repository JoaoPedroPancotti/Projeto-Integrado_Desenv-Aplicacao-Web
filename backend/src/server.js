// backend/src/server.js
// Localmente: "npm run dev" sobe o servidor na porta 3006.
// Na Vercel: api/index.js importa este arquivo e usa o "app" exportado no final.
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const db = require('./db');
const prepararBanco = require('./migrar');
const rotasAdmin = require('./rotasAdmin');
const { exigirLogin } = require('./auth');
const { PASTA_LOCAL } = require('./armazenamento');
const app = express();

app.use(cors());
app.use(express.json());

// Fotos enviadas pelo painel quando o Supabase Storage não está configurado
app.use('/uploads', express.static(PASTA_LOCAL));

app.get('/api', (req, res) => res.json({ status: 'ok', servico: 'API Comercial Pancotti' }));

// Painel administrativo
app.use('/api/admin', rotasAdmin);

// ==========================================
// ROTAS DE PRODUTOS (CRUD)
// ==========================================

// [C] CREATE - Criar produto
app.post('/api/produtos', exigirLogin, async (req, res) => {
  const { categoria_id, nome, descricao, imagem_url } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO produtos (categoria_id, nome, descricao, imagem_url) VALUES (?, ?, ?, ?) RETURNING id',
      [categoria_id, nome, descricao, imagem_url]
    );
    return res.status(201).json({ id: result.insertId, message: 'Produto criado com sucesso!' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

// Só o que o site precisa: custo, saldo, fornecedor e localização ficam restritos ao painel
const CAMPOS_PUBLICOS = 'id, categoria_id, codigo, nome, marca, descricao, preco, unidade, imagem_url, ativo';

// [R] READ - Listar os produtos ativos (os desativados no painel somem do site)
app.get('/api/produtos', async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT ${CAMPOS_PUBLICOS} FROM produtos WHERE ativo ORDER BY nome`);
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
    const [rows] = await db.query(`SELECT ${CAMPOS_PUBLICOS} FROM produtos WHERE id = ? AND ativo`, [id]);
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
app.put('/api/produtos/:id', exigirLogin, async (req, res) => {
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
app.delete('/api/produtos/:id', exigirLogin, async (req, res) => {
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
  if (!cliente?.nome?.trim() || !cliente?.telefone?.trim()) {
    return res.status(400).json({ erro: 'Informe nome e telefone.' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Reaproveita o cliente que já pediu com o mesmo telefone, senão cadastra
    const digitos = cliente.telefone.replace(/\D/g, '');
    const [existentes] = await connection.query(
      "SELECT id FROM clientes WHERE regexp_replace(telefone, '[^0-9]', '', 'g') = ? ORDER BY id DESC LIMIT 1",
      [digitos]
    );
    let clienteId;
    if (existentes.length) {
      clienteId = existentes[0].id;
      await connection.query(
        'UPDATE clientes SET nome = ?, email = COALESCE(NULLIF(?, \'\'), email), telefone = ? WHERE id = ?',
        [cliente.nome.trim(), cliente.email || '', cliente.telefone.trim(), clienteId]
      );
    } else {
      const [clienteResult] = await connection.query(
        'INSERT INTO clientes (nome, email, telefone) VALUES (?, ?, ?) RETURNING id',
        [cliente.nome.trim(), cliente.email || '', cliente.telefone.trim()]
      );
      clienteId = clienteResult.insertId;
    }

    // 2. Insere a capa do orçamento
    const [orcamentoResult] = await connection.query(
      'INSERT INTO orcamentos (cliente_id, observacoes) VALUES (?, ?) RETURNING id',
      [clienteId, observacoes || '']
    );
    const orcamentoId = orcamentoResult.insertId;

    // 3. Insere os itens já com o preço de referência do produto (a loja pode ajustar no painel)
    for (const item of itens) {
      await connection.query(
        `INSERT INTO itens_orcamento (orcamento_id, produto_id, quantidade, preco_unitario)
         SELECT ?::int, id, ?::numeric, preco FROM produtos WHERE id = ?`,
        [orcamentoId, item.quantidade || 1, item.produto_id]
      );
    }

    await connection.query(
      "INSERT INTO orcamento_historico (orcamento_id, status, descricao) VALUES (?, 'Pendente', 'Pedido recebido pelo site')",
      [orcamentoId]
    );

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

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 3006;
  prepararBanco()
    .catch(erro => console.error('Erro ao preparar o banco:', erro.message))
    .finally(() => {
      app.listen(PORT, () => {
        console.log(`Servidor rodando na porta ${PORT}`);
      });
    });
}