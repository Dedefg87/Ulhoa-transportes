import type {
  Veiculo,
  CustosFixos,
  CustosVariaveis,
  Config,
  CombustivelServico,
} from '@/types';

/** Fator de rendimento do etanol em relação à gasolina (padrão de mercado) */
export const FATOR_ETANOL = 0.7;

/**
 * Preço do litro conforme o combustível.
 * Aceita `CombustivelServico` (gasolina/etanol) ou o tipo do veículo.
 */
export function precoLitro(
  config: Config,
  combustivel: Veiculo['combustivel'] | CombustivelServico,
): number {
  if (combustivel === 'Etanol') return config.precoEtanol;
  return config.precoGasolina;
}

/** Consumo (km/l) do veículo para o combustível escolhido */
export function consumoPara(
  veiculo: Veiculo,
  combustivel: CombustivelServico | Veiculo['combustivel'],
): number {
  const gasolina = veiculo.consumo > 0 ? veiculo.consumo : 10;

  if (combustivel !== 'Etanol') return gasolina;

  // Etanol: usa o cadastrado; senão estima pela regra dos 70%
  return veiculo.consumoEtanol && veiculo.consumoEtanol > 0
    ? veiculo.consumoEtanol
    : gasolina * FATOR_ETANOL;
}

/** Combustível por km = preço do litro ÷ consumo (km/l) */
export function custoCombustivelKm(
  veiculo: Veiculo,
  config: Config,
  combustivel?: CombustivelServico,
): number {
  const comb = combustivel ?? (veiculo.combustivel === 'Etanol' ? 'Etanol' : 'Gasolina');
  const consumo = consumoPara(veiculo, comb);
  return precoLitro(config, comb) / consumo;
}

/** Depreciação por km = (valor de compra − valor de revenda) ÷ km até a revenda */
export function custoDepreciacaoKm(veiculo: Veiculo): number {
  const km = veiculo.kmPrevistosAteRevenda > 0 ? veiculo.kmPrevistosAteRevenda : 120000;
  const diff = veiculo.valorFipe - veiculo.valorRevendaEsperado;
  if (diff <= 0) return 0;
  return diff / km;
}

/** Seguro + IPVA + licenciamento por km (rateio anual sobre o km/ano). */
export function custoSeguroImpostosKm(custosFixos: CustosFixos, veiculo: Veiculo): number {
  const kmMes = veiculo.kmPorMes > 0 ? veiculo.kmPorMes : 1;
  const anual = (custosFixos.seguro + custosFixos.ipvaLicenciamento) * 12;
  const kmAno = kmMes * 12;
  return kmAno > 0 ? anual / kmAno : 0;
}

/** CUSTO POR KM (CPK) — soma de todos os componentes. */
export function calcularCPK(
  veiculo: Veiculo,
  custosFixos: CustosFixos,
  custosVariaveis: CustosVariaveis,
  config: Config,
  combustivel?: CombustivelServico,
): number {
  return (
    custoCombustivelKm(veiculo, config, combustivel) +
    custoDepreciacaoKm(veiculo) +
    custosVariaveis.manutencaoPorKm +
    custosVariaveis.lavagemPorKm +
    custosVariaveis.esteticaPorKm +
    custosVariaveis.outrosPorKm +
    custoSeguroImpostosKm(custosFixos, veiculo)
  );
}

/** Detalhamento do CPK — mostra de onde vem cada centavo. */
export function detalharCPK(
  veiculo: Veiculo,
  custosFixos: CustosFixos,
  custosVariaveis: CustosVariaveis,
  config: Config,
  combustivel?: CombustivelServico,
) {
  return {
    combustivel: custoCombustivelKm(veiculo, config, combustivel),
    depreciacao: custoDepreciacaoKm(veiculo),
    manutencao: custosVariaveis.manutencaoPorKm,
    lavagem: custosVariaveis.lavagemPorKm + custosVariaveis.esteticaPorKm,
    seguroImpostos: custoSeguroImpostosKm(custosFixos, veiculo),
    outros: custosVariaveis.outrosPorKm,
    total: calcularCPK(veiculo, custosFixos, custosVariaveis, config, combustivel),
  };
}