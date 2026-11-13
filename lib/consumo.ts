import type { TipoCombustivel } from '@/types';

/**
 * Consumos médios (km/l) por modelo — base Inmetro / dados de fábrica.
 * A chave é um trecho do nome do modelo em minúsculas.
 * O valor é o consumo combinado (média cidade/estrada) com gasolina.
 */
const BASE: Record<string, number> = {
  // VW
  'gol': 13.5, 'voyage': 13.5, 'polo': 13.0, 'virtus': 13.5,
  't-cross': 11.5, 'tcross': 11.5, 'nivus': 12.0, 'saveiro': 11.5,
  'amarok': 8.5, 'jetta': 12.5, 'fox': 13.0, 'up': 14.5,
  // Chevrolet
  'onix': 13.5, 'onix plus': 14.0, 'prisma': 13.5, 'tracker': 11.5,
  'spin': 10.0, 'montana': 10.5, 's10': 8.5, 'cruze': 12.0,
  'cobalt': 12.5, 'equinox': 9.5,
  // Fiat
  'mobi': 14.0, 'argo': 13.5, 'cronos': 13.5, 'strada': 11.5,
  'toro': 9.0, 'pulse': 12.0, 'fastback': 12.0, 'uno': 13.5,
  'palio': 13.0, 'siena': 12.5, 'doblo': 10.0, 'fiorino': 11.0,
  'tipo': 12.5, '500': 14.0,
  // Toyota
  'corolla': 12.5, 'corolla cross': 11.0, 'yaris': 13.5,
  'etios': 13.5, 'hilux': 8.0, 'sw4': 7.5, 'rav4': 10.0,
  'yaris cross': 12.0,
  // Honda
  'civic': 12.0, 'city': 13.0, 'fit': 13.5, 'hr-v': 11.5,
  'hrv': 11.5, 'wr-v': 12.5, 'wrv': 12.5, 'cr-v': 10.0,
  'accord': 11.0,
  // Hyundai
  'hb20': 13.5, 'hb20s': 14.0, 'creta': 11.5, 'tucson': 9.5,
  'i30': 12.0, 'ix35': 10.0,
  // Renault
  'kwid': 14.5, 'sandero': 13.0, 'logan': 13.5, 'duster': 11.0,
  'captur': 11.5, 'stepway': 13.0, 'oroch': 10.5,
  // Nissan
  'march': 13.5, 'versa': 13.5, 'kicks': 12.0, 'frontier': 8.0,
  'sentra': 12.0,
  // Ford
  'ka': 14.0, 'ka sedan': 14.0, 'ecosport': 11.5, 'ranger': 8.0,
  'fusion': 11.0,
  // Jeep
  'renagade': 11.0, 'renegade': 11.0, 'compass': 10.5,
  'commander': 9.0, 'wrangler': 8.5,
  // Peugeot / Citroën
  '208': 13.5, '2008': 11.5, '3008': 10.0, 'c3': 13.5,
  'c4 cactus': 12.0, 'c4': 12.0,
  // Mitsubishi
  'l200': 8.0, 'outlander': 9.5, 'asx': 11.0, 'eclipse cross': 10.0,
  // Caoa Chery / outros
  'tiggo': 10.0, 'tiggo 5x': 11.0, 'tiggo 7': 9.5, 'arrizo': 12.0,
  'haval': 11.0,
  // Premium
  'bmw': 10.0, 'mercedes': 10.0, 'audi': 10.5, 'volvo': 10.0,
  'land rover': 8.0, 'porsche': 9.0,
  // Utilitários / vans
  'sprinter': 8.0, 'master': 8.5, 'ducato': 8.0, 'daily': 8.0,
  'kombi': 9.0, 'hr': 9.0,
};

/** Consumo estimado por categoria, quando o modelo não está na base */
const POR_CATEGORIA: Record<string, number> = {
  'Hatch': 13.5,
  'Popular': 14.0,
  'Sedã': 12.5,
  'SUV': 10.5,
  'Picape': 9.0,
  'Executivo': 11.0,
};

/** Ajuste por combustível */
const FATOR_COMBUSTIVEL: Record<string, number> = {
  'Gasolina': 1,
  'Etanol': 0.72,
  'Flex': 1,
  'Diesel': 1.15,
  'GNV': 1.4,
  'Híbrido': 1.6,
};

export interface ConsumoEstimado {
  kmPorLitro: number;
  fonte: 'base' | 'categoria' | 'padrao';
  modeloEncontrado?: string;
}

/**
 * Estima o consumo (km/l) a partir do nome do modelo e da categoria.
 * Precisão é ordem de grandeza — o usuário pode ajustar depois.
 */
export function estimarConsumo(
  modelo: string,
  categoria: string,
  combustivel: TipoCombustivel,
): ConsumoEstimado {
  const nome = (modelo ?? '').toLowerCase().trim();

  // Busca o modelo mais específico primeiro (chave mais longa que casa)
  const chaves = Object.keys(BASE).sort((a, b) => b.length - a.length);
  const achou = chaves.find((k) => nome.includes(k));

  const fator = FATOR_COMBUSTIVEL[combustivel] ?? 1;

  if (achou) {
    return {
      kmPorLitro: Number((BASE[achou] * fator).toFixed(2)),
      fonte: 'base',
      modeloEncontrado: achou,
    };
  }

  const porCat = POR_CATEGORIA[categoria];
  if (porCat) {
    return {
      kmPorLitro: Number((porCat * fator).toFixed(2)),
      fonte: 'categoria',
    };
  }

  return { kmPorLitro: Number((11 * fator).toFixed(2)), fonte: 'padrao' };
}