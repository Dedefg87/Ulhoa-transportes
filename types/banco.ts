export type Cliente = {
  id: string;
  nome: string;
  empresa: string | null;
  telefone: string | null;
  email: string | null;
  observacoes: string | null;
  criado_em: string;
};

export type Servico = {
  id: string;
  data_hora: string;
  cliente_id: string | null;
  endereco_embarque: string | null;
  endereco_destino: string | null;
  endereco_retorno: string | null;
  lat_embarque: number | null;
  lon_embarque: number | null;
  lat_destino: number | null;
  lon_destino: number | null;
  lat_retorno: number | null;
  lon_retorno: number | null;
  km_total: number;
  horas_servico: number;
  horas_espera: number;
  cenario_transito: string | null;
  custo_total: number;
  preco_cobrado: number;
  lucro: number;
  margem: number;
  pedagio: number;
  estacionamento: number;
  observacoes: string | null;
  criado_em: string;
};

export type ServicoComCliente = Servico & {
  clientes: { nome: string; empresa: string | null } | null;
};

export type TipoLancamento = 'gasolina' | 'manutencao' | 'lavagem' | 'outro';

export type Lancamento = {
  id: string;
  data: string;
  tipo: TipoLancamento;
  descricao: string | null;
  valor: number;
  km_no_momento: number | null;
  litros: number | null;
  criado_em: string;
};