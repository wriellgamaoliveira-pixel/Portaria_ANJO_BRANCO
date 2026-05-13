import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Octokit } from '@octokit/rest';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });
  try {
    const { tipo = 'saida', placa = '', foto_base64 = '' } = req.body as { tipo?: string; placa?: string; foto_base64?: string };
    if (!foto_base64) return res.status(400).json({ erro: 'foto_base64 obrigatório' });

    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const owner = process.env.GITHUB_OWNER as string;
    const repo = process.env.GITHUB_REPO as string;
    const branch = (process.env.GITHUB_BRANCH as string) || 'main';

    const clean = foto_base64.replace(/^data:image\/\w+;base64,/, '');
    const safePlaca = placa.replace(/[^A-Z0-9]/gi, '');
    const filename = `foto_${tipo}_${Date.now()}_${safePlaca}.jpg`;

    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: `fotos/${filename}`,
      message: `chore: upload ${filename}`,
      content: clean,
      branch
    });

    return res.status(200).json({ ok: true, filename });
  } catch (e) {
    return res.status(500).json({ erro: 'Falha no upload da foto', detalhe: (e as Error).message });
  }
}
