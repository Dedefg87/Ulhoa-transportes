import base from '@/data/cars-seed.json';
import type { Carro } from '@/types';

const CARS = base as Carro[];

/** Marcas únicas, em ordem alfabética */
export function listarMarcas(): string[] {
  return [...new Set(CARS.map((c) => c.marca))].sort();
}

/** Modelos de uma marca */
export function listarModelos(marca: string): string[] {
  return [...new Set(CARS.filter((c) => c.marca === marca).map((c) => c.modelo))].sort();
}

/** Versões/anos de um modelo */
export function listarVersoes(marca: string, modelo: string): Carro[] {
  return CARS
    .filter((c) => c.marca === marca && c.modelo === modelo)
    .sort((a, b) => b.ano - a.ano);
}

/** Busca livre por texto */
export function buscarCarros(termo: string): Carro[] {
  const t = termo.toLowerCase().trim();
  if (!t) return CARS;
  return CARS.filter((c) =>
    `${c.marca} ${c.modelo} ${c.versao} ${c.ano}`.toLowerCase().includes(t),
  );
}

/** Carro por id */
export function carroPorId(id: string): Carro | undefined {
  return CARS.find((c) => c.id === id);
}

/** Consumo médio (urbano + rodoviário) / 2 */
export function consumoMedio(carro: Carro): number {
  return (carro.consumoUrbano + carro.consumoRodoviario) / 2;
}