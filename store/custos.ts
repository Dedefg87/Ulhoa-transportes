'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CustosFixos, CustosVariaveis } from '@/types';

interface CustosStore {
  fixos: CustosFixos;
  variaveis: CustosVariaveis;
  setFixos: (patch: Partial<CustosFixos>) => void;
  setVariaveis: (patch: Partial<CustosVariaveis>) => void;
}

export const useCustos = create<CustosStore>()(
  persist(
    (set) => ({
      fixos: {
        garagem: 0, seguro: 0, ipvaLicenciamento: 0, celular: 0,
        contadorMei: 0, reservaManutencao: 0, software: 0, outros: 0,
      },
      variaveis: {
        manutencaoPorKm: 0.18, lavagemPorKm: 0.04, esteticaPorKm: 0.01, outrosPorKm: 0,
      },
      setFixos: (patch) => set((s) => ({ fixos: { ...s.fixos, ...patch } })),
      setVariaveis: (patch) => set((s) => ({ variaveis: { ...s.variaveis, ...patch } })),
    }),
    { name: 'rodrigo-custos' },
  ),
);