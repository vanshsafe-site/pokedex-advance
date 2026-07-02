import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { GENERATIONS, TYPES, listQuery, pad, spriteUrl, titleCase } from "@/lib/pokeapi";
import { Search, Star, Clock } from "lucide-react";

interface Props {
  selectedId: number;
  onSelect: (id: number) => void;
  favorites: Set<number>;
  recent: number[];
  onToggleFav: (id: number) => void;
}

// Very lightweight type lookup for the sidebar: we lazy-load type data
// only when the user actually filters by type, so idle render stays cheap.
async function fetchTypeIds(type: string): Promise<Set<number>> {
  const res = await fetch(`https://pokeapi.co/api/v2/type/${type}`);
  const j = await res.json();
  const set = new Set<number>();
  for (const p of j.pokemon as { pokemon: { url: string } }[]) {
    const parts = p.pokemon.url.split("/").filter(Boolean);
    const id = Number(parts[parts.length - 1]);
    if (id <= 1025) set.add(id);
  }
  return set;
}

export function Sidebar({ selectedId, onSelect, favorites, recent, onToggleFav }: Props) {
  const { data: list = [] } = useQuery(listQuery);
  const [q, setQ] = useState("");
  const [gen, setGen] = useState<number | "all">("all");
  const [type, setType] = useState<string>("all");
  const [typeSet, setTypeSet] = useState<Set<number> | null>(null);
  const [tab, setTab] = useState<"all" | "fav" | "recent">("all");

  useEffect(() => {
    if (type === "all") { setTypeSet(null); return; }
    let cancelled = false;
    fetchTypeIds(type).then((s) => { if (!cancelled) setTypeSet(s); });
    return () => { cancelled = true; };
  }, [type]);

  const filtered = useMemo(() => {
    let src = list;
    if (tab === "fav") src = src.filter((p) => favorites.has(p.id));
    if (tab === "recent") src = recent.map((id) => list.find((p) => p.id === id)!).filter(Boolean);
    if (gen !== "all") {
      const g = GENERATIONS.find((x) => x.id === gen)!;
      src = src.filter((p) => p.id >= g.range[0] && p.id <= g.range[1]);
    }
    if (typeSet) src = src.filter((p) => typeSet.has(p.id));
    const term = q.trim().toLowerCase();
    if (term) {
      const asNum = Number(term);
      src = src.filter(
        (p) => p.name.includes(term) || (!Number.isNaN(asNum) && p.id === asNum),
      );
    }
    return src.slice(0, 400); // cap for low-end HW
  }, [list, q, gen, typeSet, tab, favorites, recent]);

  return (
    <aside className="glass hud-corner flex flex-col h-full overflow-hidden">
      <div className="p-3 border-b border-border/60 space-y-2">
        <div className="flex items-center gap-2 text-xs text-cyan font-mono">
          <span className="w-2 h-2 rounded-full bg-cyan anim-pulse-ring" />
          POKÉMON INDEX
          <span className="ml-auto text-muted-foreground">{list.length}</span>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 w-3.5 h-3.5 text-cyan/70" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or #"
            aria-label="Search Pokémon"
            className="w-full bg-input/70 border border-border rounded-md pl-7 pr-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-cyan/60"
          />
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <select
            value={gen}
            onChange={(e) => setGen(e.target.value === "all" ? "all" : Number(e.target.value))}
            aria-label="Filter by generation"
            className="bg-input/70 border border-border rounded-md px-1.5 py-2 sm:py-1 text-xs outline-none min-h-[36px]"
          >
            <option value="all">All Gens</option>
            {GENERATIONS.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            aria-label="Filter by type"
            className="bg-input/70 border border-border rounded-md px-1.5 py-2 sm:py-1 text-xs outline-none capitalize min-h-[36px]"
          >
            <option value="all">All Types</option>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex text-xs font-mono">
          {(["all","fav","recent"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 sm:py-1 min-h-[36px] border-b-2 transition-colors ${
                tab === t ? "border-cyan text-cyan" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "all" ? "ALL" : t === "fav" ? "★ FAV" : "◷ RECENT"}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto scroll-cyan p-2 space-y-1">
        {filtered.map((p) => {
          const active = p.id === selectedId;
          return (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className={`group w-full flex items-center gap-2 px-2 py-2 sm:py-1.5 min-h-[48px] rounded-md text-left transition-colors ${
                active
                  ? "bg-cyan/15 text-foreground ring-1 ring-cyan/60 shadow-[0_0_16px_-4px_var(--cyan-glow)]"
                  : "hover:bg-cyan/5 active:bg-cyan/10"
              }`}
              style={{ contentVisibility: "auto", containIntrinsicSize: "48px" }}
            >
              <img
                src={spriteUrl(p.id)}
                alt=""
                loading="lazy"
                decoding="async"
                width={40}
                height={40}
                className="w-10 h-10 object-contain pixelated"
                style={{ imageRendering: "pixelated" }}
              />
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-mono text-cyan/80">#{pad(p.id)}</div>
                <div className="text-sm truncate">{titleCase(p.name)}</div>
              </div>
              <span
                onClick={(e) => { e.stopPropagation(); onToggleFav(p.id); }}
                role="button"
                aria-label="Favorite"
                className={`p-2.5 -m-1 rounded ${favorites.has(p.id) ? "text-orange-accent" : "text-muted-foreground/40 hover:text-cyan"}`}
              >
                <Star className="w-3.5 h-3.5" fill={favorites.has(p.id) ? "currentColor" : "none"} />
              </span>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center text-muted-foreground text-xs py-8 font-mono">
            NO MATCHES
          </div>
        )}
      </div>
      <div className="px-3 py-1.5 border-t border-border/60 text-[10px] font-mono text-muted-foreground flex items-center gap-2">
        <Clock className="w-3 h-3" /> LIVE SYNC · POKÉAPI
      </div>
    </aside>
  );
}