'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useConfig } from '@/store/config';
import { useVeiculoAtivo } from '@/store/veiculos';
import { useCustos } from '@/store/custos';
import { useLocais } from '@/store/locais';
import { calcularServico } from '@/lib/precificacao';
import {
  litrosDaViagem,
  custoCombustivelViagem,
  compararCombustiveis,
} from '@/lib/combustivel';
import { useClientes } from '@/store/clientes';
import { useServicos } from '@/store/servicos';
import {
  pegarLocalizacaoAtual,
  geocodificar,
  calcularRotaCompleta,
  linkWaze,
  linkGoogleMapsTrajeto,
  formatarDuracao,
  cenarioPorHorario,
  FATORES_TRANSITO,
  type Ponto,
  type CenarioTransito,
  type RotaCompleta,
} from '@/lib/rotas';
import type {
  EntradaServico,
  ResultadoServico,
  CombustivelServico,
} from '@/types';
import { CampoEndereco } from '@/components/CampoEndereco';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Crosshair,
  Navigation,
  Calculator,
  Loader2,
  Save,
  Check,
  Fuel,
  Clock,
  RotateCcw,
  Wallet,
  Route,
  MapPin,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';

const ESPERA_POR_PASSAGEIRO_MIN = 10;

/** Normaliza "1.200,50", "1200,50" e "1200.50" para número */
function parseNum(s: string): number {
  if (!s) return 0;
  const limpo = s.replace(/\./g, '').replace(',', '.');
  const n = Number(limpo);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function Linha({
  label,
  valor,
  destaque,
}: {
  label: string;
  valor: string;
  destaque?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={destaque ? 'font-semibold' : ''}>{valor}</span>
    </div>
  );
}

/** Converte horas decimais para "1h 33min" */
function horasParaTexto(h: number): string {
  if (!Number.isFinite(h) || h <= 0) return '0h 00min';
  const totalMin = Math.round(h * 60);
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  return `${hh}h ${String(mm).padStart(2, '0')}min`;
}

export default function CalcularPage() {
  const { config } = useConfig();
  const veiculo = useVeiculoAtivo();
  const { fixos, variaveis } = useCustos();
  const { adicionar, registrarUso, maisUsados } = useLocais();
  const { clientes, carregar: carregarClientes } = useClientes();
  const { salvar: salvarServico } = useServicos();

  // Guard de hidratação: evita mismatch entre SSR e client
  const [montado, setMontado] = useState(false);
  const [atual, setAtual] = useState<Ponto | null>(null);
  const [buscandoGps, setBuscandoGps] = useState(false);
  const [embarque, setEmbarque] = useState('');
  const [destino, setDestino] = useState('');
  const [retorno, setRetorno] = useState('');
  const [pontoEmb, setPontoEmb] = useState<Ponto | null>(null);
  const [pontoDest, setPontoDest] = useState<Ponto | null>(null);
  const [pontoRet, setPontoRet] = useState<Ponto | null>(null);
  const [passageiros, setPassageiros] = useState('1');
  const [horasServico, setHorasServico] = useState('1.20');
  const [horasEspera, setHorasEspera] = useState('0.30');
  const [pedagio, setPedagio] = useState('0');
  const [estacionamento, setEstacionamento] = useState('0');
  // 'normal' é o valor neutro; o horário real é lido no client (useEffect abaixo)
  const [cenario, setCenario] = useState<CenarioTransito>('normal');
  const [calculando, setCalculando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoServico | null>(null);
  const [rotaInfo, setRotaInfo] = useState<any>(null);
  const [previaRota, setPreviaRota] = useState<RotaCompleta | null>(null);
  const [calculandoPrevia, setCalculandoPrevia] = useState(false);
  const [horasAuto, setHorasAuto] = useState(false);
  const [clienteId, setClienteId] = useState('');
  const [servicoSalvo, setServicoSalvo] = useState(false);
  const [salvandoServico, setSalvandoServico] = useState(false);
  // Valor manual que o Rodrigo decide cobrar (serviços exclusivos)
  const [valorManual, setValorManual] = useState('');
  // Combustível usado neste serviço
  const [combustivel, setCombustivel] = useState<CombustivelServico>('Gasolina');

  const top5 = useMemo(() => maisUsados(5), [maisUsados]);

  const veiculoValido = veiculo.carroId !== null && veiculo.valorFipe > 0;
  const pontosProntos =
    !!atual && !!pontoEmb && !!pontoDest && !!pontoRet;

  useEffect(() => {
    carregarClientes();
  }, [carregarClientes]);

  // Marca como montado, lê o horário e define o combustível padrão
  useEffect(() => {
    setMontado(true);
    setCenario(cenarioPorHorario());
    // Padrão: o combustível do veículo quando for Etanol; senão Gasolina
    setCombustivel(veiculo.combustivel === 'Etanol' ? 'Etanol' : 'Gasolina');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const usarGps = async () => {
    setBuscandoGps(true);
    setErro(null);
    try {
      const p = await pegarLocalizacaoAtual();
      setAtual(p);
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setBuscandoGps(false);
    }
  };

  useEffect(() => {
    if (!pontosProntos) {
      setPreviaRota(null);
      return;
    }
    let cancelado = false;
    setCalculandoPrevia(true);
    calcularRotaCompleta(
      {
        atual: atual!,
        embarque: pontoEmb!,
        destino: pontoDest!,
        retorno: pontoRet!,
      },
      cenario,
    )
      .then((rota) => {
        if (cancelado) return;
        setPreviaRota(rota);
        // Só o trecho do SERVIÇO (embarque → destino) entra nas horas de serviço.
        // Ida até o embarque e volta ao retorno entram em horasDeslocamento.
        const servicoSeg = rota.trechos[1]?.segundosComMargem ?? 0;
        const horasServicoCalc = servicoSeg / 3600;
        const qtd = Math.max(1, Number(passageiros) || 1);
        const minutosEspera = ESPERA_POR_PASSAGEIRO_MIN * qtd * 2;
        const horasEsperaCalc = minutosEspera / 60;
        setHorasServico(Math.max(horasServicoCalc, 0.05).toFixed(2));
        setHorasEspera(horasEsperaCalc.toFixed(2));
        setHorasAuto(true);
      })
      .catch(() => {
        if (!cancelado) setPreviaRota(null);
      })
      .finally(() => {
        if (!cancelado) setCalculandoPrevia(false);
      });
    return () => {
      cancelado = true;
    };
  }, [atual, pontoEmb, pontoDest, pontoRet, cenario, pontosProntos, passageiros]);

  /**
   * Monta a EntradaServico com os TRÊS trechos separados.
   * kmTotais() soma kmAteEmbarque + kmServico + kmRetornoBase → trajeto completo.
   * horasTotais() soma horasServico + horasEspera + horasDeslocamento → sem duplicar.
   */
  const montarEntrada = (rota: RotaCompleta): EntradaServico => {
    const ida = rota.trechos[0];
    const servico = rota.trechos[1];
    const volta = rota.trechos[2];

    const segDeslocamento =
      (ida?.segundosComMargem ?? 0) + (volta?.segundosComMargem ?? 0);

    return {
      kmAteEmbarque: ida?.km ?? 0,
      kmServico: servico?.km ?? 0,
      kmRetornoBase: volta?.km ?? 0,
      horasServico: Number(horasServico) || 0,
      horasEspera: Number(horasEspera) || 0,
      horasDeslocamento: segDeslocamento / 3600,
      pedagio: parseNum(pedagio),
      estacionamento: parseNum(estacionamento),
      agenciaPercentual: 0,
      combustivel,
    };
  };

  const calcular = async () => {
    setErro(null);
    setResultado(null);
    setRotaInfo(null);
    setServicoSalvo(false);
    setValorManual('');

    if (!veiculoValido) {
      setErro('Cadastre o veículo e o valor FIPE antes de calcular.');
      return;
    }
    if (!atual) {
      setErro('Toque em "Usar minha localização" primeiro.');
      return;
    }
    if (!embarque.trim() || !destino.trim() || !retorno.trim()) {
      setErro('Preencha embarque, destino e retorno.');
      return;
    }

    setCalculando(true);
    try {
      const [pEmb, pDest, pRet] = await Promise.all([
        pontoEmb ?? geocodificar(embarque),
        pontoDest ?? geocodificar(destino),
        pontoRet ?? geocodificar(retorno),
      ]);

      const rota = await calcularRotaCompleta(
        { atual, embarque: pEmb, destino: pDest, retorno: pRet },
        cenario,
      );

      const entrada = montarEntrada(rota);
      const res = calcularServico(entrada, veiculo, fixos, variaveis, config);

      setRotaInfo({ rota, pEmb, pDest, pRet });
      setResultado(res);
      adicionar({ nome: retorno, lat: pRet.lat, lon: pRet.lon });
    } catch (e: any) {
      setErro(e.message || 'Não foi possível calcular. Tente novamente.');
    } finally {
      setCalculando(false);
    }
  };

  /** Troca o combustível e recalcula na hora se já houver resultado */
  const trocarCombustivel = (comb: CombustivelServico) => {
    setCombustivel(comb);
    setServicoSalvo(false);
    if (!rotaInfo) return;

    const entrada = montarEntrada(rotaInfo.rota);
    entrada.combustivel = comb;
    const manual = parseNum(valorManual);

    setResultado(
      calcularServico(
        entrada,
        veiculo,
        fixos,
        variaveis,
        config,
        manual > 0 ? manual : undefined,
      ),
    );
  };

  /** Aplica o valor manual e devolve lucro/margem recalculados na hora */
  const aplicarValorManual = (texto: string) => {
    setValorManual(texto);
    setServicoSalvo(false);
    if (!rotaInfo) return;

    const n = parseNum(texto);
    const entrada = montarEntrada(rotaInfo.rota);
    setResultado(
      calcularServico(
        entrada,
        veiculo,
        fixos,
        variaveis,
        config,
        n > 0 ? n : undefined,
      ),
    );
  };

  /** Limpa o valor manual e volta ao preço sugerido */
  const limparValorManual = () => {
    setValorManual('');
    setServicoSalvo(false);
    if (!rotaInfo) return;
    const entrada = montarEntrada(rotaInfo.rota);
    setResultado(calcularServico(entrada, veiculo, fixos, variaveis, config));
  };

  const salvarNoHistorico = async () => {
    if (!resultado || !rotaInfo) return;
    setSalvandoServico(true);

    const manual = parseNum(valorManual);
    const precoFinal = manual > 0 ? manual : resultado.precoComercial;

    const id = await salvarServico({
      cliente_id: clienteId || null,
      endereco_embarque: embarque,
      endereco_destino: destino,
      endereco_retorno: retorno,
      lat_embarque: rotaInfo.pEmb?.lat ?? null,
      lon_embarque: rotaInfo.pEmb?.lon ?? null,
      lat_destino: rotaInfo.pDest?.lat ?? null,
      lon_destino: rotaInfo.pDest?.lon ?? null,
      lat_retorno: rotaInfo.pRet?.lat ?? null,
      lon_retorno: rotaInfo.pRet?.lon ?? null,
      km_total: rotaInfo.rota.kmTotal,
      horas_servico: Number(horasServico) || 0,
      horas_espera: Number(horasEspera) || 0,
      cenario_transito: cenario,
      custo_total: resultado.custoTotal,
      preco_cobrado: precoFinal,
      lucro: resultado.lucro,
      margem: resultado.margemEfetiva,
      pedagio: parseNum(pedagio),
      estacionamento: parseNum(estacionamento),
      observacoes: null,
      combustivel,
    });

    setSalvandoServico(false);
    if (id) setServicoSalvo(true);
  };

  /** Waze vai até o embarque (primeira perna do trajeto) */
  const abrirWaze = () => {
    if (!rotaInfo || !atual) return;
    const url = linkWaze(rotaInfo.pEmb ?? rotaInfo.pDest, atual);
    window.open(url, '_blank');
  };

  /** Google Maps com o trajeto completo: base → embarque → destino → retorno */
  const abrirTrajetoCompleto = () => {
    if (!rotaInfo || !atual) return;
    const url = linkGoogleMapsTrajeto({
      atual,
      embarque: rotaInfo.pEmb,
      destino: rotaInfo.pDest,
      retorno: rotaInfo.pRet,
    });
    window.open(url, '_blank');
  };

  const brl = (v: number) =>
    (Number.isFinite(v) ? v : 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });

  const kmViagem = rotaInfo?.rota?.kmTotal ?? 0;
  const litros = litrosDaViagem(kmViagem, veiculo, combustivel);
  const custoComb = custoCombustivelViagem(
    kmViagem,
    veiculo,
    config,
    combustivel,
  );

  // Comparação gasolina × etanol para o trajeto atual
  const comparacao = compararCombustiveis(veiculo, config, kmViagem);
  const escolhidoEhMelhor = comparacao.maisViavel === combustivel;
  const economiaPerdida = escolhidoEhMelhor
    ? 0
    : Math.abs(
        (combustivel === 'Gasolina'
          ? comparacao.etanol.custoViagem
          : comparacao.gasolina.custoViagem) - custoComb,
      );

  const horasServicoNum = Number(horasServico) || 0;
  const horasEsperaNum = Number(horasEspera) || 0;
  const horasTotal = horasServicoNum + horasEsperaNum;

  // Trechos para exibição
  const trechos = rotaInfo?.rota?.trechos ?? [];
  const kmIda = trechos[0]?.km ?? 0;
  const kmServicoT = trechos[1]?.km ?? 0;
  const kmVolta = trechos[2]?.km ?? 0;
  const segDesloc =
    (trechos[0]?.segundosComMargem ?? 0) +
    (trechos[2]?.segundosComMargem ?? 0);

  const valorManualNum = parseNum(valorManual);
  const temManual = valorManualNum > 0;
  const abaixoDoCusto =
    temManual && resultado && valorManualNum < resultado.custoTotal;
  const abaixoDaMeta =
    temManual &&
    resultado &&
    valorManualNum >= resultado.custoTotal &&
    resultado.margemEfetiva < config.metaMargem;

  const consumoGas = comparacao.gasolina.consumo;
  const consumoEta = comparacao.etanol.consumo;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Calcular serviço</h1>
        <p className="text-sm text-muted-foreground">
          Preencha os pontos e o app calcula o trajeto completo
        </p>
      </div>

      {!veiculoValido && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-4">
            <p className="text-sm font-medium">Cadastre seu veículo primeiro</p>
            <Link href="/veiculo">
              <Button size="sm" className="mt-2">
                Ir para o veículo
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">1. De onde você sai</CardTitle>
        </CardHeader>
        <CardContent>
          {atual ? (
            <div className="flex items-center gap-2 rounded-md border border-primary/40 bg-primary/5 p-3">
              <Crosshair className="h-4 w-4 text-primary" />
              <span className="flex-1 text-sm">
                Localização atual capturada
              </span>
              <Badge variant="secondary">GPS</Badge>
            </div>
          ) : (
            <Button
              onClick={usarGps}
              disabled={buscandoGps}
              variant="outline"
              className="h-11 w-full"
            >
              {buscandoGps ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Buscando
                  GPS...
                </>
              ) : (
                <>
                  <Crosshair className="mr-2 h-4 w-4" /> Usar minha localização
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">2. Embarque do passageiro</CardTitle>
        </CardHeader>
        <CardContent>
          <CampoEndereco
            valor={embarque}
            onChange={setEmbarque}
            onSelecionar={setPontoEmb}
            placeholder="Rua, número, bairro, cidade"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">3. Destino</CardTitle>
        </CardHeader>
        <CardContent>
          <CampoEndereco
            valor={destino}
            onChange={setDestino}
            onSelecionar={setPontoDest}
            placeholder="Rua, número, bairro, cidade"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">4. Retorno</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {montado && top5.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Mais usados</p>
              <div className="flex flex-wrap gap-2">
                {top5.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => {
                      setRetorno(l.nome);
                      setPontoRet({ lat: l.lat, lon: l.lon, label: l.nome });
                      registrarUso(l.id);
                    }}
                    className="rounded-full border px-3 py-1 text-xs hover:bg-accent"
                  >
                    {l.nome}
                  </button>
                ))}
              </div>
            </div>
          )}
          <CampoEndereco
            valor={retorno}
            onChange={setRetorno}
            onSelecionar={setPontoRet}
            placeholder="Endereço de retorno"
          />
        </CardContent>
      </Card>

      {calculandoPrevia && (
        <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-3 text-sm">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Calculando a rota e preenchendo os tempos...
        </div>
      )}

      {previaRota && !calculandoPrevia && (
        <div className="rounded-md border border-primary/40 bg-primary/5 p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Trajeto total</span>
            <span className="font-semibold">
              {previaRota.kmTotal} km ·{' '}
              {formatarDuracao(previaRota.segundosComMargem)}
            </span>
          </div>
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>
              Ida {previaRota.trechos[0]?.km ?? 0} km · Serviço{' '}
              {previaRota.trechos[1]?.km ?? 0} km · Volta{' '}
              {previaRota.trechos[2]?.km ?? 0} km
            </span>
            <span>
              {litrosDaViagem(
                previaRota.kmTotal,
                veiculo,
                combustivel,
              ).toFixed(1)}{' '}
              L ·{' '}
              {brl(
                custoCombustivelViagem(
                  previaRota.kmTotal,
                  veiculo,
                  config,
                  combustivel,
                ),
              )}
            </span>
          </div>
        </div>
      )}

      {/* ===== COMBUSTÍVEL ===== */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Fuel className="h-4 w-4" /> Combustível deste serviço
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {/* Gasolina */}
            <button
              onClick={() => trocarCombustivel('Gasolina')}
              className={`rounded-lg border p-3 text-left transition-colors ${
                combustivel === 'Gasolina'
                  ? 'border-primary bg-primary/5'
                  : 'hover:bg-accent'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Gasolina</span>
                {comparacao.maisViavel === 'Gasolina' && (
                  <Check className="h-3.5 w-3.5 text-green-600" />
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {brl(comparacao.gasolina.preco)}/L ·{' '}
                {consumoGas.toFixed(1).replace('.', ',')} km/l
              </p>
              <p className="mt-0.5 text-sm font-semibold">
                {brl(comparacao.gasolina.custoKm)}/km
              </p>
            </button>

            {/* Etanol */}
            <button
              onClick={() => trocarCombustivel('Etanol')}
              className={`rounded-lg border p-3 text-left transition-colors ${
                combustivel === 'Etanol'
                  ? 'border-primary bg-primary/5'
                  : 'hover:bg-accent'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  Etanol
                  {comparacao.baseEstimada && (
                    <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                      est.
                    </span>
                  )}
                </span>
                {comparacao.maisViavel === 'Etanol' && (
                  <Check className="h-3.5 w-3.5 text-green-600" />
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {brl(comparacao.etanol.preco)}/L ·{' '}
                {consumoEta.toFixed(1).replace('.', ',')} km/l
              </p>
              <p className="mt-0.5 text-sm font-semibold">
                {brl(comparacao.etanol.custoKm)}/km
              </p>
            </button>
          </div>

          {/* Sugestão */}
          {kmViagem > 0 && (
            <div className="rounded-md border border-blue-500/40 bg-blue-500/5 p-2.5">
              <p className="flex items-start gap-1.5 text-xs">
                <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" />
                <span>
                  <strong>{comparacao.maisViavel} compensa</strong> neste
                  trajeto — {brl(comparacao.economia)} de economia em{' '}
                  {kmViagem.toFixed(1)} km
                  {comparacao.baseEstimada && (
                    <span className="text-muted-foreground">
                      {' '}
                      (base: estimativa de 70%)
                    </span>
                  )}
                </span>
              </p>
            </div>
          )}

          {/* Alerta se escolheu o pior */}
          {!escolhidoEhMelhor && kmViagem > 0 && (
            <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-2.5">
              <p className="flex items-start gap-1.5 text-xs font-medium text-amber-700">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  Você escolheu {combustivel}, mas {comparacao.maisViavel} está
                  mais viável. Diferença de {brl(economiaPerdida)} neste
                  serviço.
                </span>
              </p>
            </div>
          )}

          <Separator />
          <Linha
            label={`Combustível previsto (${
              combustivel === 'Etanol'
                ? litrosDaViagem(kmViagem, veiculo, 'Etanol').toFixed(1)
                : litros.toFixed(1)
            } L)`}
            valor={brl(custoComb)}
            destaque
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-base">
            <span>6. Tempo e extras</span>
            {horasAuto && (
              <Badge variant="secondary" className="text-[10px]">
                automático
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Passageiros</Label>
            <Input
              inputMode="numeric"
              value={passageiros}
              onChange={(e) => setPassageiros(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Pedágio (R$)</Label>
            <Input
              inputMode="decimal"
              value={pedagio}
              onChange={(e) => setPedagio(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Horas do serviço</Label>
            <Input
              inputMode="decimal"
              value={horasServico}
              onChange={(e) => {
                setHorasServico(e.target.value);
                setHorasAuto(false);
              }}
            />
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {horasParaTexto(horasServicoNum)}
            </p>
          </div>
          <div>
            <Label className="text-xs">Horas de espera</Label>
            <Input
              inputMode="decimal"
              value={horasEspera}
              onChange={(e) => {
                setHorasEspera(e.target.value);
                setHorasAuto(false);
              }}
            />
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {horasParaTexto(horasEsperaNum)}
            </p>
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Estacionamento (R$)</Label>
            <Input
              inputMode="decimal"
              value={estacionamento}
              onChange={(e) => setEstacionamento(e.target.value)}
            />
          </div>
          {horasAuto && (
            <p className="col-span-2 text-[11px] text-muted-foreground">
              Horas do serviço = só o trecho embarque → destino. A ida até o
              embarque e a volta ao retorno entram como deslocamento. Espera
              calculada com {passageiros} passageiro
              {Number(passageiros) > 1 ? 's' : ''} ×{' '}
              {ESPERA_POR_PASSAGEIRO_MIN} min por parada. Pedágio e
              estacionamento são seus — a rota gratuita não informa esses
              valores.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">7. Trânsito previsto</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2">
          {(Object.keys(FATORES_TRANSITO) as CenarioTransito[]).map((k) => (
            <button
              key={k}
              onClick={() => setCenario(k)}
              className={`rounded-lg border p-2 text-left text-xs transition-colors ${
                cenario === k ? 'border-primary bg-primary/5' : 'hover:bg-accent'
              }`}
            >
              <p className="font-medium">{FATORES_TRANSITO[k].label}</p>
              <p className="text-muted-foreground">
                +{Math.round((FATORES_TRANSITO[k].fator - 1) * 100)}%
              </p>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">8. Cliente do serviço</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <select
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="">Sem cliente (avulso)</option>
            {montado &&
              clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                  {c.empresa ? ` — ${c.empresa}` : ''}
                </option>
              ))}
          </select>
          {montado && clientes.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Nenhum cliente cadastrado.{' '}
              <Link href="/clientes" className="text-primary underline">
                Cadastrar agora
              </Link>
            </p>
          )}
        </CardContent>
      </Card>

      {erro && (
        <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
          {erro}
        </div>
      )}

      <Button
        onClick={calcular}
        disabled={calculando}
        className="h-12 w-full text-base"
      >
        {calculando ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Calculando rota...
          </>
        ) : (
          <>
            <Calculator className="mr-2 h-4 w-4" /> Calcular
          </>
        )}
      </Button>

      {rotaInfo && resultado && (
        <>
          <Card className="border-primary/40">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Route className="h-4 w-4" /> Trajeto total
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <Linha
                label="Ida até o embarque"
                valor={`${kmIda.toFixed(1)} km`}
              />
              <Linha
                label="Serviço (embarque → destino)"
                valor={`${kmServicoT.toFixed(1)} km`}
              />
              <Linha
                label="Volta ao retorno"
                valor={`${kmVolta.toFixed(1)} km`}
              />
              <Separator className="my-2" />
              <Linha
                label="Distância total"
                valor={`${rotaInfo.rota.kmTotal} km`}
                destaque
              />
              <Linha
                label="Tempo de deslocamento"
                valor={horasParaTexto(segDesloc / 3600)}
              />
              <Linha
                label="Cenário"
                valor={FATORES_TRANSITO[cenario].label}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Fuel className="h-4 w-4" /> Combustível da viagem
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <Linha
                label={`${litros.toFixed(1)} L × ${brl(
                  combustivel === 'Etanol'
                    ? config.precoEtanol
                    : config.precoGasolina,
                )}`}
                valor={brl(custoComb)}
                destaque
              />
              <Linha
                label="Combustível selecionado"
                valor={combustivel}
              />
              <Linha
                label="Consumo do veículo"
                valor={`${
                  (combustivel === 'Etanol' ? consumoEta : consumoGas)
                    .toFixed(1)
                    .replace('.', ',')
                } km/l`}
              />
              <p className="pt-1 text-[11px] text-muted-foreground">
                Valor já incluído no custo por km do cálculo.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4" /> Tempo do serviço
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <Linha
                label="Trajeto (embarque → destino)"
                valor={horasParaTexto(horasServicoNum)}
              />
              <Linha
                label="Espera nos passageiros"
                valor={horasParaTexto(horasEsperaNum)}
              />
              <Linha
                label="Deslocamento (ida + volta)"
                valor={horasParaTexto(segDesloc / 3600)}
              />
              <Separator className="my-2" />
              <Linha
                label="Total do serviço"
                valor={horasParaTexto(horasTotal + segDesloc / 3600)}
                destaque
              />
            </CardContent>
          </Card>

          <Card className="border-primary/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Resultado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <Linha label="Custo" valor={brl(resultado.custoTotal)} />
              <Linha label="Preço mínimo" valor={brl(resultado.precoMinimo)} />
              <Linha
                label="Preço alvo"
                valor={brl(resultado.precoAlvo)}
                destaque
              />
              <Linha
                label="Preço comercial"
                valor={brl(resultado.precoComercial)}
                destaque
              />
              <Separator className="my-2" />
              <Linha label="Lucro" valor={brl(resultado.lucro)} destaque />
              <Linha
                label="Lucro por hora"
                valor={brl(resultado.lucroPorHora)}
              />
              <div className="flex items-center justify-between pt-1">
                <span className="text-muted-foreground">Margem</span>
                <Badge
                  variant={
                    resultado.margemEfetiva >= config.metaMargem
                      ? 'default'
                      : 'destructive'
                  }
                >
                  {(resultado.margemEfetiva * 100).toFixed(1)}%
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* ===== VALOR MANUAL — SERVIÇO EXCLUSIVO ===== */}
          <Card
            className={
              abaixoDoCusto ? 'border-destructive/50' : 'border-primary/40'
            }
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Wallet className="h-4 w-4" /> Valor que vou cobrar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-[11px] text-muted-foreground">
                Opcional — para serviços exclusivos com preço diferenciado.
                Deixe vazio para usar o preço sugerido.
              </p>

              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-muted-foreground">
                  R$
                </span>
                <Input
                  inputMode="decimal"
                  value={valorManual}
                  onChange={(e) => aplicarValorManual(e.target.value)}
                  placeholder={resultado.precoComercial
                    .toFixed(2)
                    .replace('.', ',')}
                  className="text-lg font-bold"
                />
                {temManual && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={limparValorManual}
                    title="Voltar ao preço sugerido"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {abaixoDoCusto && (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 p-2">
                  <p className="text-[11px] font-medium text-destructive">
                    Abaixo do custo — prejuízo de{' '}
                    {brl(resultado.custoTotal - valorManualNum)}
                  </p>
                </div>
              )}

              {abaixoDaMeta && (
                <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-2">
                  <p className="text-[11px] font-medium text-amber-600">
                    Lucro positivo, mas abaixo da meta de{' '}
                    {(config.metaMargem * 100).toFixed(0)}%
                  </p>
                </div>
              )}

              {temManual && !abaixoDoCusto && !abaixoDaMeta && (
                <div className="rounded-md border border-green-600/40 bg-green-600/10 p-2">
                  <p className="text-[11px] font-medium text-green-700">
                    Acima da meta de {(config.metaMargem * 100).toFixed(0)}%
                  </p>
                </div>
              )}

              <Separator className="my-1" />

              <Linha
                label={temManual ? 'Cobrando' : 'Preço sugerido'}
                valor={brl(
                  temManual ? valorManualNum : resultado.precoComercial,
                )}
                destaque
              />
              <Linha label="Lucro" valor={brl(resultado.lucro)} destaque />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Margem real</span>
                <Badge
                  variant={
                    resultado.margemEfetiva >= config.metaMargem
                      ? 'default'
                      : 'destructive'
                  }
                >
                  {(resultado.margemEfetiva * 100).toFixed(1)}%
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={salvarNoHistorico}
            disabled={salvandoServico || servicoSalvo}
            variant={servicoSalvo ? 'outline' : 'default'}
            className="h-12 w-full text-base"
          >
            {salvandoServico ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
              </>
            ) : servicoSalvo ? (
              <>
                <Check className="mr-2 h-4 w-4" /> Serviço salvo no histórico
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" /> Salvar no histórico
              </>
            )}
          </Button>

          {/* ===== NAVEGAÇÃO ===== */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Navigation className="h-4 w-4" /> Navegar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                onClick={abrirWaze}
                className="h-12 w-full bg-[#33ccff] text-base text-black hover:bg-[#29b3e0]"
              >
                <Navigation className="mr-2 h-4 w-4" /> Waze até o embarque
              </Button>

              <Button
                onClick={abrirTrajetoCompleto}
                variant="outline"
                className="h-12 w-full text-base"
              >
                <MapPin className="mr-2 h-4 w-4" /> Trajeto completo (Maps)
              </Button>

              <p className="text-[11px] text-muted-foreground">
                O Waze traz apenas o próximo ponto (embarque). O Maps abre o
                trajeto todo: base → embarque → destino → retorno.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}