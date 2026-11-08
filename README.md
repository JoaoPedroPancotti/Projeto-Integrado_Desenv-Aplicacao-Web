# Comercial Pancotti

Site de orçamentos (React + Vite) com painel administrativo e API em Node.js (Express).
O banco é PostgreSQL no **Supabase**; as fotos dos produtos ficam no **Amazon S3** (servidas pelo **CloudFront**); site e API ficam na **Vercel**.

```
frontend/   site + painel (/admin)            -> projeto Vercel do site
backend/    API Express                       -> projeto Vercel da API
backend/sql/schema.sql   tabelas do banco (PostgreSQL)
```

## Rodar na própria máquina

O banco é o do Supabase, então não precisa instalar banco local.

1. Copie `backend/.env.example` para `backend/.env` e preencha (veja "Supabase" abaixo).
2. Abra dois terminais:

```bash
# terminal do back
cd backend
npm install
npm run dev        # cria as tabelas sozinho na primeira vez
```

```bash
# terminal do front
cd frontend
npm install
npm run dev
```

Painel: http://localhost:5173/login (primeiro acesso: `admin@pancotti.com` / `123456`, troque a senha em **Usuários**).

## Controle de estoque (painel)

- **Produtos**: código interno (gerado como `P00001` se ficar em branco), código de barras, marca, custo médio, preço, margem, estoque mínimo/máximo, localização e fornecedor. A ficha do produto mostra o kardex (todas as movimentações com saldo antes/depois).
- **Saldos**: posição de cada produto (estoque, reservado, disponível, valor), com filtros por situação e exportação CSV.
- **Entrada de mercadoria**: lança a nota do fornecedor inteira; aceita leitor de código de barras. Recalcula o custo médio e pode atualizar o preço de venda.
- **Movimentações**: entrada, saída, perda, devolução e ajuste avulsos; histórico com filtros por tipo, período e documento.
- **Inventário**: digita o que foi contado e o sistema ajusta só a diferença. A contagem fica salva no navegador até ser aplicada; dá para imprimir a folha de contagem.
- **Relatórios**: reposição por fornecedor (com pedido pronto para o WhatsApp), curva ABC, produtos parados, valor por categoria e lucro bruto do período.
- **Pedidos**: pedido *Aprovado* reserva o estoque; *Concluído* dá baixa automática. Se o pedido sair de *Concluído* ou for excluído, o estoque é estornado.

O saldo só muda por movimentação, nunca editando o produto. Na primeira vez que a migração roda, todos os produtos começam com saldo zero e os pedidos já concluídos ficam fora do estoque: comece com um **Inventário**.

## Supabase (banco e fotos)

1. Crie um projeto em https://supabase.com (região **South America (São Paulo)**). Guarde a senha do banco.
2. **Project Settings > Database > Connection string**, aba **Transaction pooler** (porta 6543): copie para `DATABASE_URL`, trocando `[YOUR-PASSWORD]` pela senha.
3. **Project Settings > API**: copie a **Project URL** para `SUPABASE_URL` e a chave **service_role** para `SUPABASE_SERVICE_ROLE_KEY`. Essa chave é secreta: só no `.env` e na Vercel, nunca no frontend.
4. Rode `cd backend && npm run migrar`. Ele cria as tabelas, o catálogo inicial, o usuário do painel e o bucket `produtos` (fotos). Também dá para colar `backend/sql/schema.sql` no **SQL Editor** do Supabase.

## AWS (fotos no S3 + CloudFront)

Com `S3_BUCKET` preenchido, as fotos enviadas pelo painel vão para o S3. O bucket fica **privado** e quem entrega as fotos ao público é o CloudFront. Use a região **São Paulo (sa-east-1)** em tudo.

1. **S3 > Create bucket**
   - Nome único, ex.: `pancotti-fotos-2026`. Região `sa-east-1`.
   - Deixe **Block all public access** marcado.
2. **CloudFront > Create distribution**
   - Se pedir um plano de preço, escolha o gratuito / pay-as-you-go.
   - Origin: o bucket criado. Origin access: **Origin access control (recommended)**, crie um OAC.
   - Não ative o WAF (é pago).
   - Ao terminar, se aparecer **Copy policy**, cole a política em **S3 > bucket > Permissions > Bucket policy**.
   - Copie o **Distribution domain name** (`dxxxx.cloudfront.net`) para `CLOUDFRONT_URL=https://dxxxx.cloudfront.net`.
3. **IAM > Users > Create user** (ex.: `pancotti-api`, sem acesso ao console)
   - **Add permissions > Create inline policy > JSON** (troque `SEU-BUCKET`):
     ```json
     {
       "Version": "2012-10-17",
       "Statement": [
         { "Effect": "Allow", "Action": "s3:PutObject", "Resource": "arn:aws:s3:::SEU-BUCKET/produtos/*" },
         { "Effect": "Allow", "Action": "s3:ListBucket", "Resource": "arn:aws:s3:::SEU-BUCKET" }
       ]
     }
     ```
   - **Security credentials > Create access key** (Application running outside AWS). Copie para `S3_ACCESS_KEY_ID` e `S3_SECRET_ACCESS_KEY`. A chave secreta só aparece uma vez.
4. Preencha as variáveis `S3_*` e `CLOUDFRONT_URL` no `backend/.env` e na Vercel (projeto da API), e faça um novo deploy.
5. Mover as fotos antigas do Supabase:
   ```bash
   cd backend
   npm run fotos:s3                        # copia para o S3 e atualiza o banco
   npm run fotos:s3 -- --limpar-supabase   # depois de conferir o site: apaga do Supabase o que não é mais usado
   ```

Custo: centavos por mês. Crie um alerta em **Billing > Budgets** para não ser surpreendido.

## Vercel (publicar)

São dois projetos na Vercel, ambos importando este repositório do GitHub:

**API** (Root Directory: `backend`)
- Environment Variables: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `CLOUDFRONT_URL`.
- Depois do deploy, teste `https://SEU-PROJETO-API.vercel.app/api` (deve responder `{"status":"ok"}`).

**Site** (Root Directory: `frontend`, framework Vite)
- Environment Variable: `VITE_API_URL=https://SEU-PROJETO-API.vercel.app/api`.
- Faça um novo deploy sempre que mudar essa variável (ela entra no build).
