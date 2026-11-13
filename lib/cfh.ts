import type { CustosFixos, Config } from '@/types';

/** Soma dos custos fixos mensais */
export function totalCustosFixosMensais(c: CustosFixos): number {
  return (
    c.garagem + c.seguro + c.ipvaLicenciamento + c.celular +
    c.contadorMei + c.reservaManutencao + c.software + c.outros
  );
}

/**
 * CUSTO FIXO POR HORA = custos fixos mensais ÷ horas produtivas do mês.
 * Horas produtivas = horas em serviço + horas de disponibilidade (standby).
 */
export function calcularCFH(custosFixos: CustosFixos, config: Config): number {
  const horas = config.horasProdutivasMes > 0 ? config.horasProdutivasMes : 180;
  return totalCustosFixosMensais(custosFixos) / horas;
}