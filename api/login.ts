import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });
  const { senha } = req.body as { senha?: string };
  if (!senha || senha !== process.env.SENHA_MESTRA) return res.status(401).json({ erro: 'Não autorizado' });
  const secret = process.env.JWT_SECRET;
  if (!secret) return res.status(500).json({ erro: 'JWT_SECRET não configurado' });
  const token = jwt.sign({ user: 'portaria' }, secret, { expiresIn: '8h' });
  return res.status(200).json({ token });
}
