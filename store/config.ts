'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Config } from '@/types';

export interface PrecoCombustivel {
  id: string;
  data: string;
  precoGasolina: number;
  precoEtanol: number;
}

interface ConfigStore {
  config: Config;
  historico: PrecoCombustivel[];
  setConfig: (patch: Partial<Config>) => void;
  setPrecoGasolina: (v: number) => void;
  setPrecoEtanol: (v: number) => void;
  registrarPreco: (gasolina: number, etanol: number) => void;
  removerRegistro: (id: string) => void;
  setMetaMargem: (v: number) => void;
}

const INICIAL: Config = {
  precoGasolina: 6.1,
  precoEtanol: 4.2,
  dataAtualizacaoCombustivel: new Date().toISOString(),
  metaMargem: 0.3,
  appNavegacao: 'perguntar',
  horasProdutivasMes: 180,
  impostosPercentual: 0.06,
};

export const useConfig = create<ConfigStore>()(
  persist(
    (set) => ({
      config: INICIAL,
      historico: [],

      setConfig: (patch) =>
        set((s) => ({ config: { ...s.config, ...patch } })),

      setPrecoGasolina: (v) =>
        set((s) => ({
          config: {
            ...s.config,
            precoGasolina: v,
            dataAtualizacaoCombustivel: new Date().toISOString(),
          },
        })),

      setPrecoEtanol: (v) =>
        set((s) => ({
          config: {
            ...s.config,
            precoEtanol: v,
            dataAtualizacaoCombustivel: new Date().toISOString(),
          },
        })),

      registrarPreco: (gasolina, etanol) => {
        const registro: PrecoCombustivel = {
          id: `${Date.now()}`,
          data: new Date().toISOString(),
          precoGasolina: gasolina,
          precoEtanol: etanol,
        };
        set((s) => ({
          config: {
            ...s.config,
            precoGasolina: gasolina,
            precoEtanol: etanol,
            dataAtualizacaoCombustivel: registro.data,
          },
          historico: [registro, ...s.historico].slice(0, 100),
        }));
      },

      removerRegistro: (id) =>
        set((s) => ({ historico: s.historico.filter((h) => h.id !== id) })),

      setMetaMargem: (v) =>
        set((s) => ({ config: { ...s.config, metaMargem: v } })),
    }),
    {
      name: 'rodrigo-config',
      version: 2,
      migrate: (persisted: any) => {
        const antigo = persisted?.config ?? {};
        return {
          config: { ...INICIAL, ...antigo },
          historico: persisted?.historico ?? [],
        };
      },
    },
  ),
);