'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useServicos } from '@/store/servicos';
import { useLancamentos } from '@/store/lancamentos';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Wallet,
  Fuel,
} from 'lucide-react';

const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

type Periodo = 'mes' | 'tres' | 'ano' | 'tudo';

const PERIODOS: { key: Periodo; label: string }[] = [
  { key: 'mes', label: 'Este mês' },
  { key: 'tres', label: '3 meses' },
  { key: 'ano', label: 'Este ano' },
  { key: 'tudo', label: 'Tudo' },
];

export default function FinanceiroPage() {
  const { servicos, carregar: carregarServicos } = useServicos();
  const { lancamentos, carregar: carregarLancamentos } = useLancamentos();
  const [periodo, setPeriodo] = useState<Periodo>('mes');

  // Guard de hidratação: o corte de período depende do relógio do client
  const [montado, setMontado] = useState(false);
  const [corte, setCorte] = useState<number | null>(null);

  useEffect(() => {
    carregarServicos();
    carregarLancamentos();
  }, [carregarServicos, carregarLancamentos]);

  // Calcula o corte só no client, depois da hidratação
  useEffect(() => {
    const hoje = new Date();
    if (periodo === 'mes') {
      setCorte(new Date(hoje.getFullYear(), hoje.getMonth(), 1).getTime());
    } else if (periodo === 'tres') {
      setCorte(
        new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1).getTime(),
      );
    } else if (periodo === 'ano') {
      setCorte(new Date(hoje.getFullYear(), 0, 1).getTime());
    } else {
      setCorte(null);
    }
  }, [periodo]);

  useEffect(() => {
    setMontado(true);
  }, []);

  const dados = useMemo(() => {
    const dentro = (iso: string) =>
      corte === null ? true : new Date(iso).getTime() >= corte;

    const s = servicos.filter((x) => dentro(x.data_hora));
    const l = lancamentos.filter((x) => dentro(x.data + 'T12:00:00'));

    const receita = s.reduce((a, x) => a + Number(x.preco_cobrado), 0);
    const custoVar = s.reduce((a, x) => a + Number(x.custo_total), 0);
    const pedagio = s.reduce((a, x) => a + Number(x.pedagio ?? 0), 0);
    const estacionamento = s.reduce(
      (a, x) => a + Number(x.estacionamento ?? 0),
      0,
    );
    const despesa = l.reduce((a, x) => a + Number(x.valor), 0);

    const lucroBruto = receita - custoVar;
    const lucroLiquido = receita - custoVar - despesa;

    const km = s.reduce((a, x) => a + Number(x.km_total), 0);
    const horas = s.reduce(
      (a, x) => a + Number(x.horas_servico) + Number(x.horas_espera),
      0,
    );

    const porTipo = l.reduce<Record<string, number>>((acc, x) => {
      acc[x.tipo] = (acc[x.tipo] ?? 0) + Number(x.valor);
      return acc;
    }, {});

    return {
      receita,
      custoVar,
      pedagio,
      estacionamento,
      despesa,
      lucroBruto,
      lucroLiquido,
      km,
      horas,
      porTipo,
      qtd: s.length,
      lucroPorKm: km > 0 ? lucroLiquido / km : 0,
      lucroPorHora: horas > 0 ? lucroLiquido / horas : 0,
      margem: receita > 0 ? (lucroLiquido / receita) * 100 : 0,
    };
  }, [servicos, lancamentos, corte]);

  const rotulo: Record<string, string> = {
    gasolina: 'Gasolina',
    manutencao: 'Manutenção',
    lavagem: 'Lavagem',
    outro: 'Outro',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Financeiro</h1>
          <p className="text-xs text-muted-foreground">
            Faturamento, lucro e despesas
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {PERIODOS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriodo(p.key)}
            className={`rounded-lg border p-2 text-[11px] transition-colors ${
              periodo === p.key
                ? 'border-primary bg-primary/5 font-medium'
                : 'hover:bg-accent'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {!montado ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Calculando resultados...
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-primary/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Resultado do período</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5" /> Faturamento
                </span>
                <span className="font-semibold">{brl(dados.receita)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Fuel className="h-3.5 w-3.5" /> Custo dos serviços
                </span>
                <span className="text-destructive">
                  - {brl(dados.custoVar)}
                </span>
              </div>

              <div className="flex items-center justify-between pl-5 text-[11px] text-muted-foreground">
                <span>Pedágio no período</span>
                <span>{brl(dados.pedagio)}</span>
              </div>
              <div className="flex items-center justify-between pl-5 text-[11px] text-muted-foreground">
                <span>Estacionamento no período</span>
                <span>{brl(dados.estacionamento)}</span>
              </div>

              <div className="flex items-center justify-between border-t pt-1">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <TrendingDown className="h-3.5 w-3.5" /> Despesas lançadas
                </span>
                <span className="text-destructive">
                  - {brl(dados.despesa)}
                </span>
              </div>

              <Separator className="my-2" />

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 font-medium">
                  <Wallet className="h-3.5 w-3.5" /> Lucro líquido
                </span>
                <Badge
                  variant={dados.lucroLiquido >= 0 ? 'default' : 'destructive'}
                  className="text-sm"
                >
                  {brl(dados.lucroLiquido)}
                </Badge>
              </div>
              {dados.receita > 0 && (
                <p className="pt-1 text-[11px] text-muted-foreground">
                  Margem líquida: {dados.margem.toFixed(1)}%
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Indicadores</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Serviços</p>
                <p className="font-semibold">{dados.qtd}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Km rodados</p>
                <p className="font-semibold">{dados.km.toFixed(0)} km</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Lucro por km</p>
                <p className="font-semibold">{brl(dados.lucroPorKm)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Lucro por hora</p>
                <p className="font-semibold">{brl(dados.lucroPorHora)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Despesas por tipo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              {Object.keys(dados.porTipo).length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhuma despesa no período.
                </p>
              )}
              {Object.entries(dados.porTipo)
                .sort((a, b) => b[1] - a[1])
                .map(([tipo, valor]) => {
                  const pct =
                    dados.despesa > 0 ? (valor / dados.despesa) * 100 : 0;
                  return (
                    <div key={tipo}>
                      <div className="flex justify-between text-xs">
                        <span>{rotulo[tipo] ?? tipo}</span>
                        <span className="font-medium">{brl(valor)}</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
                        <div
                          className="h-1.5 rounded-full bg-primary"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </CardContent>
          </Card>

          <p className="rounded-md bg-muted/50 p-2 text-[11px] text-muted-foreground">
            Pedágio e estacionamento entram no custo de cada serviço, na tela
            Calcular. Não são lançados como despesa para não contar duas vezes.
          </p>

          <div className="grid grid-cols-2 gap-2">
            <Link href="/historico">
              <Button variant="outline" className="w-full">
                Histórico
              </Button>
            </Link>
            <Link href="/despesas">
              <Button variant="outline" className="w-full">
                Despesas
              </Button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}