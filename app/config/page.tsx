'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useConfig } from '@/store/config';
import { useVeiculoAtivo } from '@/store/veiculos';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Fuel,
  Percent,
  Save,
  Target,
  Trash2,
  TrendingUp,
} from 'lucide-react';

const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const dataBR = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function ConfigPage() {
  const {
    config,
    historico,
    registrarPreco,
    removerRegistro,
    setMetaMargem,
  } = useConfig();
  // Hook com referência estável — resolve o loop do getSnapshot
  const veiculo = useVeiculoAtivo();

  // Guard de hidratação: config e histórico vêm do localStorage
  const [montado, setMontado] = useState(false);

  const [gasolina, setGasolina] = useState('');
  const [etanol, setEtanol] = useState('');
  const [margemInput, setMargemInput] = useState('');

  const metaMargem = config.metaMargem ?? 0.3;

  useEffect(() => {
    setGasolina(String(config.precoGasolina ?? 6.1).replace('.', ','));
    setEtanol(String(config.precoEtanol ?? 4.2).replace('.', ','));
    setMargemInput(String(Math.round((config.metaMargem ?? 0.3) * 100)));
    setMontado(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const num = (s: string) => {
    const n = Number(s.replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? n : 0;
  };

  const salvar = () => {
    const g = num(gasolina);
    const e = num(etanol);
    if (g <= 0) return;
    registrarPreco(g, e > 0 ? e : config.precoEtanol ?? 4.2);
  };

  // Aplica a margem lendo direto do input (sem depender do blur)
  const aplicarMargem = (valorPct: number) => {
    const limitado = Math.min(60, Math.max(5, Math.round(valorPct)));
    setMargemInput(String(limitado));
    setMetaMargem(limitado / 100);
  };

  const ultimo = historico[0];
  const anterior = historico[1];
  const variacao =
    ultimo && anterior && anterior.precoGasolina > 0
      ? ((ultimo.precoGasolina - anterior.precoGasolina) /
          anterior.precoGasolina) *
        100
      : 0;

  const litroAtual =
    veiculo.combustivel === 'Etanol'
      ? config.precoEtanol ?? 4.2
      : config.precoGasolina ?? 6.1;

  const consumo = veiculo.consumo > 0 ? veiculo.consumo : 10;
  const custoPorKm = litroAtual / consumo;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Configurações</h1>
          <p className="text-xs text-muted-foreground">
            Combustível, margem de lucro e preferências
          </p>
        </div>
      </div>

      {/* ===== MARGEM DE LUCRO ===== */}
      <Card className="border-primary/40">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Percent className="h-4 w-4" /> Margem de lucro desejada
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!montado ? (
            <p className="text-xs text-muted-foreground">Carregando...</p>
          ) : (
            <>
              <div className="flex items-end justify-between gap-3">
                <div className="flex-1">
                  <Label className="text-xs">Percentual sobre a receita</Label>
                  <div className="mt-1 flex items-center gap-1">
                    <Input
                      inputMode="decimal"
                      value={margemInput}
                      onChange={(e) => {
                        const v = e.target.value;
                        setMargemInput(v);
                        const n = Number(v.replace(',', '.'));
                        if (Number.isFinite(n) && n > 0) {
                          setMetaMargem(Math.min(n, 95) / 100);
                        }
                      }}
                      onBlur={() => aplicarMargem(Number(margemInput) || 30)}
                      placeholder="30"
                      className="text-2xl font-bold"
                    />
                    <span className="text-2xl font-bold text-primary">%</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Lucro por R$ 100
                  </p>
                  <p className="text-lg font-semibold text-green-600">
                    {brl(metaMargem * 100)}
                  </p>
                </div>
              </div>

              <input
                type="range"
                min={5}
                max={60}
                step={1}
                value={Math.min(60, Math.max(5, Number(margemInput) || 30))}
                onChange={(e) => aplicarMargem(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary"
              />

              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>5%</span>
                <span>30%</span>
                <span>60%</span>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[0.15, 0.2, 0.3, 0.4].map((v) => (
                  <Button
                    key={v}
                    variant={
                      Math.abs(metaMargem - v) < 0.005 ? 'default' : 'outline'
                    }
                    size="sm"
                    onClick={() => aplicarMargem(v * 100)}
                  >
                    {(v * 100).toFixed(0)}%
                  </Button>
                ))}
              </div>

              <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                <p className="flex items-start gap-1.5">
                  <Target className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    Em cada serviço, o cálculo busca sobrar{' '}
                    <strong>{(metaMargem * 100).toFixed(0)}%</strong> de lucro
                    depois de todos os custos e impostos. De cada{' '}
                    <strong>R$ 100</strong> cobrados,{' '}
                    <strong>{brl(metaMargem * 100)}</strong> são lucro.
                  </span>
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ===== COMBUSTÍVEL ===== */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Fuel className="h-4 w-4" /> Preço do combustível
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Gasolina (R$/L)</Label>
              <Input
                inputMode="decimal"
                value={gasolina}
                onChange={(e) => setGasolina(e.target.value)}
                placeholder="6,10"
              />
            </div>
            <div>
              <Label className="text-xs">Etanol (R$/L)</Label>
              <Input
                inputMode="decimal"
                value={etanol}
                onChange={(e) => setEtanol(e.target.value)}
                placeholder="4,20"
              />
            </div>
          </div>

          <Button onClick={salvar} className="w-full">
            <Save className="mr-2 h-4 w-4" /> Registrar preço
          </Button>

          <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
            {!montado ? (
              <p>Carregando dados do veículo...</p>
            ) : (
              <>
                <p>
                  Seu veículo usa{' '}
                  <strong>
                    {veiculo.carroId ? veiculo.combustivel : 'não configurado'}
                  </strong>{' '}
                  · consumo <strong>{consumo} km/l</strong>
                </p>
                <p className="mt-1">
                  Custo por km: <strong>{brl(custoPorKm)}</strong>
                </p>
              </>
            )}
          </div>

          {montado && ultimo && (
            <p className="text-[11px] text-muted-foreground">
              Último registro: {dataBR(ultimo.data)}
              {variacao !== 0 && (
                <span
                  className={
                    variacao > 0 ? 'text-destructive' : 'text-green-600'
                  }
                >
                  {' '}
                  · {variacao > 0 ? '+' : ''}
                  {variacao.toFixed(1)}% vs anterior
                </span>
              )}
            </p>
          )}
        </CardContent>
      </Card>

      {/* ===== HISTÓRICO ===== */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" /> Histórico de preços
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {!montado && (
            <p className="text-xs text-muted-foreground">
              Carregando histórico...
            </p>
          )}

          {montado && historico.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Nenhum preço registrado ainda. Defina os valores acima e toque em
              Registrar preço.
            </p>
          )}

          {montado &&
            historico.map((h, i) => {
              const prox = historico[i + 1];
              const delta = prox
                ? ((h.precoGasolina - prox.precoGasolina) /
                    prox.precoGasolina) *
                  100
                : 0;

              return (
                <div
                  key={h.id}
                  className="flex items-center gap-2 rounded-md border p-2"
                >
                  <div className="flex-1">
                    <p className="text-xs font-medium">
                      Gasolina {brl(h.precoGasolina)} · Etanol{' '}
                      {brl(h.precoEtanol)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {dataBR(h.data)}
                      {i === 0 && ' · atual'}
                    </p>
                  </div>
                  {delta !== 0 && (
                    <Badge
                      variant={delta > 0 ? 'destructive' : 'secondary'}
                      className="text-[10px]"
                    >
                      {delta > 0 ? '+' : ''}
                      {delta.toFixed(1)}%
                    </Badge>
                  )}
                  {i !== 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => removerRegistro(h.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              );
            })}
        </CardContent>
      </Card>
    </div>
  );
}