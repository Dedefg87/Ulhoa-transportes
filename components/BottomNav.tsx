'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calculator, Car, Settings, Home } from 'lucide-react';

const ITENS = [
  { href: '/', label: 'Início', Icon: Home },
  { href: '/veiculo', label: 'Veículo', Icon: Car },
  { href: '/calcular', label: 'Calcular', Icon: Calculator },
  { href: '/config', label: 'Config', Icon: Settings },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-md items-center justify-around py-2">
        {ITENS.map(({ href, label, Icon }) => {
          const ativo = path === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-1 py-1 text-xs ${
                ativo ? 'text-primary font-medium' : 'text-muted-foreground'
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}