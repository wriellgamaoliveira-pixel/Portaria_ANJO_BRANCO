import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Octokit } from '@octokit/rest';

const PATHS: Record<string, string> = {
  motoristas: 'dados/motoristas.csv',
  ajudantes: 'dados/ajudantes.csv',
  usuarios: 'dados/porteiros.csv',
  veiculos: 'dados/veiculos.csv',
  rotas: 'dados/rotas.csv',
  log_cadastros: 'dados/log_cadastros.csv'
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });
  try {
    const { modulo, csv } = req.body as { modulo?: string; csv?: string };
    if (!modulo || !csv) return res.status(400).json({ erro: 'modulo e csv são obrigatórios' });
    const path = PATHS[modulo];
    if (!path) return res.status(400).json({ erro: 'Módulo inválido' });

    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const owner = process.env.GITHUB_OWNER as string;
    const repo = process.env.GITHUB_REPO as string;
    const branch = (process.env.GITHUB_BRANCH as string) || 'main';

    let sha: string | undefined;
    try {
      const old = await octokit.repos.getContent({ owner, repo, path, ref: branch });
      if ('sha' in old.data) sha = old.data.sha;
    } catch {}

    await octokit.repos.createOrUpdateFileContents({
      owner, repo, path, branch,
      message: `chore: atualizar cadastro ${modulo}`,
      content: Buffer.from(csv, 'utf-8').toString('base64'),
      ...(sha ? { sha } : {})
    });

    return res.status(200).json({ ok: true, path });
  } catch (e) {
    return res.status(500).json({ erro: 'Falha ao salvar cadastro', detalhe: (e as Error).message });
  }
}
