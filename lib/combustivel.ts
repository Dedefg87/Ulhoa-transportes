import type {
  Veiculo,
  Config,
  CombustivelServico,
  ComparacaoCombustivel,
} from '@/types';
import { precoLitro, consumoPara } from './cpk';

/**
 * Consumo (km/l) do veículo. Se não estiver cadastrado, assume 10.
 * Pode receber o combustível para escolher entre gasolina e etanol.
 */
export function consumoKmPorLitro(
  veiculo: Veiculo,
  combustivel?: CombustivelServico,
): number {
  if (combustivel) return consumoPara(veiculo, combustivel);
  return veiculo.consumo > 0 ? veiculo.consumo : 10;
}

/**
 * Litros gastos numa distância.
 * litros = km ÷ (km/l)
 */
export function litrosDaViagem(
  km: number,
  veiculo: Veiculo,
  combustivel?: CombustivelServico,
): number {
  const consumo = consumoKmPorLitro(veiculo, combustivel);
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
  combustivel?: CombustivelServico,
): number {
  const comb =
    combustivel ?? (veiculo.combustivel === 'Etanol' ? 'Etanol' : 'Gasolina');
  return litrosDaViagem(km, veiculo, comb) * precoLitro(config, comb);
}

/**
 * COMPARAÇÃO GASOLINA × ETANOL
 *
 * Regra de mercado (70%): etanol compensa quando
 *   preço_etanol / preço_gasolina < consumo_etanol / consumo_gasolina
 *
 * Calcula custo por km e o custo real da viagem informada.
 */
export function compararCombustiveis(
  veiculo: Veiculo,
  config: Config,
  km = 0,
): ComparacaoCombustivel {
  const precoGas = config.precoGasolina;
  const precoEta = config.precoEtanol;

  const consumoGas = consumoPara(veiculo, 'Gasolina');
  const consumoEta = consumoPara(veiculo, 'Etanol');

  const custoKmGas = precoGas / consumoGas;
  const custoKmEta = precoEta / consumoEta;

  const custoViagemGas = custoKmGas * km;
  const custoViagemEta = custoKmEta * km;

  const maisViavel: CombustivelServico =
    custoKmEta < custoKmGas ? 'Etanol' : 'Gasolina';

  const custoMenor = Math.min(custoViagemGas, custoViagemEta);
  const custoMaior = Math.max(custoViagemGas, custoViagemEta);
  const economia = custoMaior - custoMenor;
  const economiaPercentual = custoMaior > 0 ? (economia / custoMaior) * 100 : 0;

  // Base estimada quando o consumo do etanol não está cadastrado
  const baseEstimada = !(veiculo.consumoEtanol && veiculo.consumoEtanol > 0);

  return {
    gasolina: {
      preco: precoGas,
      consumo: consumoGas,
      custoKm: custoKmGas,
      custoViagem: custoViagemGas,
    },
    etanol: {
      preco: precoEta,
      consumo: consumoEta,
      custoKm: custoKmEta,
      custoViagem: custoViagemEta,
    },
    maisViavel,
    economia,
    economiaPercentual,
    baseEstimada,
  };
}