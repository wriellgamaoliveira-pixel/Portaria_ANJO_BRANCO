import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Octokit } from '@octokit/rest';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });
  try {
    const { csv } = req.body as { csv?: string };
    if (!csv) return res.status(400).json({ erro: 'csv é obrigatório' });

    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const owner = process.env.GITHUB_OWNER as string;
    const repo = process.env.GITHUB_REPO as string;
    const branch = (process.env.GITHUB_BRANCH as string) || 'main';
    const path = 'dados/registros.csv';

    let sha: string | undefined;
    try {
      const old = await octokit.repos.getContent({ owner, repo, path, ref: branch });
      if ('sha' in old.data) sha = old.data.sha;
    } catch {}

    await octokit.repos.createOrUpdateFileContents({
      owner, repo, path, branch,
      message: 'chore: sync registros portaria',
      content: Buffer.from(csv, 'utf-8').toString('base64'),
      ...(sha ? { sha } : {})
    });

    return res.status(200).json({ ok: true, path });
  } catch (e) {
    return res.status(500).json({ erro: 'Falha no sync de registros', detalhe: (e as Error).message });
  }
}
