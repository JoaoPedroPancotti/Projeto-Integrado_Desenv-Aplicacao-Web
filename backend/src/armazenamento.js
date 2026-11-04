// backend/src/armazenamento.js
// Fotos dos produtos enviadas pelo painel.
// Com SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env, vão para o Supabase Storage
// (necessário na Vercel, que não guarda arquivos). Sem elas, ficam em backend/uploads.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const BUCKET = 'produtos';
const PASTA_LOCAL = path.join(__dirname, '..', 'uploads');

const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

// Cria o bucket público na primeira vez
async function prepararArmazenamento() {
  if (!supabase) return;
  const { data } = await supabase.storage.getBucket(BUCKET);
  if (data) return;
  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  });
  if (error) throw new Error(`não foi possível criar o bucket "${BUCKET}": ${error.message}`);
  console.log(`   + bucket "${BUCKET}" criado no Supabase Storage`);
}

// Recebe o arquivo do multer (em memória) e devolve o endereço público da foto
async function salvarFoto(arquivo, req) {
  const nome = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${path.extname(arquivo.originalname).toLowerCase()}`;

  if (supabase) {
    const { error } = await supabase.storage.from(BUCKET).upload(nome, arquivo.buffer, { contentType: arquivo.mimetype });
    if (error) throw new Error(`falha ao enviar a foto: ${error.message}`);
    return supabase.storage.from(BUCKET).getPublicUrl(nome).data.publicUrl;
  }

  fs.mkdirSync(PASTA_LOCAL, { recursive: true });
  fs.writeFileSync(path.join(PASTA_LOCAL, nome), arquivo.buffer);
  return `${req.protocol}://${req.get('host')}/uploads/${nome}`;
}

module.exports = { prepararArmazenamento, salvarFoto, PASTA_LOCAL };
