import { describe, it, expect } from 'vitest';
import { calcularServico } from './precificacao';
import { calcularCPK } from './cpk';
import { calcularCFH } from './cfh';
import type { Veiculo, CustosFixos, CustosVariaveis, Config, EntradaServico } from '@/types';

const veiculo: Veiculo = {
  carroId: 'toyota-corolla-2021-20-xei',
  marca: 'Toyota', modelo: 'Corolla', ano: 2021, versao: '2.0 XEi',
  combustivel: 'Flex',
  consumo: 10.5,
  valorFipe: 118000,
  valorRevendaEsperado: 88000,
  kmPrevistosAteRevenda: 120000,
  kmAtual: 45000,
  kmPorMes: 3000,
  proprio: true,
};

const custosFixos: CustosFixos = {
  garagem: 600, seguro: 750, ipvaLicenciamento: 250, celular: 100,
  contadorMei: 150, reservaManutencao: 400, software: 50, outros: 100,
};

const custosVariaveis: CustosVariaveis = {
  manutencaoPorKm: 0.18, lavagemPorKm: 0.04, esteticaPorKm: 0.01, outrosPorKm: 0,
};

const config: Config = {
  precoGasolina: 6.10, precoEtanol: 4.20,
  dataAtualizacaoCombustivel: new Date().toISOString(),
  metaMargem: 0.30, appNavegacao: 'google',
  horasProdutivasMes: 180, impostosPercentual: 0,
};

const entrada: EntradaServico = {
  kmServico: 22, kmAteEmbarque: 8, kmRetornoBase: 6,
  horasServico: 1.1667, horasEspera: 0.3333, horasDeslocamento: 0.5,
  pedagio: 12, estacionamento: 0, agenciaPercentual: 0,
};

describe('Motor de cálculo — exemplo do PRD', () => {
  it('CPK ≈ R$ 1,3942/km', () => {
    expect(calcularCPK(veiculo, custosFixos, custosVariaveis, config)).toBeCloseTo(1.3942, 3);
  });

  it('CFH ≈ R$ 13,33/h', () => {
    expect(calcularCFH(custosFixos, config)).toBeCloseTo(13.3333, 3);
  });

  it('Custo ≈ R$ 88,86 e preço alvo ≈ R$ 126,94', () => {
    const r = calcularServico(entrada, veiculo, custosFixos, custosVariaveis, config);
    expect(r.kmTotais).toBe(36);
    expect(r.horasTotais).toBeCloseTo(2, 1);
    expect(r.custoTotal).toBeCloseTo(88.86, 0);
    expect(r.precoAlvo).toBeCloseTo(126.94, 0);
    expect(r.precoComercial).toBe(130);
  });

  it('Lucro R$ 41,14 no preço comercial, margem entre 30% e 33%', () => {
    const r = calcularServico(entrada, veiculo, custosFixos, custosVariaveis, config, 130);
    expect(r.lucro).toBeCloseTo(41.14, 0);
    expect(r.margemEfetiva).toBeGreaterThan(0.30);
    expect(r.margemEfetiva).toBeLessThan(0.33);
  });
});