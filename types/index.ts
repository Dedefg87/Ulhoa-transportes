// ==========================================================
// Tipos centrais do App do Rodrigo — Motorista Executivo
// ==========================================================

export type TipoCombustivel =
  | 'Gasolina'
  | 'Etanol'
  | 'Flex'
  | 'Diesel'
  | 'GNV'
  | 'Híbrido';

/** Combustível efetivamente usado em um serviço */
export type CombustivelServico = 'Gasolina' | 'Etanol';

export type AppNavegacao = 'waze' | 'google' | 'perguntar';

export type CategoriaVeiculo =
  | 'Popular'
  | 'Sedã'
  | 'SUV'
  | 'Hatch'
  | 'Picape'
  | 'Executivo';

/** Carro da base brasileira (especificações de fábrica) */
export interface Carro {
  id: string;
  marca: string;
  modelo: string;
  ano: number;
  versao: string;
  combustivel: TipoCombustivel;
  consumoUrbano: number;
  consumoRodoviario: number;
  fipeCodigo?: string;
  categoria: CategoriaVeiculo;
}

/** Veículo configurado pelo Rodrigo */
export interface Veiculo {
  carroId: string | null;
  marca: string;
  modelo: string;
  ano: number | null;
  versao: string;
  combustivel: TipoCombustivel;
  consumo: number;
  /** Consumo com etanol (km/l). Se ausente, estima consumo × 0,70 */
  consumoEtanol?: number;
  valorFipe: number;
  valorRevendaEsperado: number;
  kmPrevistosAteRevenda: number;
  kmAtual: number;
  kmPorMes: number;
  proprio: boolean;
  aluguelMensal?: number;
  franquiaKmMes?: number;
  custoKmExcedente?: number;
}

/** Veículo com id, para lista */
export interface VeiculoSalvo extends Veiculo {
  id: string;
  apelido: string;
  criadoEm: string;
  consumoEstimado: boolean;
  categoria: CategoriaVeiculo;
}

export interface CustosFixos {
  garagem: number;
  seguro: number;
  ipvaLicenciamento: number;
  celular: number;
  contadorMei: number;
  reservaManutencao: number;
  software: number;
  outros: number;
}

export interface CustosVariaveis {
  manutencaoPorKm: number;
  lavagemPorKm: number;
  esteticaPorKm: number;
  outrosPorKm: number;
}

export interface Config {
  precoGasolina: number;
  precoEtanol: number;
  dataAtualizacaoCombustivel: string;
  metaMargem: number;
  appNavegacao: AppNavegacao;
  horasProdutivasMes: number;
  impostosPercentual: number;
}

export interface EntradaServico {
  kmServico: number;
  kmAteEmbarque: number;
  kmRetornoBase: number;
  horasServico: number;
  horasEspera: number;
  horasDeslocamento: number;
  pedagio: number;
  estacionamento: number;
  agenciaPercentual: number;
  /** Combustível usado neste serviço */
  combustivel: CombustivelServico;
}

export interface ResultadoServico {
  kmTotais: number;
  horasTotais: number;
  custoCombustivel: number;
  custoDepreciacao: number;
  custoManutencao: number;
  custoSeguroImpostos: number;
  custoTempo: number;
  custoExtra: number;
  custoTotal: number;
  precoMinimo: number;
  precoAlvo: number;
  precoComercial: number;
  lucro: number;
  margemEfetiva: number;
  lucroPorKm: number;
  lucroPorHora: number;
  cpk: number;
  cfh: number;
}

export interface ServicoSalvo {
  id?: number;
  data: string;
  clienteId?: number;
  descricao: string;
  entrada: EntradaServico;
  resultado: ResultadoServico;
  valorCobrado: number;
}

export interface Cliente {
  id?: number;
  nome: string;
  tipo: 'Corporativo' | 'Executivo' | 'Evento' | 'Turismo';
  telefone?: string;
  email?: string;
  observacoes?: string;
  criadoEm: string;
}

/** Resultado da comparação gasolina × etanol */
export interface ComparacaoCombustivel {
  gasolina: {
    preco: number;
    consumo: number;
    custoKm: number;
    custoViagem: number;
  };
  etanol: {
    preco: number;
    consumo: number;
    custoKm: number;
    custoViagem: number;
  };
  maisViavel: CombustivelServico;
  economia: number;
  economiaPercentual: number;
  /** true se o consumo do etanol foi estimado (não cadastrado) */
  baseEstimada: boolean;
}