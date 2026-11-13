import type { Veiculo, Config } from '@/types';
import { precoLitro } from './cpk';

/**
 * Consumo (km/l) do veículo. Se não estiver cadastrado, assume 10.
 */
export function consumoKmPorLitro(veiculo: Veiculo): number {
  return veiculo.consumo > 0 ? veiculo.consumo : 10;
}

/**
 * Litros gastos numa distância.
 * litros = km ÷ (km/l)
 */
export function litrosDaViagem(km: number, veiculo: Veiculo): number {
  const consumo = consumoKmPorLitro(veiculo);
  if (km <= 0 || consumo <= 0) return 0;
  return km / consumo;
}

/**
 * Custo do combustível da viagem.
 * custo = litros × preço do litro
 */
export function custoCombustivelViagem(
  km: number,
  veiculo: Veiculo,
  config: Config,
): number {
  return litrosDaViagem(km, veiculo) * precoLitro(config, veiculo.combustivel);
}