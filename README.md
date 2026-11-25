# Comercial Pancotti

Site de orçamentos (React + Vite) com painel administrativo e API em Node.js (Express).
O banco é PostgreSQL no **Supabase**; as fotos dos produtos ficam no **Amazon S3** (servidas pelo **CloudFront**); site e API ficam na **Vercel**.

## Estrutura do projeto

```
backend/                      API Express -> projeto Vercel da API (Root Directory: backend)
├── api/index.js              entrada da Vercel (vercel.json manda todas as rotas para cá)
├── sql/
│   ├── schema.sql            tabelas do banco (PostgreSQL); roda sozinho ao iniciar
│   ├── dados-iniciais.sql    catálogo inicial (só na primeira vez)
│   └── legado/               script antigo em MySQL, só para referência
├── src/
│   ├── app.js                monta o Express: middlewares, rotas (/api) e tratamento de erros
│   ├── server.js             servidor local: prepara o banco e sobe na porta 3006
│   ├── config/               carregamento do .env
│   ├── routes/               mapa de endpoints: index (/api), site (público) e admin (/api/admin)
│   ├── controllers/          um por domínio; só HTTP: lê a requisição, chama service/repository e responde
│   ├── services/             regras de negócio e transações (pedidos, estoque, relatórios,
│   │                         senha, token JWT, armazenamento de fotos)
│   ├── repositories/         ÚNICO lugar com SQL: uma camada por tabela/assunto (produtos, pedidos,
│   │                         movimentacoes, clientes, categorias, fornecedores, administradores, indicadores)
│   ├── validators/           validação de formulários e da URL (ids, datas, filtros, busca)
│   ├── database/             conexão (pool pg), helper de transação e trechos SQL fixos (queries/)
│   ├── middlewares/          login (auth), upload de imagem e tratamento central de erros
│   ├── constants/            status de pedido e códigos de erro do PostgreSQL
│   ├── utils/                AppError, asyncHandler e conversores de formulário
│   └── scripts/              migração do banco e cópia de fotos para o S3
└── .env.example              variáveis de ambiente (copie para .env)

frontend/                     site + painel (/admin) -> projeto Vercel do site (Root Directory: frontend)
├── index.html
├── public/                   arquivos servidos por URL fixa, sem processamento do Vite
│   ├── favicon.png
│   ├── images/               logotipos e fachada da loja (/images/...)
│   └── products/             fotos do catálogo inicial (/products/..., gravadas no banco)
├── src/
│   ├── main.jsx, App.jsx     entrada, roteador e animação de abertura
│   ├── routes/               mapa de rotas (AppRoutes.jsx)
│   ├── pages/                páginas do site (Home, Vitrine, Checkout, Login)
│   │   └── admin/            telas do painel administrativo
│   ├── components/
│   │   ├── layout/           SiteLayout, AdminLayout e Cabecalho
│   │   ├── ui/               componentes genéricos (Loader)
│   │   ├── catalogo/         peças do catálogo (seletor de quantidade, lista de orçamento)
│   │   └── admin/            peças e modais do painel (importe de components/admin)
│   ├── services/
│   │   ├── http.js           cliente axios (URL da API, token, sessão expirada)
│   │   ├── api/              um módulo por domínio: catalogo.js e admin/* (pedidosApi, produtosApi...)
│   │   ├── sessao.js         login do painel salvo no navegador
│   │   └── listaOrcamento.js lista de materiais do cliente salva no navegador
│   ├── hooks/                hooks reutilizáveis (useRolarParaHash)
│   ├── data/                 conteúdo fixo: loja (contato), departamentos e textos da home
│   ├── constants/            listas fixas: status de pedido, tipos de movimento, unidades
│   ├── utils/                funções puras: formatação, números, texto, CSV, WhatsApp, erros
│   ├── styles/               todo o CSS (global, admin, pages/, components/)
│   └── assets/               imagens importadas pelo código
└── .env.example
```

Convenções:
- Backend em camadas: `routes` → `controllers` (HTTP) → `services` (regras e transações) → `repositories` (SQL).
  Controllers e services não escrevem SQL; funções de repository que participam de transação recebem
  a conexão como último argumento (`repo.criar(dados, conexao)`).
- As páginas nunca chamam o axios direto: usam `services/api/*`, que devolvem o corpo da resposta.
- Erros da API sempre vêm como `{ erro: 'mensagem' }` (backend: `middlewares/erros.js`; frontend: `utils/erros.js`).
  Em produção, erros 500 respondem uma mensagem genérica; o detalhe fica só no log do servidor.
- SQL injection: valores da requisição **nunca** são interpolados no texto do SQL. Vão sempre como
  parâmetro (`db.query('... WHERE id = ?', [id])`), validados antes em `validators/consulta.js`
  (ids inteiros, datas AAAA-MM-DD, listas fechadas, busca com curingas `%`/`_` escapados).
  `database/queries/` só guarda trechos SQL fixos do código, e `database/conexao.js` recusa
  parâmetros em formato inesperado ou em quantidade diferente dos `?`.
- Arquivos estáticos: o que é importado no código (`import`) fica em `src/` e passa pelo Vite; o que é chamado por caminho absoluto (`/images/...`) fica em `public/`.

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
