import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Octokit } from '@octokit/rest';

const PATHS: Record<string, string> = {
  motoristas: 'dados/motoristas.csv',
  ajudantes: 'dados/ajudantes.csv',
  porteiros: 'dados/porteiros.csv',
  veiculos: 'dados/veiculos.csv',
  rotas: 'dados/rotas.csv',
  registros: 'dados/portaria_registros.csv'
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ erro: 'Método não permitido' });
  try {
    const modulo = String(req.query.modulo || 'registros');
    const path = PATHS[modulo] || PATHS.registros;
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const owner = process.env.GITHUB_OWNER as string;
    const repo = process.env.GITHUB_REPO as string;
    const branch = (process.env.GITHUB_BRANCH as string) || 'main';

    const file = await octokit.repos.getContent({ owner, repo, path, ref: branch });
    if (!('content' in file.data)) return res.status(404).json({ erro: 'Arquivo não encontrado' });
    const csv = Buffer.from(file.data.content, 'base64').toString('utf-8');
    return res.status(200).json({ ok: true, modulo, path, csv });
  } catch (e) {
    return res.status(500).json({ erro: 'Falha ao ler dados', detalhe: (e as Error).message });
  }
}
