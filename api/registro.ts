import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Octokit } from '@octokit/rest';

type Registro = Record<string, string>;
const CAB = ['data_hora_saida','data_hora_chegada','tipo','operacao','placa','km_saida','rota','transporte','motorista','ajudante','vigia','carrinho','unidade','foto'];

const parseCSV = (t: string): Registro[] => {
  const lines = (t || '').trim().split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const h = lines.shift()!.split(';');
  return lines.map((l) => { const c = l.split(';'); const o: Registro = {}; h.forEach((k,i)=>o[k]=c[i]||''); return o; });
};
const genCSV = (rows: Registro[]) => [CAB.join(';'), ...rows.map((r) => CAB.map((k) => r[k] || '').join(';'))].join('\n');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });
  try {
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const owner = process.env.GITHUB_OWNER as string;
    const repo = process.env.GITHUB_REPO as string;
    const branch = (process.env.GITHUB_BRANCH as string) || 'main';
    const path = 'dados/portaria_registros.csv';

    const body = req.body as { registro: Registro; foto_base64?: string };
    const registro = body.registro || ({} as Registro);

    let fotoNome = '';
    if (body.foto_base64) {
      const placa = (registro.placa || '').replace(/[^A-Z0-9]/gi, '');
      const tipo = (registro.tipo || 'saida').toLowerCase();
      fotoNome = `foto_${tipo}_${Date.now()}_${placa}.jpg`;
      const clean = body.foto_base64.replace(/^data:image\/\w+;base64,/, '');
      await octokit.repos.createOrUpdateFileContents({ owner, repo, path: `fotos/${fotoNome}`, message: `chore: upload ${fotoNome}`, content: clean, branch });
    }

    registro.foto = fotoNome || registro.foto || '';

    let sha: string | undefined;
    let atual = '';
    try {
      const old = await octokit.repos.getContent({ owner, repo, path, ref: branch });
      if ('content' in old.data) { sha = old.data.sha; atual = Buffer.from(old.data.content, 'base64').toString('utf-8'); }
    } catch {}

    const rows = parseCSV(atual);
    rows.push(CAB.reduce((a,k)=>(a[k]=registro[k]||'',a), {} as Registro));
    const csv = genCSV(rows);

    await octokit.repos.createOrUpdateFileContents({ owner, repo, path, branch, message: `chore: registro ${registro.tipo || 'portaria'} ${registro.placa || ''}`,
      content: Buffer.from(csv, 'utf-8').toString('base64'), ...(sha ? { sha } : {}) });

    return res.status(200).json({ ok: true, foto: fotoNome });
  } catch (e) {
    return res.status(500).json({ erro: 'Falha ao registrar', detalhe: (e as Error).message });
  }
}
