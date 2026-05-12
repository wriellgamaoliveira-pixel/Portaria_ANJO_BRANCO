# Sistema de Controle de Portaria (Somente Repositório / GitHub Pages)

Este projeto agora funciona **100% estático** no GitHub Pages, sem Vercel e sem backend serverless.

## Login
- Senha mestra fixa: `Anjo@2026`

## Como funciona
- Os registros ficam salvos no navegador (LocalStorage).
- Você pode **Exportar CSV** para backup.
- Você pode **Importar CSV** para restaurar dados.
- Fotos ficam embutidas em base64 dentro dos registros locais.

## Publicação
1. Suba os arquivos para o GitHub.
2. Ative GitHub Pages na branch `main` (pasta raiz).
3. Acesse `https://<usuario>.github.io/<repo>`.

## Observação
- Como não há backend, os dados não são compartilhados automaticamente entre dispositivos.
- Para migrar dados de um aparelho para outro, use Exportar/Importar CSV.


## Se aparecer mensagem antiga (cache do navegador)
- Faça **hard refresh** (`Ctrl+F5`) para garantir que o navegador carregou o app novo.
- A versão atual adiciona sufixo no título da aba: `2026-05-12-local-static`.
