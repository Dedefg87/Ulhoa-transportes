'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import type { Cliente } from '@/types/banco';

type NovoCliente = {
  nome: string;
  empresa?: string;
  telefone?: string;
  email?: string;
  observacoes?: string;
};

type Estado = {
  clientes: Cliente[];
  carregando: boolean;
  erro: string | null;
  carregar: () => Promise<void>;
  adicionar: (dados: NovoCliente) => Promise<Cliente | null>;
  remover: (id: string) => Promise<boolean>;
};

export const useClientes = create<Estado>()(
  persist(
    (set, get) => ({
      clientes: [],
      carregando: false,
      erro: null,

      carregar: async () => {
        set({ carregando: true, erro: null });
        const { data, error } = await supabase
          .from('clientes')
          .select('*')
          .order('nome');

        if (error) {
          set({ erro: error.message, carregando: false });
          return;
        }
        set({ clientes: (data ?? []) as Cliente[], carregando: false });
      },

      adicionar: async (dados) => {
        const { data, error } = await supabase
          .from('clientes')
          .insert({
            nome: dados.nome,
            empresa: dados.empresa ?? null,
            telefone: dados.telefone ?? null,
            email: dados.email ?? null,
            observacoes: dados.observacoes ?? null,
          })
          .select()
          .single();

        if (error || !data) {
          set({ erro: error?.message ?? 'Erro ao salvar cliente' });
          return null;
        }

        const novo = data as Cliente;
        set({ clientes: [...get().clientes, novo] });
        return novo;
      },

      remover: async (id) => {
        const { error } = await supabase.from('clientes').delete().eq('id', id);
        if (error) {
          set({ erro: error.message });
          return false;
        }
        set({ clientes: get().clientes.filter((c) => c.id !== id) });
        return true;
      },
    }),
    { name: 'precifica-clientes' },
  ),
);