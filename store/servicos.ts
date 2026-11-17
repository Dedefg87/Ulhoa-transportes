'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import type { ServicoComCliente } from '@/types/banco';

type NovoServico = Omit<
  ServicoComCliente,
  'id' | 'criado_em' | 'data_hora' | 'clientes'
> & {
  data_hora?: string;
  /** Combustível usado no serviço — opcional para bases antigas */
  combustivel?: 'Gasolina' | 'Etanol';
};

type Estado = {
  servicos: ServicoComCliente[];
  carregando: boolean;
  erro: string | null;
  carregar: (limite?: number) => Promise<void>;
  salvar: (dados: NovoServico) => Promise<string | null>;
  remover: (id: string) => Promise<boolean>;
};

export const useServicos = create<Estado>()(
  persist(
    (set, get) => ({
      servicos: [],
      carregando: false,
      erro: null,

      carregar: async (limite = 200) => {
        set({ carregando: true, erro: null });
        const { data, error } = await supabase
          .from('servicos')
          .select('*, clientes(nome, empresa)')
          .order('data_hora', { ascending: false })
          .limit(limite);

        if (error) {
          set({ erro: error.message, carregando: false });
          return;
        }
        set({
          servicos: (data ?? []) as ServicoComCliente[],
          carregando: false,
        });
      },

      salvar: async (dados) => {
        const base = {
          data_hora: dados.data_hora ?? new Date().toISOString(),
          cliente_id: dados.cliente_id,
          endereco_embarque: dados.endereco_embarque,
          endereco_destino: dados.endereco_destino,
          endereco_retorno: dados.endereco_retorno,
          lat_embarque: dados.lat_embarque,
          lon_embarque: dados.lon_embarque,
          lat_destino: dados.lat_destino,
          lon_destino: dados.lon_destino,
          lat_retorno: dados.lat_retorno,
          lon_retorno: dados.lon_retorno,
          km_total: dados.km_total,
          horas_servico: dados.horas_servico,
          horas_espera: dados.horas_espera,
          cenario_transito: dados.cenario_transito,
          custo_total: dados.custo_total,
          preco_cobrado: dados.preco_cobrado,
          lucro: dados.lucro,
          margem: dados.margem,
          pedagio: dados.pedagio,
          estacionamento: dados.estacionamento,
          observacoes: dados.observacoes,
        };

        // 1ª tentativa: com a coluna `combustivel`
        let resp = await supabase
          .from('servicos')
          .insert({ ...base, combustivel: dados.combustivel ?? 'Gasolina' })
          .select('id')
          .single();

        // Fallback: base sem a coluna — salva sem ela
        if (resp.error && /combustivel/i.test(resp.error.message ?? '')) {
          resp = await supabase
            .from('servicos')
            .insert(base)
            .select('id')
            .single();
        }

        if (resp.error || !resp.data) {
          set({ erro: resp.error?.message ?? 'Erro ao salvar serviço' });
          return null;
        }

        await get().carregar();
        return resp.data.id as string;
      },

      remover: async (id) => {
        const { error } = await supabase.from('servicos').delete().eq('id', id);
        if (error) {
          set({ erro: error.message });
          return false;
        }
        set({ servicos: get().servicos.filter((s) => s.id !== id) });
        return true;
      },
    }),
    { name: 'precifica-servicos' },
  ),
);