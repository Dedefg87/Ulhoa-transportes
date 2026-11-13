export interface FipeMarca {
  codigo: string;
  nome: string;
}

export interface FipeModelo {
  codigo: string;
  nome: string;
}

export interface FipeAno {
  codigo: string;
  nome: string;
}

export interface FipeValor {
  valor: string;
  marca: string;
  modelo: string;
  anoModelo: number;
  combustivel: string;
  codigoFipe: string;
  mesReferencia: string;
}

const BASE = '/api/fipe';

/** Normaliza a resposta da FIPE: aceita {code,name} e {codigo,nome} */
function normalizarLista(dados: any): { codigo: string; nome: string }[] {
  if (!Array.isArray(dados)) return [];
  return dados
    .map((item) => ({
      codigo: String(item?.code ?? item?.codigo ?? ''),
      nome: String(item?.name ?? item?.nome ?? ''),
    }))
    .filter((i) => i.codigo && i.nome);
}

async function getJSON(caminho: string): Promise<any> {
  const resposta = await fetch(`${BASE}/${caminho}`, {
    headers: { Accept: 'application/json' },
  });
  if (!resposta.ok) throw new Error(`FIPE ${resposta.status}`);
  return resposta.json();
}

export async function listarMarcas(): Promise<FipeMarca[]> {
  return normalizarLista(await getJSON('cars/brands'));
}

export async function listarModelos(marcaCodigo: string): Promise<FipeModelo[]> {
  return normalizarLista(await getJSON(`cars/brands/${marcaCodigo}/models`));
}

export async function listarAnos(
  marcaCodigo: string,
  modeloCodigo: string,
): Promise<FipeAno[]> {
  return normalizarLista(
    await getJSON(`cars/brands/${marcaCodigo}/models/${modeloCodigo}/years`),
  );
}

export async function consultarValor(
  marcaCodigo: string,
  modeloCodigo: string,
  anoCodigo: string,
): Promise<FipeValor> {
  const d = await getJSON(
    `cars/brands/${marcaCodigo}/models/${modeloCodigo}/years/${anoCodigo}`,
  );
  return {
    valor: String(d?.price ?? d?.valor ?? 'R$ 0,00'),
    marca: String(d?.brand ?? d?.marca ?? ''),
    modelo: String(d?.model ?? d?.modelo ?? ''),
    anoModelo: Number(d?.modelYear ?? d?.anoModelo ?? 0),
    combustivel: String(d?.fuel ?? d?.combustivel ?? ''),
    codigoFipe: String(d?.codeFipe ?? d?.codigoFipe ?? ''),
    mesReferencia: String(d?.referenceMonth ?? d?.mesReferencia ?? ''),
  };
}

/** "R$ 118.000,00" → 118000 */
export function precoFipeParaNumero(preco: string): number {
  const limpo = String(preco)
    .replace(/[^\d,]/g, '')
    .replace(',', '.');
  const n = Number(limpo);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

/** Normaliza o combustível da FIPE para o tipo do app */
export function normalizarCombustivel(
  bruto: string,
): 'Gasolina' | 'Etanol' | 'Flex' | 'Diesel' | 'GNV' | 'Híbrido' {
  const t = String(bruto).toLowerCase();
  if (t.includes('diesel')) return 'Diesel';
  if (t.includes('elétric') || t.includes('eletric')) return 'Híbrido';
  if (t.includes('híbrid') || t.includes('hibrid')) return 'Híbrido';
  if (t.includes('gnv')) return 'GNV';
  if (t.includes('álcool') || t.includes('alcool') || t.includes('etanol'))
    return 'Etanol';
  if (t.includes('flex')) return 'Flex';
  return 'Gasolina';
}