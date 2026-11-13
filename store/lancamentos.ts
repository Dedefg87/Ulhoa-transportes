'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import type { Lancamento } from '@/types/banco';

export type TipoLancamento =
  | 'gasolina'
  | 'manutencao'
  | 'lavagem'
  | 'pedagio'
  | 'estacionamento'
  | 'outro';

type NovoLancamento = {
  data: string;
  tipo: TipoLancamento;
  descricao?: string | null;
  valor: number;
  km_no_momento?: number | null;
  litros?: number | null;
};

type Estado = {
  lancamentos: Lancamento[];
  carregando: boolean;
  erro: string | null;
  carregar: () => Promise<void>;
  salvar: (dados: NovoLancamento) => Promise<string | null>;
  remover: (id: string) => Promise<boolean>;
};

export const useLancamentos = create<Estado>()(
  persist(
    (set, get) => ({
      lancamentos: [],
      carregando: false,
      erro: null,

      carregar: async () => {
        set({ carregando: true, erro: null });
        const { data, error } = await supabase
          .from('lancamentos')
          .select('*')
          .order('data', { ascending: false });

        if (error) {
          set({ erro: error.message, carregando: false });
          return;
        }
        set({ lancamentos: (data ?? []) as Lancamento[], carregando: false });
      },

      salvar: async (dados) => {
        const { data, error } = await supabase
          .from('lancamentos')
          .insert({
            data: dados.data,
            tipo: dados.tipo,
            descricao: dados.descricao ?? null,
            valor: dados.valor,
            km_no_momento: dados.km_no_momento ?? null,
            litros: dados.litros ?? null,
          })
          .select('id')
          .single();

        if (error || !data) {
          set({ erro: error?.message ?? 'Erro ao salvar lançamento' });
          return null;
        }
        await get().carregar();
        return data.id as string;
      },

      remover: async (id) => {
        const { error } = await supabase.from('lancamentos').delete().eq('id', id);
        if (error) {
          set({ erro: error.message });
          return false;
        }
        set({ lancamentos: get().lancamentos.filter((l) => l.id !== id) });
        return true;
      },
    }),
    { name: 'precifica-lancamentos' },
  ),
);