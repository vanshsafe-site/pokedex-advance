import { artworkUrl, pad, titleCase } from "@/lib/pokeapi";

export function Hologram({
  id,
  name,
  types,
}: {
  id: number;
  name: string;
  types: string[];
}) {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden">
      {/* Grid floor */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-1/2 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(var(--cyan-glow) 1px, transparent 1px), linear-gradient(90deg, var(--cyan-glow) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          maskImage: "linear-gradient(to top, black, transparent 80%)",
          transform: "perspective(600px) rotateX(60deg)",
          transformOrigin: "bottom",
        }}
      />

      {/* HUD readouts */}
      <div className="absolute top-4 left-4 font-mono text-[10px] text-cyan/80 leading-tight">
        <div>◈ SCAN.ACTIVE</div>
        <div>ID {pad(id)}</div>
        <div className="text-muted-foreground">SIG {(id * 137 % 9999).toString(16).toUpperCase()}</div>
      </div>
      <div className="absolute top-4 right-4 font-mono text-[10px] text-cyan/80 text-right leading-tight">
        <div>PROJECTION 3D</div>
        <div>FIELD STABLE</div>
        <div className="text-muted-foreground anim-blink">◉ REC</div>
      </div>

      {/* Rings */}
      <div className="relative w-[min(72vh,520px)] aspect-square flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border border-cyan/30 anim-spin-slow"
             style={{ borderStyle: "dashed" }} />
        <div className="absolute inset-6 rounded-full border border-cyan/20 anim-spin-rev" />
        <div className="absolute inset-14 rounded-full border-2 border-cyan/25 anim-spin-med" style={{ borderStyle: "dotted" }} />
        <div className="absolute inset-0 rounded-full anim-pulse-ring"
             style={{ boxShadow: "0 0 60px 10px var(--cyan-glow) inset" }} />

        {/* Orbiting dots */}
        {[0, 90, 180, 270].map((deg) => (
          <div
            key={deg}
            className="absolute inset-0 anim-spin-slow"
            style={{ transform: `rotate(${deg}deg)` }}
            aria-hidden
          >
            <div className="absolute left-1/2 -top-1 w-2 h-2 rounded-full bg-cyan shadow-[0_0_10px_var(--cyan)]" />
          </div>
        ))}

        {/* Pokémon */}
        <div key={id} className="relative anim-fade anim-float">
          <img
            src={artworkUrl(id)}
            alt={`${titleCase(name)} holographic projection`}
            className="relative w-[min(52vh,380px)] h-[min(52vh,380px)] object-contain drop-shadow-[0_0_24px_var(--cyan-glow)] anim-flicker"
            loading="eager"
            decoding="async"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0.2"; }}
          />
          {/* Scan beam */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden"
            style={{ mixBlendMode: "screen" }}
          >
            <div
              className="absolute inset-x-0 h-8 anim-scan"
              style={{
                background: "linear-gradient(to bottom, transparent, var(--cyan-glow), transparent)",
              }}
            />
          </div>
        </div>

        {/* Platform disc */}
        <div
          aria-hidden
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3/4 h-8 rounded-full"
          style={{
            background: "radial-gradient(ellipse, var(--cyan-glow), transparent 70%)",
            filter: "blur(1px)",
          }}
        />
      </div>

      {/* Name plate */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center">
        <div className="font-mono text-xs text-cyan/70 tracking-[0.4em]">#{pad(id)}</div>
        <div className="text-3xl md:text-4xl font-bold tracking-wide neon-text">
          {titleCase(name)}
        </div>
        <div className="mt-2 flex gap-1.5 justify-center">
          {types.map((t) => (
            <span key={t} className={`type-${t} px-3 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide`}>
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
