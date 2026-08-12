import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-editorial flex min-h-[70vh] flex-col items-center justify-center text-center">
      <p className="eyebrow text-ocean-700">Lost paradise</p>
      <h1 className="mt-3 text-display font-semibold text-ink">This page has drifted out to sea.</h1>
      <p className="mt-4 max-w-md text-ink-muted">
        The experience you&apos;re looking for isn&apos;t here — but there are
        plenty more worth crossing an ocean for.
      </p>
      <Link
        href="/experiences"
        className="mt-8 rounded-full bg-ink px-6 py-3 text-xs uppercase tracking-eyebrow text-sand-50 hover:bg-ink-soft"
      >
        Explore experiences
      </Link>
    </div>
  );
}
