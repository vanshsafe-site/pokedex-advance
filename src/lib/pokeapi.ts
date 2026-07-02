import { queryOptions } from "@tanstack/react-query";

const BASE = "https://pokeapi.co/api/v2";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  return res.json() as Promise<T>;
}

export interface PokemonListItem {
  id: number;
  name: string;
}

export const listQuery = queryOptions({
  queryKey: ["pokemon-list"],
  queryFn: async () => {
    const data = await fetchJson<{ results: { name: string; url: string }[] }>(
      `${BASE}/pokemon?limit=1025&offset=0`,
    );
    return data.results.map((r) => {
      const parts = r.url.split("/").filter(Boolean);
      const id = Number(parts[parts.length - 1]);
      return { id, name: r.name } as PokemonListItem;
    });
  },
  staleTime: Infinity,
  gcTime: Infinity,
});

export const pokemonQuery = (id: number | string) =>
  queryOptions({
    queryKey: ["pokemon", id],
    queryFn: () => fetchJson<any>(`${BASE}/pokemon/${id}`),
    staleTime: 1000 * 60 * 60,
  });

export const speciesQuery = (id: number | string) =>
  queryOptions({
    queryKey: ["species", id],
    queryFn: () => fetchJson<any>(`${BASE}/pokemon-species/${id}`),
    staleTime: 1000 * 60 * 60,
  });

export const evolutionQuery = (url: string) =>
  queryOptions({
    queryKey: ["evolution", url],
    queryFn: () => fetchJson<any>(url),
    staleTime: Infinity,
  });

export const encountersQuery = (id: number | string) =>
  queryOptions({
    queryKey: ["encounters", id],
    queryFn: () => fetchJson<any[]>(`${BASE}/pokemon/${id}/encounters`),
    staleTime: 1000 * 60 * 60,
  });

export const spriteUrl = (id: number) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;

export const artworkUrl = (id: number) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;

export const TYPES = [
  "normal","fire","water","electric","grass","ice","fighting","poison",
  "ground","flying","psychic","bug","rock","ghost","dragon","dark","steel","fairy",
] as const;

export const GENERATIONS: { id: number; name: string; range: [number, number] }[] = [
  { id: 1, name: "Gen I — Kanto", range: [1, 151] },
  { id: 2, name: "Gen II — Johto", range: [152, 251] },
  { id: 3, name: "Gen III — Hoenn", range: [252, 386] },
  { id: 4, name: "Gen IV — Sinnoh", range: [387, 493] },
  { id: 5, name: "Gen V — Unova", range: [494, 649] },
  { id: 6, name: "Gen VI — Kalos", range: [650, 721] },
  { id: 7, name: "Gen VII — Alola", range: [722, 809] },
  { id: 8, name: "Gen VIII — Galar", range: [810, 905] },
  { id: 9, name: "Gen IX — Paldea", range: [906, 1025] },
];

export function pad(n: number) {
  return n.toString().padStart(4, "0");
}

export function titleCase(s: string) {
  return s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
