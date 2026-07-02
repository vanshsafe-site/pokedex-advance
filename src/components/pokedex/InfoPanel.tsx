import { useMemo, useState } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
} from "recharts";
import {
  encountersQuery, evolutionQuery, pokemonQuery, speciesQuery,
  spriteUrl, artworkUrl, pad, titleCase,
} from "@/lib/pokeapi";

type Tab = "stats" | "info" | "moves" | "evolution" | "locations" | "forms" | "sprites";

const STAT_LABEL: Record<string, string> = {
  hp: "HP", attack: "ATK", defense: "DEF",
  "special-attack": "SP.A", "special-defense": "SP.D", speed: "SPD",
};

const LANGS = [
  { code: "en", label: "EN" }, { code: "ja", label: "JA" },
  { code: "fr", label: "FR" }, { code: "de", label: "DE" },
  { code: "it", label: "IT" }, { code: "es", label: "ES" },
];

export function InfoPanel({ id, onSelect }: { id: number; onSelect: (id: number) => void }) {
  const pkQ = useQuery(pokemonQuery(id));
  const spQ = useQuery(speciesQuery(id));
  const [tab, setTab] = useState<Tab>("stats");
  const [lang, setLang] = useState("en");

  const pk = pkQ.data;
  const sp = spQ.data;

  const types: string[] = pk?.types?.map((t: any) => t.type.name) ?? [];

  // Type effectiveness — fetch relevant type data
  const typeQueries = useQueries({
    queries: types.map((t) => ({
      queryKey: ["type", t],
      queryFn: () => fetch(`https://pokeapi.co/api/v2/type/${t}`).then((r) => r.json()),
      staleTime: Infinity,
    })),
  });
  const effectiveness = useMemo(() => computeEffectiveness(typeQueries.map((q) => q.data).filter(Boolean)), [typeQueries]);

  return (
    <div className="glass hud-corner flex flex-col h-full overflow-hidden">
      <header className="flex items-center gap-2 px-3 py-2 border-b border-border/60">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan anim-pulse-ring" />
        <span className="font-mono text-xs text-cyan">DATA STREAM</span>
        <span className="ml-auto font-mono text-[10px] text-muted-foreground">
          {pk ? `${pk.height / 10}m · ${pk.weight / 10}kg` : "..."}
        </span>
      </header>

      <nav className="flex gap-0 px-2 border-b border-border/60 overflow-x-auto scroll-cyan">
        {(["stats","info","moves","evolution","locations","forms","sprites"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2.5 min-h-[40px] text-xs font-mono uppercase tracking-wider border-b-2 whitespace-nowrap transition-colors ${
              tab === t ? "border-cyan text-cyan" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </nav>

      <div className="flex-1 overflow-y-auto scroll-cyan p-3">
        {!pk || !sp ? (
          <LoadingBlock />
        ) : (
          <div key={`${id}-${tab}`} className="anim-fade">
            {tab === "stats" && <StatsTab pk={pk} sp={sp} effectiveness={effectiveness} />}
            {tab === "info" && (
              <InfoTab pk={pk} sp={sp} lang={lang} setLang={setLang} />
            )}
            {tab === "moves" && <MovesTab pk={pk} />}
            {tab === "evolution" && (
              <EvolutionTab speciesUrl={sp.evolution_chain?.url} currentId={id} onSelect={onSelect} />
            )}
            {tab === "locations" && <LocationsTab id={id} />}
            {tab === "forms" && <FormsTab sp={sp} currentId={id} onSelect={onSelect} />}
            {tab === "sprites" && <SpritesTab pk={pk} />}
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingBlock() {
  return (
    <div className="space-y-2 font-mono text-xs text-cyan/60">
      <div>◇ Fetching data packet...</div>
      <div className="h-1.5 bg-cyan/10 rounded overflow-hidden">
        <div className="h-full bg-cyan anim-pulse-ring" style={{ width: "40%" }} />
      </div>
    </div>
  );
}

function StatsTab({ pk, sp, effectiveness }: any) {
  const stats = pk.stats as { base_stat: number; stat: { name: string } }[];
  const total = stats.reduce((a, s) => a + s.base_stat, 0);
  const radar = stats.map((s) => ({
    name: STAT_LABEL[s.stat.name] ?? s.stat.name,
    value: s.base_stat,
  }));

  return (
    <div className="space-y-4">
      <Section title="BASE STATS">
        <div className="space-y-1.5">
          {stats.map((s) => {
            const pct = Math.min(100, (s.base_stat / 255) * 100);
            const color = s.base_stat >= 100 ? "var(--cyan)" : s.base_stat >= 60 ? "var(--orange-accent)" : "var(--muted-foreground)";
            return (
              <div key={s.stat.name} className="grid grid-cols-[52px_36px_1fr] items-center gap-2 text-xs font-mono">
                <span className="text-muted-foreground">{STAT_LABEL[s.stat.name]}</span>
                <span className="text-right">{s.base_stat}</span>
                <div className="h-1.5 bg-cyan/10 rounded overflow-hidden">
                  <div
                    className="h-full rounded origin-left"
                    style={{
                      width: `${pct}%`, background: color,
                      boxShadow: `0 0 8px ${color}`,
                      animation: "grow-x 0.6s ease-out both",
                    }}
                  />
                </div>
              </div>
            );
          })}
          <div className="grid grid-cols-[52px_36px_1fr] items-center gap-2 text-xs font-mono pt-1 border-t border-border/40">
            <span className="text-cyan">TOTAL</span>
            <span className="text-right text-cyan">{total}</span>
            <div />
          </div>
        </div>
      </Section>

      <Section title="COMBAT RADAR">
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radar}>
              <PolarGrid stroke="var(--cyan)" strokeOpacity={0.2} />
              <PolarAngleAxis dataKey="name" tick={{ fill: "var(--color-cyan)", fontSize: 10 }} />
              <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 200]} />
              <Radar dataKey="value" stroke="var(--cyan)" fill="var(--cyan)" fillOpacity={0.3} isAnimationActive={false} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </Section>

      <Section title="TYPE MATRIX">
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-3 text-xs">
          <EffList label="× 4 WEAK" list={effectiveness["4"]} className="text-destructive" />
          <EffList label="× 2 WEAK" list={effectiveness["2"]} className="text-destructive/80" />
          <EffList label="× ½ RES" list={effectiveness["0.5"]} className="text-cyan" />
          <EffList label="× ¼ RES" list={effectiveness["0.25"]} className="text-cyan" />
          <EffList label="IMMUNE" list={effectiveness["0"]} className="text-orange-accent" />
        </div>
      </Section>

      <Section title="ABILITIES">
        <div className="space-y-1.5">
          {pk.abilities.map((a: any) => (
            <div key={a.ability.name} className="flex items-center gap-2 text-sm">
              <span className={`w-1.5 h-1.5 rounded-full ${a.is_hidden ? "bg-orange-accent" : "bg-cyan"}`} />
              <span>{titleCase(a.ability.name)}</span>
              {a.is_hidden && <span className="text-[10px] font-mono text-orange-accent">HIDDEN</span>}
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function EffList({ label, list, className }: { label: string; list: string[]; className?: string }) {
  return (
    <div>
      <div className="text-[10px] font-mono text-muted-foreground mb-1">{label}</div>
      <div className="flex flex-wrap gap-1">
        {list.length === 0 ? (
          <span className="text-muted-foreground/50 text-[10px]">—</span>
        ) : (
          list.map((t) => (
            <span key={t} className={`type-${t} px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold ${className}`}>
              {t}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

function InfoTab({ pk, sp, lang, setLang }: any) {
  const flavor = sp.flavor_text_entries.find((e: any) => e.language.name === lang)
    ?? sp.flavor_text_entries.find((e: any) => e.language.name === "en");
  const genus = sp.genera.find((g: any) => g.language.name === "en")?.genus ?? "Pokémon";
  const jaName = sp.names.find((n: any) => n.language.name === "ja")?.name;
  const genderRate = sp.gender_rate; // -1 = genderless, else fem eighths
  const genderRatio = genderRate === -1
    ? "Genderless"
    : `♀ ${(genderRate / 8) * 100}%  ♂ ${((8 - genderRate) / 8) * 100}%`;

  return (
    <div className="space-y-4">
      <Section title="POKÉDEX ENTRY">
        <div className="flex gap-1 mb-2">
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              className={`px-2 py-0.5 text-[10px] font-mono rounded ${
                lang === l.code ? "bg-cyan text-primary-foreground" : "bg-cyan/10 text-cyan hover:bg-cyan/20"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
        <p className="text-sm leading-relaxed text-foreground/90 italic">
          "{flavor?.flavor_text.replace(/[\f\n]/g, " ") ?? "No entry available."}"
        </p>
      </Section>

      <Section title="GENERAL">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs font-mono">
          <Row k="No." v={`#${pad(pk.id)}`} />
          <Row k="Genus" v={genus} />
          <Row k="JP Name" v={jaName ?? "—"} />
          <Row k="Generation" v={sp.generation.name.replace("generation-", "Gen ").toUpperCase()} />
          <Row k="Height" v={`${pk.height / 10} m`} />
          <Row k="Weight" v={`${pk.weight / 10} kg`} />
          <Row k="Base XP" v={pk.base_experience ?? "—"} />
          <Row k="Capture" v={`${sp.capture_rate}/255`} />
          <Row k="Growth" v={titleCase(sp.growth_rate.name)} />
          <Row k="Happiness" v={sp.base_happiness ?? "—"} />
          <Row k="Hatch" v={`${sp.hatch_counter ?? 0} cycles`} />
          <Row k="Color" v={titleCase(sp.color?.name ?? "—")} />
          <Row k="Shape" v={titleCase(sp.shape?.name ?? "—")} />
          <Row k="Habitat" v={titleCase(sp.habitat?.name ?? "—")} />
          <Row k="Gender" v={genderRatio} />
          <Row k="Egg Groups" v={sp.egg_groups.map((g: any) => titleCase(g.name)).join(", ")} />
          <Row k="Baby" v={sp.is_baby ? "Yes" : "No"} />
          <Row k="Legendary" v={sp.is_legendary ? "Yes" : "No"} />
          <Row k="Mythical" v={sp.is_mythical ? "Yes" : "No"} />
          <Row k="Varieties" v={sp.varieties.length} />
        </dl>
      </Section>
    </div>
  );
}

function Row({ k, v }: { k: string; v: any }) {
  return (
    <>
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-right text-foreground">{v}</dd>
    </>
  );
}

function MovesTab({ pk }: any) {
  const [q, setQ] = useState("");
  const [method, setMethod] = useState<string>("all");
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (pk.moves as any[])
      .flatMap((m) =>
        m.version_group_details.map((d: any) => ({
          name: m.move.name,
          method: d.move_learn_method.name,
          level: d.level_learned_at,
        })),
      )
      .filter((m: any) => (method === "all" ? true : m.method === method))
      .filter((m: any) => (term ? m.name.includes(term) : true))
      .sort((a: any, b: any) => a.level - b.level || a.name.localeCompare(b.name))
      .slice(0, 200);
  }, [pk, q, method]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter moves..."
          className="flex-1 min-w-[120px] bg-input/70 border border-border rounded px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-cyan"
        />
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="bg-input/70 border border-border rounded px-2 py-1.5 text-xs outline-none"
        >
          <option value="all">All</option>
          <option value="level-up">Level</option>
          <option value="machine">TM/HM</option>
          <option value="egg">Egg</option>
          <option value="tutor">Tutor</option>
        </select>
      </div>
      <div className="text-[10px] font-mono text-muted-foreground">{rows.length} entries</div>
      <div className="border border-border rounded max-h-[420px] overflow-y-auto scroll-cyan">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-card/95 text-cyan font-mono">
            <tr>
              <th className="text-left px-2 py-1.5">Move</th>
              <th className="text-left px-2 py-1.5">Method</th>
              <th className="text-right px-2 py-1.5">Lvl</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m: any, i: number) => (
              <tr key={i} className="border-t border-border/40 hover:bg-cyan/5">
                <td className="px-2 py-1">{titleCase(m.name)}</td>
                <td className="px-2 py-1 text-muted-foreground">{m.method}</td>
                <td className="px-2 py-1 text-right font-mono">{m.level || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EvolutionTab({ speciesUrl, currentId, onSelect }: any) {
  const { data } = useQuery({ ...evolutionQuery(speciesUrl), enabled: !!speciesUrl });
  if (!data) return <LoadingBlock />;
  const chain = flattenChain(data.chain);

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {chain.map((node, i) => (
        <div key={node.id + "-" + i} className="flex items-center gap-2">
          {i > 0 && (
            <div className="flex flex-col items-center text-[10px] font-mono text-cyan">
              <span>▶</span>
              <span className="text-muted-foreground">{node.trigger}</span>
            </div>
          )}
          <button
            onClick={() => onSelect(node.id)}
            className={`flex flex-col items-center p-2 rounded-lg transition ${
              node.id === currentId ? "bg-cyan/15 ring-1 ring-cyan" : "hover:bg-cyan/5"
            }`}
          >
            <img src={artworkUrl(node.id)} alt={node.name} loading="lazy" decoding="async" className="w-20 h-20 object-contain drop-shadow-[0_0_10px_var(--cyan-glow)]" />
            <div className="text-[10px] font-mono text-cyan/80">#{pad(node.id)}</div>
            <div className="text-xs">{titleCase(node.name)}</div>
          </button>
        </div>
      ))}
    </div>
  );
}

function flattenChain(node: any, trigger = "BASE"): { id: number; name: string; trigger: string }[] {
  const idFromUrl = (url: string) => Number(url.split("/").filter(Boolean).pop());
  const out: any[] = [{ id: idFromUrl(node.species.url), name: node.species.name, trigger }];
  for (const evo of node.evolves_to) {
    const d = evo.evolution_details[0] ?? {};
    const t = d.min_level ? `Lv ${d.min_level}` :
      d.item ? titleCase(d.item.name) :
      d.trigger?.name === "trade" ? "Trade" :
      d.min_happiness ? "Friendship" : titleCase(d.trigger?.name ?? "?");
    out.push(...flattenChain(evo, t));
  }
  return out;
}

function LocationsTab({ id }: { id: number }) {
  const { data } = useQuery(encountersQuery(id));
  if (!data) return <LoadingBlock />;
  if (data.length === 0) {
    return <div className="text-sm text-muted-foreground text-center py-8 font-mono">◇ NO WILD ENCOUNTERS ON RECORD</div>;
  }
  return (
    <div className="space-y-2">
      {data.slice(0, 40).map((loc: any, i: number) => (
        <div key={i} className="border border-border/60 rounded px-3 py-2">
          <div className="font-medium text-sm">{titleCase(loc.location_area.name)}</div>
          <div className="text-[11px] font-mono text-muted-foreground mt-1">
            {loc.version_details.map((v: any) => `${v.version.name} (${v.max_chance}%)`).join(" · ")}
          </div>
        </div>
      ))}
    </div>
  );
}

function FormsTab({ sp, currentId, onSelect }: any) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
      {sp.varieties.map((v: any) => {
        const id = Number(v.pokemon.url.split("/").filter(Boolean).pop());
        if (id > 10000) return (
          <div key={id} className="border border-border rounded p-2 text-center text-xs opacity-60">
            <div className="text-muted-foreground">{titleCase(v.pokemon.name)}</div>
            <div className="text-[10px] font-mono">Alt form</div>
          </div>
        );
        return (
          <button
            key={id}
            onClick={() => onSelect(id)}
            className={`border rounded p-2 text-center hover:bg-cyan/5 ${id === currentId ? "border-cyan bg-cyan/10" : "border-border"}`}
          >
            <img src={artworkUrl(id)} alt={v.pokemon.name} loading="lazy" className="w-full h-24 object-contain" />
            <div className="text-xs">{titleCase(v.pokemon.name)}</div>
          </button>
        );
      })}
    </div>
  );
}

function SpritesTab({ pk }: any) {
  const s = pk.sprites;
  const items: { label: string; src: string }[] = [];
  const add = (label: string, src?: string | null) => src && items.push({ label, src });
  add("Front", s.front_default);
  add("Back", s.back_default);
  add("Shiny", s.front_shiny);
  add("Shiny Back", s.back_shiny);
  add("Female", s.front_female);
  add("Shiny Female", s.front_shiny_female);
  add("Official", s.other?.["official-artwork"]?.front_default);
  add("Home", s.other?.home?.front_default);
  add("Home Shiny", s.other?.home?.front_shiny);
  add("Dream", s.other?.dream_world?.front_default);
  add("Showdown", s.other?.showdown?.front_default);

  return (
    <div className="grid grid-cols-2 min-[420px]:grid-cols-3 sm:grid-cols-4 gap-2">
      {items.map((it) => (
        <div key={it.label} className="border border-border/60 rounded p-2 text-center bg-cyan/5">
          <img src={it.src} alt={it.label} loading="lazy" className="w-full h-20 object-contain" style={{ imageRendering: "pixelated" }} />
          <div className="text-[10px] font-mono text-cyan/80 mt-1">{it.label}</div>
        </div>
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-[10px] font-mono text-cyan tracking-widest mb-2 flex items-center gap-2">
        <span className="w-1 h-1 rounded-full bg-cyan" />
        {title}
        <span className="flex-1 h-px bg-cyan/20" />
      </h3>
      {children}
    </section>
  );
}

// ---- Type effectiveness ----
function computeEffectiveness(typeDatas: any[]): Record<string, string[]> {
  const mult: Record<string, number> = {};
  const ALL = [
    "normal","fire","water","electric","grass","ice","fighting","poison",
    "ground","flying","psychic","bug","rock","ghost","dragon","dark","steel","fairy",
  ];
  ALL.forEach((t) => (mult[t] = 1));
  for (const td of typeDatas) {
    const dr = td.damage_relations;
    for (const t of dr.double_damage_from) mult[t.name] *= 2;
    for (const t of dr.half_damage_from) mult[t.name] *= 0.5;
    for (const t of dr.no_damage_from) mult[t.name] *= 0;
  }
  const buckets: Record<string, string[]> = { "4": [], "2": [], "0.5": [], "0.25": [], "0": [] };
  for (const [t, m] of Object.entries(mult)) {
    if (m === 4) buckets["4"].push(t);
    else if (m === 2) buckets["2"].push(t);
    else if (m === 0.5) buckets["0.5"].push(t);
    else if (m === 0.25) buckets["0.25"].push(t);
    else if (m === 0) buckets["0"].push(t);
  }
  return buckets;
}