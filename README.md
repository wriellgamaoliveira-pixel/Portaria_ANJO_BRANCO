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

> Senha padrão de fallback: `Anjo@2026` (usada somente se `SENHA_MESTRA` não estiver configurada).

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

## Importante sobre login no GitHub Pages
- O frontend no GitHub Pages **não executa** funções `/api` por conta própria.
- Defina `localStorage.api_base_url` apontando para sua Vercel (ex.: `https://seu-projeto.vercel.app`) para o login e registro funcionarem.
- A URL do CSV agora é montada automaticamente no GitHub Pages (não pede mais prompt).

## Onde alterar a URL da API (sem console)
No arquivo `app.js`, no bloco `APP_CONFIG` no topo do arquivo:

```js
const APP_CONFIG = {
  API_BASE_URL: "https://SEU-PROJETO.vercel.app",
  CSV_RAW_URL: ""
};
```

- `API_BASE_URL`: URL da Vercel para o login/registro funcionar no GitHub Pages.
- `CSV_RAW_URL`: opcional, só preencha se quiser fixar manualmente a URL do CSV.
