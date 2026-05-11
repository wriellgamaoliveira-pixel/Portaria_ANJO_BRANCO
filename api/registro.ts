import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Octokit } from '@octokit/rest';
import jwt from 'jsonwebtoken';

type Registro = {
  data_hora: string;
  tipo: 'entrada' | 'saida';
  placa: string;
  motorista: string;
  km_entrada: string;
  km_saida: string;
  foto: string;
};

const CAB = 'data_hora;tipo;placa;motorista;km_entrada;km_saida;foto';
const csvParse = (t: string): Registro[] => {
  const lines = t.trim().split('\n');
  lines.shift();
  return lines.filter(Boolean).map((l) => {
    const [data_hora, tipo, placa, motorista, km_entrada, km_saida, foto] = l.split(';');
    return { data_hora, tipo: tipo as 'entrada' | 'saida', placa, motorista, km_entrada, km_saida, foto };
  });
};
const csvGen = (regs: Registro[]) => [CAB, ...regs.map((r) => [r.data_hora, r.tipo, r.placa, r.motorista, r.km_entrada, r.km_saida, r.foto].join(';'))].join('\n');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });
  try {
    const auth = req.headers.authorization || '';
    const token = auth.replace('Bearer ', '');
    jwt.verify(token, process.env.JWT_SECRET as string);

    const { tipo, placa, motorista, km, foto_base64 } = req.body as { tipo: 'entrada' | 'saida'; placa: string; motorista: string; km: number; foto_base64?: string };
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const owner = process.env.GITHUB_OWNER as string;
    const repo = process.env.GITHUB_REPO as string;
    const branch = (process.env.GITHUB_BRANCH as string) || 'main';

    let fotoNome = '';
    if (foto_base64) {
      fotoNome = `foto_${Date.now()}_${placa.replace(/[^A-Z0-9-]/gi, '')}.jpg`;
      await octokit.repos.createOrUpdateFileContents({ owner, repo, path: `fotos/${fotoNome}`, message: `chore: upload foto ${placa}`, content: foto_base64, branch });
    }

    const csvResp = await octokit.repos.getContent({ owner, repo, path: 'dados/registros.csv', ref: branch });
    if (!('content' in csvResp.data)) return res.status(500).json({ erro: 'Arquivo CSV inválido' });

    const csvAtual = Buffer.from(csvResp.data.content, 'base64').toString('utf-8');
    const regs = csvParse(csvAtual);
    const data_hora = new Date().toISOString().slice(0, 16).replace('T', ' ');

    if (tipo === 'entrada') {
      regs.push({ data_hora, tipo, placa, motorista, km_entrada: String(km), km_saida: '', foto: fotoNome });
    } else {
      const idx = [...regs].reverse().findIndex((r) => r.placa === placa && !r.km_saida);
      if (idx >= 0) {
        const real = regs.length - 1 - idx;
        regs[real].km_saida = String(km);
        if (fotoNome) regs[real].foto = fotoNome;
      } else {
        regs.push({ data_hora, tipo, placa, motorista, km_entrada: '', km_saida: String(km), foto: fotoNome });
      }
    }

    const novoCSV = csvGen(regs);
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: 'dados/registros.csv',
      message: `chore: registro ${tipo} ${placa}`,
      content: Buffer.from(novoCSV, 'utf-8').toString('base64'),
      sha: csvResp.data.sha,
      branch
    });

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(401).json({ erro: 'Falha ao registrar', detalhe: (e as Error).message });
  }
}
