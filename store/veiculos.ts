'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useMemo } from 'react';
import type { Veiculo, VeiculoSalvo, CategoriaVeiculo } from '@/types';

interface VeiculosStore {
  veiculos: VeiculoSalvo[];
  ativoId: string | null;

  adicionar: (v: Omit<VeiculoSalvo, 'id' | 'criadoEm'>) => string;
  atualizar: (id: string, patch: Partial<VeiculoSalvo>) => void;
  remover: (id: string) => void;
  definirAtivo: (id: string) => void;
  atualizarAtivo: (patch: Partial<VeiculoSalvo>) => void;

  /** Mantido apenas por compatibilidade. Prefira useVeiculoAtivo(). */
  veiculoAtivo: () => Veiculo;
}

const VAZIO: Veiculo = {
  carroId: null,
  marca: '',
  modelo: '',
  ano: null,
  versao: '',
  combustivel: 'Flex',
  consumo: 10,
  valorFipe: 0,
  valorRevendaEsperado: 0,
  kmPrevistosAteRevenda: 120000,
  kmAtual: 0,
  kmPorMes: 3000,
  proprio: true,
};

const novoId = () =>
  `v_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const useVeiculos = create<VeiculosStore>()(
  persist(
    (set, get) => ({
      veiculos: [],
      ativoId: null,

      adicionar: (v) => {
        const id = novoId();
        const novo: VeiculoSalvo = {
          ...v,
          id,
          criadoEm: new Date().toISOString(),
        };
        set((s) => ({
          veiculos: [...s.veiculos, novo],
          ativoId: s.ativoId ?? id,
        }));
        return id;
      },

      atualizar: (id, patch) =>
        set((s) => ({
          veiculos: s.veiculos.map((v) =>
            v.id === id ? { ...v, ...patch } : v,
          ),
        })),

      remover: (id) =>
        set((s) => {
          const restantes = s.veiculos.filter((v) => v.id !== id);
          return {
            veiculos: restantes,
            ativoId:
              s.ativoId === id ? (restantes[0]?.id ?? null) : s.ativoId,
          };
        }),

      definirAtivo: (id) => set({ ativoId: id }),

      atualizarAtivo: (patch) => {
        const id = get().ativoId;
        if (!id) return;
        get().atualizar(id, patch);
      },

      veiculoAtivo: () => {
        const { veiculos, ativoId } = get();
        const v = veiculos.find((x) => x.id === ativoId) ?? veiculos[0];
        if (!v) return VAZIO;
        return {
          carroId: v.carroId,
          marca: v.marca,
          modelo: v.modelo,
          ano: v.ano,
          versao: v.versao,
          combustivel: v.combustivel,
          consumo: v.consumo,
          valorFipe: v.valorFipe,
          valorRevendaEsperado: v.valorRevendaEsperado,
          kmPrevistosAteRevenda: v.kmPrevistosAteRevenda,
          kmAtual: v.kmAtual,
          kmPorMes: v.kmPorMes,
          proprio: v.proprio,
          aluguelMensal: v.aluguelMensal,
          franquiaKmMes: v.franquiaKmMes,
          custoKmExcedente: v.custoKmExcedente,
        };
      },
    }),
    {
      name: 'rodrigo-veiculos',
      version: 2,
      migrate: (persisted: any) => {
        if (persisted?.veiculos?.length) return persisted;

        try {
          const bruto = localStorage.getItem('rodrigo-veiculo');
          if (bruto) {
            const antigo = JSON.parse(bruto)?.state?.veiculo;
            if (antigo && (antigo.marca || antigo.modelo)) {
              const id = novoId();
              const salvo: VeiculoSalvo = {
                ...VAZIO,
                ...antigo,
                id,
                apelido: `${antigo.modelo || 'Veículo'} ${antigo.ano ?? ''}`.trim(),
                criadoEm: new Date().toISOString(),
                consumoEstimado: false,
                categoria: 'Executivo' as CategoriaVeiculo,
              };
              return { veiculos: [salvo], ativoId: id };
            }
          }
        } catch {
          /* ignora */
        }

        return { veiculos: [], ativoId: null };
      },
    },
  ),
);

export const VEICULO_VAZIO: Veiculo = VAZIO;

/**
 * Hook de veículo ativo com referência estável.
 * Resolve: "The result of getServerSnapshot should be cached to avoid an infinite loop"
 */
export function useVeiculoAtivo(): Veiculo {
  const veiculos = useVeiculos((s) => s.veiculos);
  const ativoId = useVeiculos((s) => s.ativoId);

  return useMemo(() => {
    const v = veiculos.find((x) => x.id === ativoId) ?? veiculos[0];
    if (!v) return VAZIO;
    return {
      carroId: v.carroId,
      marca: v.marca,
      modelo: v.modelo,
      ano: v.ano,
      versao: v.versao,
      combustivel: v.combustivel,
      consumo: v.consumo,
      valorFipe: v.valorFipe,
      valorRevendaEsperado: v.valorRevendaEsperado,
      kmPrevistosAteRevenda: v.kmPrevistosAteRevenda,
      kmAtual: v.kmAtual,
      kmPorMes: v.kmPorMes,
      proprio: v.proprio,
      aluguelMensal: v.aluguelMensal,
      franquiaKmMes: v.franquiaKmMes,
      custoKmExcedente: v.custoKmExcedente,
    };
  }, [veiculos, ativoId]);
}