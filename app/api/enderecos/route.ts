import { NextRequest, NextResponse } from 'next/server';

type Resultado = {
  id: string;
  lat: number;
  lon: number;
  label: string;
};

type NominatimItem = {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    house_number?: string;
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    state?: string;
    postcode?: string;
  };
};

type PhotonItem = {
  properties: {
    osm_id?: number;
    osm_type?: string;
    housenumber?: string;
    name?: string;
    street?: string;
    district?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  geometry: { coordinates: [number, number] };
};

/** Extrai o número digitado no texto (ex.: "ilacir pereira lima 267" → "267") */
function extrairNumero(q: string): string | null {
  const m = q.match(/\b(\d{1,5})\b/);
  return m ? m[1] : null;
}

function montarLabelPhoton(p: PhotonItem['properties']): string {
  const rua =
    p.street && p.housenumber
      ? `${p.street}, ${p.housenumber}`
      : p.street || p.name;
  const partes = [
    rua,
    p.district,
    p.city,
    p.state,
    p.postcode,
    p.country === 'Brazil' ? 'Brasil' : p.country,
  ].filter(Boolean);
  return partes.join(', ');
}

/** Injeta o número no rótulo quando a base não o trouxe */
function injetarNumero(label: string, numero: string | null): string {
  if (!numero) return label;
  if (new RegExp(`,\\s*${numero}\\b`).test(label)) return label;
  if (new RegExp(`\\b${numero}\\b`).test(label)) return label;

  // "Rua X, Bairro, Cidade, Estado, CEP, Brasil"
  // vira "Rua X, 267, Bairro, Cidade, Estado, CEP, Brasil"
  return label.replace(/^([^,]+)/, `$1, ${numero}`);
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim();

  if (!q || q.length < 3) return NextResponse.json([]);

  const numero = extrairNumero(q);
  const resultados: Resultado[] = [];

  // 1) Photon — melhor indexação de número em algumas regiões
  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6&lang=pt&bbox=-74,-34,-34,6`;
    const resp = await fetch(url, { headers: { 'Accept-Language': 'pt-BR' } });
    if (resp.ok) {
      const dados = (await resp.json()) as { features?: PhotonItem[] };
      (dados.features ?? []).forEach((f, i) => {
        const [lon, lat] = f.geometry.coordinates;
        const label = montarLabelPhoton(f.properties);
        if (label) {
          resultados.push({
            id: `p-${f.properties.osm_type ?? 'n'}-${f.properties.osm_id ?? i}`,
            lat,
            lon,
            label: injetarNumero(label, numero),
          });
        }
      });
    }
  } catch {
    // segue
  }

  // 2) Nominatim — busca estruturada primeiro (house number), depois livre
  try {
    const headers = {
      'User-Agent': 'app-rodrigo/1.0 (precificacao)',
      'Accept-Language': 'pt-BR',
    };

    const urls: string[] = [];

    if (numero) {
      const semNumero = q.replace(new RegExp(`\\b${numero}\\b`), '').replace(/\s+/g, ' ').trim();
      urls.push(
        'https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=br&limit=6' +
          `&street=${encodeURIComponent(numero + ' ' + semNumero)}`,
      );
    }

    urls.push(
      'https://nominatim.openstreetmap.org/search?format=json&addressdetails=0&countrycodes=br&limit=6' +
        `&q=${encodeURIComponent(q)}`,
    );

    for (const url of urls) {
      const resp = await fetch(url, { headers });
      if (!resp.ok) continue;

      const dados = (await resp.json()) as NominatimItem[];
      dados.forEach((d) => {
        resultados.push({
          id: `n-${d.place_id}`,
          lat: parseFloat(d.lat),
          lon: parseFloat(d.lon),
          label: injetarNumero(d.display_name, numero),
        });
      });

      // Se a busca estruturada já trouxe número real, não precisa da livre
      if (dados.some((d) => d.address?.house_number === numero)) break;
    }
  } catch {
    // ignora
  }

  // 3) Deduplica por label normalizado
  const vistos = new Set<string>();
  const finais: Resultado[] = [];

  for (const r of resultados) {
    const chave = r.label
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (vistos.has(chave)) continue;
    vistos.add(chave);
    finais.push(r);

    if (finais.length >= 6) break;
  }

  return NextResponse.json(finais);
}