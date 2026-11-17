import type {
  EntradaServico,
  ResultadoServico,
  Veiculo,
  CustosFixos,
  CustosVariaveis,
  Config,
} from '@/types';
import {
  calcularCPK,
  custoCombustivelKm,
  custoDepreciacaoKm,
  custoSeguroImpostosKm,
} from './cpk';
import { calcularCFH } from './cfh';
import { kmTotais, horasTotais } from './servico';

/** Arredonda para múltiplo de 5 (padrão comercial) e garante o piso do custo */
export function precoComercial(precoAlvo: number, custoTotal: number): number {
  const arredondado = Math.ceil(precoAlvo / 5) * 5;
  return Math.max(arredondado, Math.ceil(custoTotal));
}

/**
 * MOTOR COMPLETO — recebe tudo e devolve o ResultadoServico.
 *
 * REGRA CENTRAL:
 *   Preço_alvo = Custo ÷ (1 − margem)   ← margem sobre a RECEITA
 *   Não é custo × (1 + markup) — a diferença é grande.
 */
export function calcularServico(
  entrada: EntradaServico,
  veiculo: Veiculo,
  custosFixos: CustosFixos,
  custosVariaveis: CustosVariaveis,
  config: Config,
  valorCobrado?: number,
): ResultadoServico {
  // O combustível escolhido no serviço entra no CPK
  const combustivel = entrada.combustivel ?? 'Gasolina';

  const cpk = calcularCPK(
    veiculo,
    custosFixos,
    custosVariaveis,
    config,
    combustivel,
  );
  const cfh = calcularCFH(custosFixos, config);

  const km = kmTotais(entrada);
  const horas = horasTotais(entrada);

  const custoKm = cpk * km;
  const custoTempo = cfh * horas;
  const extras = entrada.pedagio + entrada.estacionamento;
  const custoBase = custoKm + custoTempo + extras;

  const margemValida =
    config.metaMargem >= 0 && config.metaMargem < 0.95 ? config.metaMargem : 0.3;

  // 1ª passada: preço alvo só com margem
  let precoAlvo = custoBase / (1 - margemValida);

  // Impostos sobre receita (MEI/DAS) entram como custo
  const impostos = precoAlvo * config.impostosPercentual;
  const custoTotal = custoBase + impostos;

  // 2ª passada: preço alvo incluindo impostos
  precoAlvo = custoTotal / (1 - margemValida);

  // Ajuste para comissão de agência/intermediador, quando houver
  if (entrada.agenciaPercentual > 0) {
    const liquido = precoAlvo * (1 - entrada.agenciaPercentual);
    if (liquido < custoTotal) {
      precoAlvo = custoTotal / ((1 - margemValida) * (1 - entrada.agenciaPercentual));
    }
  }

  const precoMinimo = custoTotal;
  const comercial = precoComercial(precoAlvo, custoTotal);

  const cobrado = valorCobrado && valorCobrado > 0 ? valorCobrado : comercial;
  const liquidoRecebido = cobrado * (1 - entrada.agenciaPercentual);
  const lucro = liquidoRecebido - custoTotal;

  return {
    kmTotais: km,
    horasTotais: horas,
    custoCombustivel: custoCombustivelKm(veiculo, config, combustivel) * km,
    custoDepreciacao: custoDepreciacaoKm(veiculo) * km,
    custoManutencao: custosVariaveis.manutencaoPorKm * km,
    custoSeguroImpostos: custoSeguroImpostosKm(custosFixos, veiculo) * km,
    custoTempo,
    custoExtra: extras + impostos,
    custoTotal,
    precoMinimo,
    precoAlvo,
    precoComercial: comercial,
    lucro,
    margemEfetiva: cobrado > 0 ? lucro / cobrado : 0,
    lucroPorKm: km > 0 ? lucro / km : 0,
    lucroPorHora: horas > 0 ? lucro / horas : 0,
    cpk,
    cfh,
  };
}

/** Break-even: faturamento mensal necessário para cobrir custos e bater a meta */
export function breakEvenMensal(
  custosFixos: CustosFixos,
  veiculo: Veiculo,
  custosVariaveis: CustosVariaveis,
  config: Config,
  combustivel?: 'Gasolina' | 'Etanol',
): number {
  const cpk = calcularCPK(
    veiculo,
    custosFixos,
    custosVariaveis,
    config,
    combustivel,
  );
  const fixos =
    custosFixos.garagem + custosFixos.seguro + custosFixos.ipvaLicenciamento +
    custosFixos.celular + custosFixos.contadorMei + custosFixos.reservaManutencao +
    custosFixos.software + custosFixos.outros;
  const variavelMes = cpk * veiculo.kmPorMes;
  const m = config.metaMargem;
  return (fixos + variavelMes) / (1 - m);
}