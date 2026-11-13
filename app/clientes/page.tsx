'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useClientes } from '@/store/clientes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Plus,
  Trash2,
  Building2,
  Phone,
  Mail,
  ArrowLeft,
  Loader2,
} from 'lucide-react';

export default function ClientesPage() {
  const { clientes, carregando, erro, carregar, adicionar, remover } =
    useClientes();

  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const salvar = async () => {
    if (!nome.trim()) return;
    setSalvando(true);
    const novo = await adicionar({ nome, empresa, telefone, email });
    setSalvando(false);

    if (novo) {
      setNome('');
      setEmpresa('');
      setTelefone('');
      setEmail('');
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
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-xs text-muted-foreground">
            {clientes.length} cadastrado{clientes.length === 1 ? '' : 's'}
          </p>
        </div>
        <Button size="sm" onClick={() => setAberto((v) => !v)}>
          <Plus className="mr-1 h-4 w-4" /> Novo
        </Button>
      </div>

      {aberto && (
        <Card className="border-primary/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Novo cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Nome *</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Empresa</Label>
              <Input
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Telefone</Label>
                <Input
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  inputMode="tel"
                />
              </div>
              <div>
                <Label className="text-xs">E-mail</Label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  inputMode="email"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={salvar}
                disabled={salvando || !nome.trim()}
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

      {carregando && clientes.length === 0 && (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando...
        </div>
      )}

      {!carregando && clientes.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Nenhum cliente cadastrado ainda.
            <br />
            Toque em <strong>Novo</strong> para começar.
          </CardContent>
        </Card>
      )}

      {clientes.map((c) => (
        <Card key={c.id}>
          <CardContent className="space-y-2 py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="font-semibold">{c.nome}</p>
                {c.empresa && (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Building2 className="h-3 w-3" /> {c.empresa}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive"
                onClick={() => remover(c.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            {(c.telefone || c.email) && <Separator />}

            {c.telefone && (
              <a
                href={`tel:${c.telefone}`}
                className="flex items-center gap-1 text-xs text-primary"
              >
                <Phone className="h-3 w-3" /> {c.telefone}
              </a>
            )}
            {c.email && (
              <a
                href={`mailto:${c.email}`}
                className="flex items-center gap-1 text-xs text-primary"
              >
                <Mail className="h-3 w-3" /> {c.email}
              </a>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}