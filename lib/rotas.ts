// lib/rotas.ts
// GPS + endereço→coordenada + rota + margem de segurança de tempo

export type Ponto = {
  lat: number;
  lon: number;
  label: string;
};

export type RotaTrecho = {
  km: number;
  segundos: number;
};

export type RotaCompleta = {
  kmTotal: number;
  segundosTotal: number;
  kmComMargem: number;
  segundosComMargem: number;
  trechos: RotaTrecho[];
};

export type CenarioTransito =
  | 'normal'
  | 'moderado'
  | 'pico_manha'
  | 'pico_tarde'
  | 'critico';

export const FATORES_TRANSITO: Record<
  CenarioTransito,
  { fator: number; label: string; descricao: string }
> = {
  normal: {
    fator: 1.1,
    label: 'Normal',
    descricao: 'Fora de pico, vias livres (+10%)',
  },
  moderado: {
    fator: 1.25,
    label: 'Moderado',
    descricao: 'Trânsito médio de cidade (+25%)',
  },
  pico_manha: {
    fator: 1.45,
    label: 'Pico manhã',
    descricao: 'Entre 7h e 9h (+45%)',
  },
  pico_tarde: {
    fator: 1.55,
    label: 'Pico tarde',
    descricao: 'Entre 17h e 19h (+55%)',
  },
  critico: {
    fator: 1.8,
    label: 'Crítico',
    descricao: 'Chuva, acidente ou feriado (+80%)',
  },
};

/**
 * Sugere o cenário pelo horário atual do aparelho.
 *
 * ATENÇÃO: o parâmetro é opcional (`agora?: Date`) e não `agora = new Date()`.
 * Usar `new Date()` como valor padrão faz o Next 16 avaliar a data durante o
 * prerender do servidor, o que dispara o erro:
 * "Next.js encountered the unstable value `new Date()`".
 * Resolvendo a data dentro do corpo, ela só é lida quando a função é
 * efetivamente chamada no navegador.
 */
export function cenarioPorHorario(agora?: Date): CenarioTransito {
  const h = (agora ?? new Date()).getHours();
  if (h >= 7 && h < 9) return 'pico_manha';
  if (h >= 17 && h < 19) return 'pico_tarde';
  if (h >= 9 && h < 17) return 'moderado';
  return 'normal';
}

/** Pega a localização atual do celular */
export function pegarLocalizacaoAtual(): Promise<Ponto> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Este aparelho não permite localização.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          label: 'Localização atual',
        });
      },
      (err) => {
        const msg =
          err.code === err.PERMISSION_DENIED
            ? 'Permissão de localização negada. Libere no navegador.'
            : err.code === err.POSITION_UNAVAILABLE
              ? 'Não foi possível obter o sinal de GPS.'
              : 'O GPS demorou demais para responder.';
        reject(new Error(msg));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  });
}

/** Endereço em texto → coordenada (via rota interna /api/enderecos) */
export async function geocodificar(endereco: string): Promise<Ponto> {
  const limpo = endereco.trim();
  if (limpo.length < 3) throw new Error('Digite um endereço com mais detalhes.');

  const resp = await fetch(`/api/enderecos?q=${encodeURIComponent(limpo)}`);
  if (!resp.ok) throw new Error('Não foi possível buscar o endereço agora.');

  const dados = (await resp.json()) as Array<{
    lat: number;
    lon: number;
    label: string;
  }>;

  if (!dados.length) throw new Error(`Endereço não encontrado: "${limpo}"`);

  return { lat: dados[0].lat, lon: dados[0].lon, label: dados[0].label };
}

/** Distância e tempo entre dois pontos (OSRM / OpenStreetMap) */
async function rotaEntre(a: Ponto, b: Ponto): Promise<RotaTrecho> {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${a.lon},${a.lat};${b.lon},${b.lat}?overview=false`;

  const resp = await fetch(url);
  if (!resp.ok) throw new Error('Não foi possível calcular a rota agora.');

  const dados = (await resp.json()) as {
    code: string;
    routes?: Array<{ distance: number; duration: number }>;
  };

  if (dados.code !== 'Ok' || !dados.routes?.length) {
    throw new Error('Nenhuma rota encontrada entre os pontos.');
  }

  return {
    km: dados.routes[0].distance / 1000,
    segundos: dados.routes[0].duration,
  };
}

/** Rota completa: atual → embarque → destino → retorno */
export async function calcularRotaCompleta(
  pontos: { atual: Ponto; embarque: Ponto; destino: Ponto; retorno: Ponto },
  cenario: CenarioTransito = 'moderado',
): Promise<RotaCompleta> {
  const trechos = await Promise.all([
    rotaEntre(pontos.atual, pontos.embarque),
    rotaEntre(pontos.embarque, pontos.destino),
    rotaEntre(pontos.destino, pontos.retorno),
  ]);

  const kmTotal = trechos.reduce((s, t) => s + t.km, 0);
  const segundosTotal = trechos.reduce((s, t) => s + t.segundos, 0);
  const fator = FATORES_TRANSITO[cenario].fator;

  return {
    kmTotal: Math.round(kmTotal * 10) / 10,
    segundosTotal: Math.round(segundosTotal),
    kmComMargem: Math.round(kmTotal * 10) / 10,
    segundosComMargem: Math.round(segundosTotal * fator),
    trechos: trechos.map((t) => ({
      km: Math.round(t.km * 10) / 10,
      segundos: Math.round(t.segundos),
    })),
  };
}

/** Link do Waze com o trajeto pronto */
export function linkWaze(destino: Ponto, partida?: Ponto): string {
  const ll = `${destino.lat},${destino.lon}`;
  if (partida) {
    return `https://waze.com/ul?ll=${ll}&from=${partida.lat},${partida.lon}&navigate=yes`;
  }
  return `https://waze.com/ul?ll=${ll}&navigate=yes`;
}

/** Formata segundos como "1h 25min" */
export function formatarDuracao(segundos: number): string {
  const min = Math.round(segundos / 60);
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}