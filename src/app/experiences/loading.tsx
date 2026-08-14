/** Skeleton while the experiences catalogue loads. */
export default function Loading() {
  return (
    <div className="container-editorial py-14 sm:py-20">
      <div className="h-4 w-28 animate-pulse rounded bg-ink/10" />
      <div className="mt-4 h-10 w-2/3 max-w-xl animate-pulse rounded bg-ink/10" />
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-xl2 border border-ink/10">
            <div className="aspect-[4/3] animate-pulse bg-ink/10" />
            <div className="space-y-3 p-5">
              <div className="h-4 w-3/4 animate-pulse rounded bg-ink/10" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-ink/10" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-ink/10" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
