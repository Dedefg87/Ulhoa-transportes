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
} from '@/lib/combustivel';
import { useClientes } from '@/store/clientes';
import { useServicos } from '@/store/servicos';
import {
  pegarLocalizacaoAtual,
  geocodificar,
  calcularRotaCompleta,
  linkWaze,
  formatarDuracao,
  cenarioPorHorario,
  FATORES_TRANSITO,
  type Ponto,
  type CenarioTransito,
  type RotaCompleta,
} from '@/lib/rotas';
import type { EntradaServico } from '@/types';
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
} from 'lucide-react';

const ESPERA_POR_PASSAGEIRO_MIN = 10;

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
  const [resultado, setResultado] = useState<any>(null);
  const [rotaInfo, setRotaInfo] = useState<any>(null);

  const [previaRota, setPreviaRota] = useState<RotaCompleta | null>(null);
  const [calculandoPrevia, setCalculandoPrevia] = useState(false);

  const [horasAuto, setHorasAuto] = useState(false);
  const [clienteId, setClienteId] = useState('');
  const [servicoSalvo, setServicoSalvo] = useState(false);
  const [salvandoServico, setSalvandoServico] = useState(false);

  const top5 = useMemo(() => maisUsados(5), [maisUsados]);

  const veiculoValido = veiculo.carroId !== null && veiculo.valorFipe > 0;
  const pontosProntos =
    !!atual && !!pontoEmb && !!pontoDest && !!pontoRet;

  useEffect(() => {
    carregarClientes();
  }, [carregarClientes]);

  // Marca como montado e lê o horário — só no client, após hidratação
  useEffect(() => {
    setMontado(true);
    setCenario(cenarioPorHorario());
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

        const horasServicoCalc = rota.segundosComMargem / 3600;
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

  const calcular = async () => {
    setErro(null);
    setResultado(null);
    setRotaInfo(null);
    setServicoSalvo(false);

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

      const entrada: EntradaServico = {
        kmServico: rota.kmTotal,
        kmAteEmbarque: 0,
        kmRetornoBase: 0,
        horasServico: Number(horasServico) || 0,
        horasEspera: Number(horasEspera) || 0,
        horasDeslocamento: rota.segundosComMargem / 3600,
        pedagio: Number(pedagio) || 0,
        estacionamento: Number(estacionamento) || 0,
        agenciaPercentual: 0,
      };

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

  const salvarNoHistorico = async () => {
    if (!resultado || !rotaInfo) return;
    setSalvandoServico(true);

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
      preco_cobrado: resultado.precoComercial,
      lucro: resultado.lucro,
      margem: resultado.margemEfetiva,
      pedagio: Number(pedagio) || 0,
      estacionamento: Number(estacionamento) || 0,
      observacoes: null,
    });

    setSalvandoServico(false);
    if (id) setServicoSalvo(true);
  };

  const abrirWaze = () => {
    if (!rotaInfo || !atual) return;
    const url = linkWaze(rotaInfo.pDest, atual);
    window.open(url, '_blank');
  };

  const brl = (v: number) =>
    (Number.isFinite(v) ? v : 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });

  const kmViagem = rotaInfo?.rota?.kmTotal ?? 0;
  const litros = litrosDaViagem(kmViagem, veiculo);
  const custoComb = custoCombustivelViagem(kmViagem, veiculo, config);

  const horasServicoNum = Number(horasServico) || 0;
  const horasEsperaNum = Number(horasEspera) || 0;
  const horasTotal = horasServicoNum + horasEsperaNum;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Calcular serviço</h1>
        <p className="text-sm text-muted-foreground">
          Preencha os pontos e o app busca a rota
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
          {/* Guard de hidratação: só renderiza depois de montar no client */}
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
            <span className="text-muted-foreground">Rota encontrada</span>
            <span className="font-semibold">
              {previaRota.kmTotal} km ·{' '}
              {formatarDuracao(previaRota.segundosComMargem)}
            </span>
          </div>
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>Combustível previsto</span>
            <span>
              {litrosDaViagem(previaRota.kmTotal, veiculo).toFixed(1)} L ·{' '}
              {brl(custoCombustivelViagem(previaRota.kmTotal, veiculo, config))}
            </span>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-base">
            <span>5. Tempo e extras</span>
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
              Horas calculadas pela rota ({passageiros} passageiro
              {Number(passageiros) > 1 ? 's' : ''} ×{' '}
              {ESPERA_POR_PASSAGEIRO_MIN} min por parada). Pedágio e
              estacionamento são seus — a rota gratuita não informa esses
              valores.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">6. Trânsito previsto</CardTitle>
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
          <CardTitle className="text-base">7. Cliente do serviço</CardTitle>
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
              <CardTitle className="text-base">Trajeto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Distância</span>
                <span className="font-semibold">
                  {rotaInfo.rota.kmTotal} km
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tempo estimado</span>
                <span className="font-semibold">
                  {formatarDuracao(rotaInfo.rota.segundosComMargem)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cenário</span>
                <span>{FATORES_TRANSITO[cenario].label}</span>
              </div>
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
                  veiculo.combustivel === 'Etanol'
                    ? config.precoEtanol ?? 4.2
                    : config.precoGasolina ?? 6.1,
                )}`}
                valor={brl(custoComb)}
                destaque
              />
              <Linha
                label="Consumo do veículo"
                valor={`${veiculo.consumo > 0 ? veiculo.consumo : 10} km/l`}
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
                label="Trajeto (rota)"
                valor={horasParaTexto(horasServicoNum)}
              />
              <Linha
                label="Espera nos passageiros"
                valor={horasParaTexto(horasEsperaNum)}
              />
              <Separator className="my-2" />
              <Linha
                label="Total cobrado em tempo"
                valor={horasParaTexto(horasTotal)}
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

          <Button
            onClick={abrirWaze}
            className="h-12 w-full bg-[#33ccff] text-base text-black hover:bg-[#29b3e0]"
          >
            <Navigation className="mr-2 h-4 w-4" /> Abrir no Waze
          </Button>
        </>
      )}
    </div>
  );
}