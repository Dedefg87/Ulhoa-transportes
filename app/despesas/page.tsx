'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLancamentos } from '@/store/lancamentos';
import type { TipoLancamento } from '@/types/banco';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  Fuel,
  Wrench,
  Droplets,
  Receipt,
} from 'lucide-react';

const TIPOS: { key: TipoLancamento; label: string; icone: any }[] = [
  { key: 'gasolina', label: 'Gasolina', icone: Fuel },
  { key: 'manutencao', label: 'Manutenção', icone: Wrench },
  { key: 'lavagem', label: 'Lavagem', icone: Droplets },
  { key: 'outro', label: 'Outro', icone: Receipt },
];

const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const hoje = () => new Date().toISOString().slice(0, 10);

export default function DespesasPage() {
  const { lancamentos, carregando, erro, carregar, salvar, remover } =
    useLancamentos();

  // Guard de hidratação: data e agregações usam o relógio do client
  const [montado, setMontado] = useState(false);

  const [aberto, setAberto] = useState(false);
  const [data, setData] = useState('');
  const [tipo, setTipo] = useState<TipoLancamento>('gasolina');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [litros, setLitros] = useState('');
  const [km, setKm] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Lê o relógio só no client, depois da hidratação
  useEffect(() => {
    setData(hoje());
    setMontado(true);
  }, []);

  const totalMes = montado
    ? lancamentos
        .filter((l) => l.data.slice(0, 7) === hoje().slice(0, 7))
        .reduce((s, l) => s + Number(l.valor), 0)
    : 0;

  const registrar = async () => {
    const v = Number(valor.replace(',', '.')) || 0;
    if (v <= 0) return;
    setSalvando(true);
    const id = await salvar({
      data,
      tipo,
      descricao: descricao.trim() || null,
      valor: v,
      litros: litros ? Number(litros.replace(',', '.')) : null,
      km_no_momento: km ? Number(km) : null,
    });
    setSalvando(false);
    if (id) {
      setDescricao('');
      setValor('');
      setLitros('');
      setKm('');
      setData(hoje());
      setAberto(false);
    }
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
          <h1 className="text-2xl font-bold">Despesas</h1>
          <p className="text-xs text-muted-foreground">
            Total do mês: {montado ? brl(totalMes) : '—'}
          </p>
        </div>
        <Button size="sm" onClick={() => setAberto((v) => !v)}>
          <Plus className="mr-1 h-4 w-4" /> Nova
        </Button>
      </div>

      {aberto && (
        <Card className="border-primary/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Nova despesa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Tipo</Label>
              <div className="mt-1 grid grid-cols-2 gap-2">
                {TIPOS.map((t) => {
                  const Icone = t.icone;
                  return (
                    <button
                      key={t.key}
                      onClick={() => setTipo(t.key)}
                      className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-[11px] transition-colors ${
                        tipo === t.key
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-accent'
                      }`}
                    >
                      <Icone className="h-4 w-4" />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Data</Label>
                <Input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">Valor (R$)</Label>
                <Input
                  inputMode="decimal"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  placeholder="0,00"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Descrição</Label>
              <Input
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Posto Shell, troca de óleo..."
              />
            </div>

            {tipo === 'gasolina' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Litros</Label>
                  <Input
                    inputMode="decimal"
                    value={litros}
                    onChange={(e) => setLitros(e.target.value)}
                    placeholder="0,000"
                  />
                </div>
                <div>
                  <Label className="text-xs">Km no momento</Label>
                  <Input
                    inputMode="numeric"
                    value={km}
                    onChange={(e) => setKm(e.target.value)}
                    placeholder="45000"
                  />
                </div>
              </div>
            )}

            {tipo === 'manutencao' && (
              <div>
                <Label className="text-xs">Km no momento</Label>
                <Input
                  inputMode="numeric"
                  value={km}
                  onChange={(e) => setKm(e.target.value)}
                  placeholder="45000"
                />
              </div>
            )}

            <p className="rounded-md bg-muted/50 p-2 text-[11px] text-muted-foreground">
              Pedágio e estacionamento são lançados em cada serviço, na tela
              Calcular.
            </p>

            <div className="flex gap-2">
              <Button
                onClick={registrar}
                disabled={salvando || Number(valor.replace(',', '.')) <= 0}
                className="flex-1"
              >
                {salvando ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Salvar'
                )}
              </Button>
              <Button variant="outline" onClick={() => setAberto(false)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {erro && (
        <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
          {erro}
        </div>
      )}

      {carregando && lancamentos.length === 0 && (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando...
        </div>
      )}

      {montado && !carregando && lancamentos.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma despesa lançada.
            <br />
            Toque em <strong>Nova</strong> para começar.
          </CardContent>
        </Card>
      )}

      {montado &&
        lancamentos.map((l) => {
          const cfg = TIPOS.find((t) => t.key === l.tipo);
          const Icone = cfg?.icone ?? Receipt;
          return (
            <Card key={l.id}>
              <CardContent className="flex items-center gap-3 py-3">
                <Icone className="h-4 w-4 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{cfg?.label ?? l.tipo}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(l.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                    {l.descricao ? ` · ${l.descricao}` : ''}
                    {l.litros ? ` · ${l.litros} L` : ''}
                  </p>
                </div>
                <Badge variant="secondary">{brl(Number(l.valor))}</Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => remover(l.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
    </div>
  );
}