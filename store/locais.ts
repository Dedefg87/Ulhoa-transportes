'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type LocalSalvo = {
  id: string;
  nome: string;
  lat: number;
  lon: number;
  usos: number;
  ultimoUso: number;
};

type StoreLocais = {
  locais: LocalSalvo[];
  adicionar: (local: Omit<LocalSalvo, 'id' | 'usos' | 'ultimoUso'>) => void;
  registrarUso: (id: string) => void;
  remover: (id: string) => void;
  maisUsados: (limite?: number) => LocalSalvo[];
};

export const useLocais = create<StoreLocais>()(
  persist(
    (set, get) => ({
      locais: [],

      adicionar: (local) => {
        const existente = get().locais.find(
          (l) => Math.abs(l.lat - local.lat) < 0.0001 && Math.abs(l.lon - local.lon) < 0.0001,
        );
        if (existente) {
          set({
            locais: get().locais.map((l) =>
              l.id === existente.id
                ? { ...l, usos: l.usos + 1, ultimoUso: Date.now() }
                : l,
            ),
          });
          return;
        }
        set({
          locais: [
            ...get().locais,
            {
              ...local,
              id: crypto.randomUUID(),
              usos: 1,
              ultimoUso: Date.now(),
            },
          ],
        });
      },

      registrarUso: (id) =>
        set({
          locais: get().locais.map((l) =>
            l.id === id ? { ...l, usos: l.usos + 1, ultimoUso: Date.now() } : l,
          ),
        }),

      remover: (id) => set({ locais: get().locais.filter((l) => l.id !== id) }),

      maisUsados: (limite = 5) =>
        [...get().locais]
          .sort((a, b) => b.usos - a.usos || b.ultimoUso - a.ultimoUso)
          .slice(0, limite),
    }),
    { name: 'app-rodrigo-locais' },
  ),
);