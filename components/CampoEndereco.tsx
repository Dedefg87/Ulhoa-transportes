'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Ponto } from '@/lib/rotas';
import { Loader2, MapPin } from 'lucide-react';

type Sugestao = Ponto & { id: string };

type Props = {
  valor: string;
  onChange: (texto: string) => void;
  onSelecionar: (ponto: Ponto | null) => void;
  placeholder?: string;
};

export function CampoEndereco({ valor, onChange, onSelecionar, placeholder }: Props) {
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [aberto, setAberto] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const [montado, setMontado] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    setMontado(true);
  }, []);

  const medir = () => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({
      top: r.bottom + window.scrollY + 4,
      left: r.left + window.scrollX,
      width: r.width,
    });
  };

  useLayoutEffect(() => {
    if (!aberto) return;
    medir();
    const fechar = () => setAberto(false);
    window.addEventListener('scroll', fechar, true);
    window.addEventListener('resize', fechar);
    return () => {
      window.removeEventListener('scroll', fechar, true);
      window.removeEventListener('resize', fechar);
    };
  }, [aberto]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);

    const texto = valor.trim();
    if (texto.length < 4) {
      setSugestoes([]);
      setAberto(false);
      return;
    }

    timer.current = setTimeout(async () => {
      const minha = ++seq.current;
      setBuscando(true);
      try {
        const resp = await fetch(`/api/enderecos?q=${encodeURIComponent(texto)}`);
        const dados = (await resp.json()) as Sugestao[];
        if (minha !== seq.current) return;
        setSugestoes(dados);
        if (dados.length > 0) {
          medir();
          setAberto(true);
        } else {
          setAberto(false);
        }
      } catch {
        if (minha === seq.current) setSugestoes([]);
      } finally {
        if (minha === seq.current) setBuscando(false);
      }
    }, 450);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [valor]);

  const escolher = (s: Sugestao) => {
    onChange(s.label);
    onSelecionar({ lat: s.lat, lon: s.lon, label: s.label });
    setAberto(false);
  };

  const lista =
    aberto && sugestoes.length > 0 && montado
      ? createPortal(
          <div
            style={{
              position: 'absolute',
              top: pos.top,
              left: pos.left,
              width: pos.width,
              zIndex: 9999,
            }}
            className="max-h-64 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-xl"
          >
            {sugestoes.map((s) => (
              <button
                key={s.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => escolher(s)}
                className="flex w-full items-start gap-2 border-b px-3 py-2 text-left text-xs last:border-b-0 hover:bg-accent"
              >
                <MapPin className="mt-0.5 h-3 w-3 flex-shrink-0 text-muted-foreground" />
                <span className="line-clamp-2">{s.label}</span>
              </button>
            ))}
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="relative">
      <input
        ref={inputRef}
        value={valor}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          onSelecionar(null);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && sugestoes.length > 0) {
            e.preventDefault();
            escolher(sugestoes[0]);
          }
          if (e.key === 'Escape') setAberto(false);
        }}
        onBlur={() => setTimeout(() => setAberto(false), 180)}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />

      {buscando && (
        <Loader2 className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}

      {lista}
    </div>
  );
}