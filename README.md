# Sistema de Controle de Portaria (Transportadora)

Aplicação web com frontend estático para GitHub Pages e backend serverless em Vercel Functions.

## Funcionalidades
- Login com senha única + JWT.
- Dashboard com KPIs de registros e quilometragem.
- Portaria com registros de entrada/saída e foto do hodômetro.
- Histórico com filtros, busca e visualização de foto.
- Exportação de registros em TXT/CSV (`;`).

## Variáveis de ambiente (Vercel)
Veja `.env.example`.

## Execução local
```bash
npm install
npm run dev
```

## Deploy
1. Suba o repositório para o GitHub.
2. Conecte o repositório à Vercel e configure `SENHA_MESTRA`, `JWT_SECRET`, `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO` e opcionalmente `GITHUB_BRANCH`.
3. Ative o GitHub Pages na branch `main`, pasta raiz.
4. Acesse em `https://<seu-usuario>.github.io/<repo>`.
