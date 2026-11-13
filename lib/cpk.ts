import type { Veiculo, CustosFixos, CustosVariaveis, Config } from '@/types';

/** Preço do litro conforme o combustível escolhido. */
export function precoLitro(config: Config, combustivel: Veiculo['combustivel']): number {
  if (combustivel === 'Etanol') return config.precoEtanol;
  return config.precoGasolina;
}

/** Combustível por km = preço do litro ÷ consumo (km/l) */
export function custoCombustivelKm(veiculo: Veiculo, config: Config): number {
  const consumo = veiculo.consumo > 0 ? veiculo.consumo : 10;
  return precoLitro(config, veiculo.combustivel) / consumo;
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
): number {
  return (
    custoCombustivelKm(veiculo, config) +
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
) {
  return {
    combustivel: custoCombustivelKm(veiculo, config),
    depreciacao: custoDepreciacaoKm(veiculo),
    manutencao: custosVariaveis.manutencaoPorKm,
    lavagem: custosVariaveis.lavagemPorKm + custosVariaveis.esteticaPorKm,
    seguroImpostos: custoSeguroImpostosKm(custosFixos, veiculo),
    outros: custosVariaveis.outrosPorKm,
    total: calcularCPK(veiculo, custosFixos, custosVariaveis, config),
  };
}