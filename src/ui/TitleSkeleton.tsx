/** Instant 2D first paint (also server-rendered). The 3D title diorama fades in over it. */
export function TitleSkeleton({ compact = false }: { compact?: boolean }) {
  const heart = [".X.X.", "XXXXX", "XXXXX", ".XXX.", "..X.."];
  const grid = (
    <div aria-hidden="true" className="grid grid-cols-5 gap-1.5">
      {heart.flatMap((row, y) =>
        [...row].map((c, x) => (
          <span key={`${x}-${y}`} className={`block h-9 w-9 rounded-lg ${c === "X" ? "bg-brick shadow-[inset_0_-4px_0_var(--brick-dark)]" : "bg-transparent"}`} />
        )),
      )}
    </div>
  );
  if (compact) return grid;
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
      {grid}
      <h1 className="text-5xl font-extrabold tracking-tight">maré26</h1>
      <p className="max-w-xs text-lg text-ink-soft">Solve the pixels. Watch them pop up into a tiny 3D toy-brick diorama.</p>
    </main>
  );
}
