/** Skeleton while the booking flow loads. */
export default function Loading() {
  return (
    <div className="container-editorial py-14 sm:py-20">
      <div className="h-4 w-40 animate-pulse rounded bg-ink/10" />
      <div className="mt-4 h-9 w-72 animate-pulse rounded bg-ink/10" />
      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-ink/10 bg-ink/5" />
          ))}
        </div>
        <div className="h-80 animate-pulse rounded-xl2 border border-ink/10 bg-ink/5" />
      </div>
    </div>
  );
}
