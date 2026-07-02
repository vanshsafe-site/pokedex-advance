import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { BootScreen } from "@/components/pokedex/BootScreen";
import { Sidebar } from "@/components/pokedex/Sidebar";
import { Hologram } from "@/components/pokedex/Hologram";
import { InfoPanel } from "@/components/pokedex/InfoPanel";
import { pokemonQuery, speciesQuery, listQuery } from "@/lib/pokeapi";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Menu, X } from "lucide-react";

export const Route = createFileRoute("/")({
  component: PokedexApp,
});

const FAV_KEY = "pokedex-neo:favs";
const REC_KEY = "pokedex-neo:recent";

function PokedexApp() {
  const [booted, setBooted] = useState(false);
  const [id, setId] = useState<number>(25); // Pikachu
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [favorites, setFavorites] = useState<Set<number>>(() => {
    if (typeof window === "undefined") return new Set();
    try { return new Set(JSON.parse(localStorage.getItem(FAV_KEY) ?? "[]")); } catch { return new Set(); }
  });
  const [recent, setRecent] = useState<number[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem(REC_KEY) ?? "[]"); } catch { return []; }
  });

  const qc = useQueryClient();
  const { data: list } = useQuery(listQuery);
  const pkQ = useQuery(pokemonQuery(id));
  const spQ = useQuery(speciesQuery(id));

  const select = useCallback((next: number) => {
    setId(next);
    setDrawerOpen(false);
    setRecent((r) => {
      const out = [next, ...r.filter((x) => x !== next)].slice(0, 20);
      try { localStorage.setItem(REC_KEY, JSON.stringify(out)); } catch {}
      return out;
    });
  }, []);

  const toggleFav = useCallback((n: number) => {
    setFavorites((f) => {
      const out = new Set(f);
      out.has(n) ? out.delete(n) : out.add(n);
      try { localStorage.setItem(FAV_KEY, JSON.stringify([...out])); } catch {}
      return out;
    });
  }, []);

  // Preload neighbors (deferred, low priority)
  useEffect(() => {
    if (!list?.length) return;
    const t = setTimeout(() => {
      [id - 1, id + 1].forEach((n) => {
        if (n >= 1 && n <= 1025) {
          qc.prefetchQuery(pokemonQuery(n));
        }
      });
    }, 400);
    return () => clearTimeout(t);
  }, [id, list, qc]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "SELECT") return;
      if (e.key === "ArrowLeft" && id > 1) select(id - 1);
      if (e.key === "ArrowRight" && id < 1025) select(id + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [id, select]);

  if (!booted) return <BootScreen onDone={() => setBooted(true)} />;

  const name = pkQ.data?.name ?? spQ.data?.name ?? "loading";
  const types = pkQ.data?.types?.map((t: any) => t.type.name) ?? [];

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="glass hud-corner mx-2 mt-2 px-3 py-2 flex items-center gap-3 shrink-0">
        <button
          className="md:hidden p-1 text-cyan"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open index"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="relative w-3 h-3">
            <span className="absolute inset-0 rounded-full bg-cyan anim-pulse-ring" />
            <span className="absolute inset-[3px] rounded-full bg-cyan" />
          </div>
          <h1 className="font-mono text-sm tracking-[0.3em] text-cyan">POKÉDEX · NEO</h1>
        </div>
        <div className="hidden md:flex ml-auto gap-6 font-mono text-[10px] text-muted-foreground">
          <span>MODE: <span className="text-cyan">RESEARCH</span></span>
          <span>OP: <span className="text-cyan">TRAINER</span></span>
          <span className="anim-blink">◉ TRANSMITTING</span>
        </div>
        <div className="ml-auto md:ml-0 flex items-center gap-1 font-mono text-xs">
          <button
            onClick={() => id > 1 && select(id - 1)}
            className="p-1.5 rounded hover:bg-cyan/10 text-cyan disabled:opacity-30"
            disabled={id <= 1}
            aria-label="Previous"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-cyan">#{id.toString().padStart(4, "0")}</span>
          <button
            onClick={() => id < 1025 && select(id + 1)}
            className="p-1.5 rounded hover:bg-cyan/10 text-cyan disabled:opacity-30"
            disabled={id >= 1025}
            aria-label="Next"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Body */}
      <main className="flex-1 grid gap-2 p-2 min-h-0 overflow-hidden"
            style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>
        <div className="hidden md:grid gap-2 min-h-0"
             style={{ gridTemplateColumns: "260px minmax(0,1fr) 380px" }}>
          <Sidebar
            selectedId={id}
            onSelect={select}
            favorites={favorites}
            recent={recent}
            onToggleFav={toggleFav}
          />
          <div className="glass hud-corner min-h-0 relative">
            <Hologram id={id} name={name} types={types} />
          </div>
          <InfoPanel id={id} onSelect={select} />
        </div>

        {/* Mobile stacked */}
        <div className="md:hidden flex flex-col gap-2 min-h-0 overflow-y-auto scroll-cyan">
          <div className="glass hud-corner h-[52vh] shrink-0 relative">
            <Hologram id={id} name={name} types={types} />
          </div>
          <div className="min-h-[400px]">
            <InfoPanel id={id} onSelect={select} />
          </div>
        </div>
      </main>

      {/* Bottom status */}
      <footer className="mx-2 mb-2 px-3 py-1 flex items-center justify-between font-mono text-[10px] text-muted-foreground glass hud-corner shrink-0">
        <span>◈ ARR/← → NAV</span>
        <span>NEURAL-LINK 98%</span>
        <span>API v2 ONLINE</span>
      </footer>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-background/80 anim-fade" onClick={() => setDrawerOpen(false)} />
          <div className="relative w-[85vw] max-w-sm h-full p-2 anim-fade">
            <button
              className="absolute top-3 right-3 z-10 p-1 text-cyan bg-background/80 rounded"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
            <Sidebar
              selectedId={id}
              onSelect={select}
              favorites={favorites}
              recent={recent}
              onToggleFav={toggleFav}
            />
          </div>
        </div>
      )}
    </div>
  );
}
