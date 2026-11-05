// backend/src/armazenamento.js
// Fotos dos produtos enviadas pelo painel. O destino depende do .env, nesta ordem:
//   1. Amazon S3 (servido pelo CloudFront): S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, CLOUDFRONT_URL
//   2. Supabase Storage: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
//   3. Pasta backend/uploads (só serve para rodar na própria máquina; a Vercel não guarda arquivos)
// Os nomes das variáveis não começam com AWS_ porque a Vercel reserva esse prefixo.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { S3Client, PutObjectCommand, HeadBucketCommand } = require('@aws-sdk/client-s3');
const { createClient } = require('@supabase/supabase-js');

const BUCKET_SUPABASE = 'produtos';
const PASTA_S3 = 'produtos';
const PASTA_LOCAL = path.join(__dirname, '..', 'uploads');

const s3 = process.env.S3_BUCKET
  ? new S3Client({
      region: process.env.S3_REGION || 'sa-east-1',
      credentials: process.env.S3_ACCESS_KEY_ID
        ? { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY }
        : undefined, // sem chaves no .env, usa as credenciais padrão da AWS (ex.: perfil do aws cli)
    })
  : null;

const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

// Endereço público de um arquivo do S3: pelo CloudFront quando configurado, senão direto do bucket
function urlPublicaS3(chave) {
  const base = process.env.CLOUDFRONT_URL
    ? process.env.CLOUDFRONT_URL.replace(/\/+$/, '')
    : `https://${process.env.S3_BUCKET}.s3.${process.env.S3_REGION || 'sa-east-1'}.amazonaws.com`;
  return `${base}/${chave}`;
}

// Envia um arquivo ao S3 e devolve o endereço público
async function enviarParaS3(nome, conteudo, contentType) {
  const chave = `${PASTA_S3}/${nome}`;
  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: chave,
    Body: conteudo,
    ContentType: contentType,
    // o nome de cada foto é único, então o navegador e o CloudFront podem guardar para sempre
    CacheControl: 'public, max-age=31536000, immutable',
  }));
  return urlPublicaS3(chave);
}

// Confere o destino das fotos na inicialização (S3) ou cria o bucket na primeira vez (Supabase)
async function prepararArmazenamento() {
  if (s3) {
    try {
      await s3.send(new HeadBucketCommand({ Bucket: process.env.S3_BUCKET }));
    } catch (erro) {
      throw new Error(`não foi possível acessar o bucket S3 "${process.env.S3_BUCKET}": ${erro.name}`);
    }
    if (!process.env.CLOUDFRONT_URL) console.warn('   ! CLOUDFRONT_URL não definida: as fotos usarão o endereço direto do S3, que só abre se o bucket for público');
    return;
  }

  if (!supabase) return;
  const { data } = await supabase.storage.getBucket(BUCKET_SUPABASE);
  if (data) return;
  const { error } = await supabase.storage.createBucket(BUCKET_SUPABASE, {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  });
  if (error) throw new Error(`não foi possível criar o bucket "${BUCKET_SUPABASE}": ${error.message}`);
  console.log(`   + bucket "${BUCKET_SUPABASE}" criado no Supabase Storage`);
}

// Recebe o arquivo do multer (em memória) e devolve o endereço público da foto
async function salvarFoto(arquivo, req) {
  const nome = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${path.extname(arquivo.originalname).toLowerCase()}`;

  if (s3) {
    try {
      return await enviarParaS3(nome, arquivo.buffer, arquivo.mimetype);
    } catch (erro) {
      throw new Error(`falha ao enviar a foto para o S3: ${erro.message}`);
    }
  }

  if (supabase) {
    const { error } = await supabase.storage.from(BUCKET_SUPABASE).upload(nome, arquivo.buffer, { contentType: arquivo.mimetype });
    if (error) throw new Error(`falha ao enviar a foto: ${error.message}`);
    return supabase.storage.from(BUCKET_SUPABASE).getPublicUrl(nome).data.publicUrl;
  }

  fs.mkdirSync(PASTA_LOCAL, { recursive: true });
  fs.writeFileSync(path.join(PASTA_LOCAL, nome), arquivo.buffer);
  return `${req.protocol}://${req.get('host')}/uploads/${nome}`;
}

module.exports = { prepararArmazenamento, salvarFoto, enviarParaS3, supabase, s3, BUCKET_SUPABASE, PASTA_LOCAL };
