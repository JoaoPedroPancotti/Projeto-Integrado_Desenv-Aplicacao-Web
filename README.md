# Comercial Pancotti

Site de orçamentos (React + Vite) com painel administrativo e API em Node.js (Express).
O banco é PostgreSQL no **Supabase**; site e API ficam na **Vercel**.

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

## Supabase (banco e fotos)

1. Crie um projeto em https://supabase.com (região **South America (São Paulo)**). Guarde a senha do banco.
2. **Project Settings > Database > Connection string**, aba **Transaction pooler** (porta 6543): copie para `DATABASE_URL`, trocando `[YOUR-PASSWORD]` pela senha.
3. **Project Settings > API**: copie a **Project URL** para `SUPABASE_URL` e a chave **service_role** para `SUPABASE_SERVICE_ROLE_KEY`. Essa chave é secreta: só no `.env` e na Vercel, nunca no frontend.
4. Rode `cd backend && npm run migrar`. Ele cria as tabelas, o catálogo inicial, o usuário do painel e o bucket `produtos` (fotos). Também dá para colar `backend/sql/schema.sql` no **SQL Editor** do Supabase.

## Vercel (publicar)

São dois projetos na Vercel, ambos importando este repositório do GitHub:

**API** (Root Directory: `backend`)
- Environment Variables: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`.
- Depois do deploy, teste `https://SEU-PROJETO-API.vercel.app/api` (deve responder `{"status":"ok"}`).

**Site** (Root Directory: `frontend`, framework Vite)
- Environment Variable: `VITE_API_URL=https://SEU-PROJETO-API.vercel.app/api`.
- Faça um novo deploy sempre que mudar essa variável (ela entra no build).
