import { NextRequest } from 'next/server';

const BASE = 'https://fipe.parallelum.com.br/api/v2';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const partes = url.pathname.split('/api/fipe/')[1] ?? '';
  const caminho = partes.replace(/\/+$/, '');

  if (!caminho) {
    return Response.json(
      { erro: 'Caminho vazio. Use /api/fipe/cars/brands' },
      { status: 400 },
    );
  }

  const alvo = `${BASE}/${caminho}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);

  try {
    const resposta = await fetch(alvo, {
      signal: ctrl.signal,
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'app-rodrigo/1.0',
      },
    });

    if (!resposta.ok) {
      return Response.json(
        { erro: `FIPE respondeu ${resposta.status}`, alvo },
        { status: resposta.status },
      );
    }

    const dados = await resposta.json();
    return Response.json(dados);
  } catch (e: any) {
    return Response.json(
      { erro: e?.message ?? 'Falha ao consultar a FIPE', alvo },
      { status: 502 },
    );
  } finally {
    clearTimeout(timer);
  }
}