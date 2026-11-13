'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { useServicos } from '@/store/servicos';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, Trash2, MapPin } from 'lucide-react';

const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function HistoricoPage() {
  const { servicos, carregando, erro, carregar, remover } = useServicos();

  useEffect(() => {
    carregar();
  }, [carregar]);

  const total = servicos.reduce((s, x) => s + Number(x.preco_cobrado), 0);
  const lucroTotal = servicos.reduce((s, x) => s + Number(x.lucro), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Histórico</h1>
          <p className="text-xs text-muted-foreground">
            {servicos.length} serviço{servicos.length === 1 ? '' : 's'} ·
            receita {brl(total)} · lucro {brl(lucroTotal)}
          </p>
        </div>
      </div>

      {erro && (
        <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
          {erro}
        </div>
      )}

      {carregando && servicos.length === 0 && (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando...
        </div>
      )}

      {!carregando && servicos.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Nenhum serviço salvo ainda.
            <br />
            Calcule um serviço e toque em{' '}
            <strong>Salvar no histórico</strong>.
          </CardContent>
        </Card>
      )}

      {servicos.map((s) => (
        <Card key={s.id}>
          <CardContent className="space-y-2 py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="text-sm font-semibold">
                  {s.clientes?.nome ?? 'Avulso'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(s.data_hora).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <Badge>{brl(Number(s.preco_cobrado))}</Badge>
            </div>

            <div className="space-y-0.5 text-xs text-muted-foreground">
              <p className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {s.endereco_embarque} →{' '}
                {s.endereco_destino}
              </p>
              <p>
                {s.km_total} km · {Number(s.horas_servico).toFixed(1)}h serviço ·{' '}
                {Number(s.horas_espera).toFixed(1)}h espera
              </p>
            </div>

            <div className="flex items-center justify-between border-t pt-2 text-xs">
              <span className="text-muted-foreground">
                Custo {brl(Number(s.custo_total))}
              </span>
              <span className="font-semibold text-primary">
                Lucro {brl(Number(s.lucro))}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive"
                onClick={() => remover(s.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}