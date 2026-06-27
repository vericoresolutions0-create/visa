// Shared "highlight strip" used on marketing pages (About, White-Label) to
// show a row of 4 short stats on a dark band. The homepage hero has its own
// bespoke animated version and intentionally doesn't use this.
export function StatsBar({
  stats,
  valueSize = "text-4xl",
  padding = "py-14",
}: {
  stats: { value: string; label: string }[];
  valueSize?: string;
  padding?: string;
}) {
  return (
    <section className={`bg-primary px-6 ${padding}`}>
      <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        {stats.map((s) => (
          <div key={s.label}>
            <div className={`font-serif ${valueSize} font-semibold text-accent mb-1`}>{s.value}</div>
            <div className="text-xs text-primary-foreground/60 uppercase tracking-widest">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
