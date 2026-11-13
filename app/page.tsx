'use client';
import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useVeiculoAtivo } from '@/store/veiculos';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Calculator,
  Users,
  Server,
  ArrowRight,
  History,
  Receipt,
  Wallet,
} from 'lucide-react';

export default function Home() {
  // Hook com referência estável — resolve o loop do getServerSnapshot
  const veiculo = useVeiculoAtivo();

  // Guard de hidratação: o servidor não vê o localStorage
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    setMontado(true);
  }, []);

  const veiculoOk = veiculo.carroId !== null && veiculo.valorFipe > 0;

  // Memoizado: array de configuração não precisa ser recriado a cada render
  const itens = useMemo(
    () => [
      {
        href: '/calcular',
        icon: Calculator,
        titulo: 'Calcular serviço',
        sub: 'Rota, custo e preço a cobrar',
      },
      {
        href: '/historico',
        icon: History,
        titulo: 'Histórico',
        sub: 'Serviços realizados',
      },
      {
        href: '/despesas',
        icon: Receipt,
        titulo: 'Despesas',
        sub: 'Gasolina, manutenção, lavagem',
      },
      {
        href: '/financeiro',
        icon: Wallet,
        titulo: 'Financeiro',
        sub: 'Faturamento e lucro líquido',
      },
      {
        href: '/clientes',
        icon: Users,
        titulo: 'Clientes',
        sub: 'Cadastro e contatos',
      },
      {
        href: '/veiculo',
        icon: Server,
        titulo: 'Meus veículos',
        sub: 'FIPE, consumo e depreciação',
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      {/* Capa: logo centralizada */}
      <div className="flex flex-col items-center gap-2 pb-2 pt-1">
        <div className="relative h-28 w-28 overflow-hidden rounded-full ring-2 ring-border">
          <Image
            src="/icons/logo.jpg"
            alt="Ulhôa Transporte Executivo"
            fill
            sizes="112px"
            className="object-cover"
            priority
          />
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Custo real, preço justo e lucro por serviço
        </p>
      </div>

      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                {!montado
                  ? 'Verificando veículo...'
                  : veiculoOk
                    ? 'Veículo configurado'
                    : 'Veículo pendente'}
              </p>
              <p className="text-xs text-muted-foreground">
                {!montado
                  ? 'Carregando dados salvos no aparelho'
                  : veiculoOk
                    ? `${veiculo.modelo} · ${veiculo.consumo.toFixed(1)} km/l`
                    : 'Cadastre o veículo para liberar o cálculo'}
              </p>
            </div>
            <Badge
              variant={
                !montado ? 'secondary' : veiculoOk ? 'default' : 'destructive'
              }
            >
              {!montado ? '...' : veiculoOk ? 'OK' : 'Pendente'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {itens.map(({ href, icon: Icone, titulo, sub }) => (
        <Link key={href} href={href}>
          <Card className="cursor-pointer transition-colors hover:bg-accent">
            <CardContent className="flex items-center gap-3 py-4">
              <Icone className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">{titulo}</p>
                <p className="text-xs text-muted-foreground">{sub}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}