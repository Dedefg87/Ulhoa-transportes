import type { EntradaServico } from '@/types';

/**
 * Km totais: serviço + deslocamento até o embarque + retorno à base.
 * O motorista executivo NÃO termina no destino — termina onde guarda o carro.
 */
export function kmTotais(e: EntradaServico): number {
  return e.kmServico + e.kmAteEmbarque + e.kmRetornoBase;
}

/** Horas totais: deslocamento + espera + duração do serviço */
export function horasTotais(e: EntradaServico): number {
  return e.horasServico + e.horasEspera + e.horasDeslocamento;
}

/**
 * CUSTO DO SERVIÇO
 * = (CPK × km totais) + (CFH × horas totais) + pedágio + estacionamento
 */
export function custoServico(e: EntradaServico, cpk: number, cfh: number): number {
  const custoKm = cpk * kmTotais(e);
  const custoTempo = cfh * horasTotais(e);
  const extras = e.pedagio + e.estacionamento;
  return custoKm + custoTempo + extras;
}