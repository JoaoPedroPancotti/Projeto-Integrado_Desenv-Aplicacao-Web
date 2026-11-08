// backend/src/migrarFotosS3.js
// Copia para o S3 as fotos dos produtos que estão no Supabase Storage e troca o
// endereço no banco. Pode rodar quantas vezes quiser: só mexe no que ainda está no Supabase.
//
//   npm run fotos:s3                      copia e atualiza o banco
//   npm run fotos:s3 -- --limpar-supabase  depois da cópia, apaga do Supabase as fotos
//                                         que nenhum produto usa mais (libera o espaço)
require('dotenv').config();
const path = require('path');
const db = require('./db');
const { enviarParaS3, supabase, s3, BUCKET_SUPABASE } = require('./armazenamento');

const LIMPAR = process.argv.includes('--limpar-supabase');

async function copiarFotos() {
  const prefixo = `${process.env.SUPABASE_URL.replace(/\/+$/, '')}/storage/v1/object/public/${BUCKET_SUPABASE}/`;
  const [produtos] = await db.query('SELECT id, nome, imagem_url FROM produtos WHERE imagem_url LIKE ?', [`${prefixo}%`]);
  console.log(`${produtos.length} foto(s) no Supabase para copiar.`);

  let falhas = 0;
  for (const produto of produtos) {
    try {
      const resposta = await fetch(produto.imagem_url);
      if (!resposta.ok) throw new Error(`download respondeu ${resposta.status}`);
      const conteudo = Buffer.from(await resposta.arrayBuffer());
      const nome = path.basename(decodeURIComponent(new URL(produto.imagem_url).pathname));
      const novaUrl = await enviarParaS3(nome, conteudo, resposta.headers.get('content-type') || 'image/jpeg');
      await db.query('UPDATE produtos SET imagem_url = ? WHERE id = ?', [novaUrl, produto.id]);
      console.log(`   ok  #${produto.id} ${produto.nome}`);
    } catch (erro) {
      falhas++;
      console.error(`   ERRO #${produto.id} ${produto.nome}: ${erro.message}`);
    }
  }
  return falhas;
}

// Apaga do bucket do Supabase todo arquivo que nenhum produto usa mais
async function limparSupabase() {
  const arquivos = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.storage.from(BUCKET_SUPABASE).list('', { limit: 1000, offset });
    if (error) throw new Error(`não foi possível listar o bucket: ${error.message}`);
    arquivos.push(...data.filter(a => a.id)); // sem id = pasta
    if (data.length < 1000) break;
  }

  // Fotos ainda apontando para o Supabase (as copiadas para o S3 têm o mesmo nome, mas outro endereço)
  const [emUso] = await db.query('SELECT imagem_url FROM produtos WHERE imagem_url LIKE ?', ['%/storage/v1/object/public/%']);
  const usados = new Set(emUso.map(p => path.basename(decodeURIComponent(new URL(p.imagem_url).pathname))));
  const apagar = arquivos.map(a => a.name).filter(nome => !usados.has(nome));

  console.log(`${arquivos.length} arquivo(s) no Supabase, ${apagar.length} sem uso.`);
  for (let i = 0; i < apagar.length; i += 100) {
    const { error } = await supabase.storage.from(BUCKET_SUPABASE).remove(apagar.slice(i, i + 100));
    if (error) throw new Error(`falha ao apagar: ${error.message}`);
  }
  if (apagar.length) console.log(`   ${apagar.length} arquivo(s) apagado(s) do Supabase.`);
}

async function main() {
  if (!s3) throw new Error('configure S3_BUCKET (e as demais variáveis S3_*) no .env');
  if (!supabase) throw new Error('configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env para ler as fotos antigas');

  const falhas = await copiarFotos();
  if (!LIMPAR) return;
  if (falhas) throw new Error(`${falhas} foto(s) não foram copiadas; nada foi apagado do Supabase. Rode de novo.`);
  await limparSupabase();
}

main()
  .then(() => { console.log('Concluído.'); process.exit(0); })
  .catch(erro => { console.error('Erro:', erro.message); process.exit(1); });
