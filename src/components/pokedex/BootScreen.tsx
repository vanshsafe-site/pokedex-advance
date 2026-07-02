import { useEffect, useState } from "react";

const LINES = [
  "> Initializing Pokédex Neo v2080.11...",
  "> Loading holographic modules....... OK",
  "> Connecting to PokéAPI.............. OK",
  "> Calibrating scan array............. OK",
  "> Loading Pokémon database.......... OK",
  "> Handshake complete. Welcome, Trainer.",
];

export function BootScreen({ onDone }: { onDone: () => void }) {
  const [shown, setShown] = useState<string[]>([]);

  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      setShown((s) => [...s, LINES[i]]);
      i++;
      if (i >= LINES.length) {
        clearInterval(id);
        setTimeout(onDone, 400);
      }
    }, 260);
    return () => clearInterval(id);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="w-[min(560px,92vw)] font-mono text-xs sm:text-sm">
        <div className="mb-3 sm:mb-4 text-cyan neon-text text-base sm:text-lg">◈ POKÉDEX NEO</div>
        <div className="glass hud-corner p-4 sm:p-5 min-h-48 sm:min-h-64">
          {shown.map((l, i) => (
            <div key={i} className="anim-fade text-cyan/90">{l}</div>
          ))}
          <span className="inline-block w-2 h-4 bg-cyan align-middle anim-blink ml-1" />
        </div>
      </div>
    </div>
  );
}