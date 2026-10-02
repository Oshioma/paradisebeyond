import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { brandFromParams, type SiteParams } from "@/lib/brand/site";
import {
  ChatIcon,
  ListIcon,
  ShareIcon,
  ShieldIcon,
  StarIcon,
  UserIcon,
  VideoIcon,
  WaveIcon,
} from "@/components/offgrid/icons";
import { cn } from "@/lib/utils";

export function generateMetadata({ params }: { params: SiteParams }): Metadata {
  if (brandFromParams(params).theme !== "earth") return {};
  return {
    title: "Trust & safety",
    description:
      "How hosts and travellers get to know each other before a stay: real profiles, a proper introduction, messages, a video call and clear expectations.",
    alternates: { canonical: "/trust" },
  };
}

type Status = "now" | "partial" | "recommended" | "soon";

const STATUS: Record<Status, { label: string; className: string }> = {
  now: { label: "Available now", className: "bg-forest-700 text-sand-50" },
  partial: { label: "Partly available", className: "bg-forest-700/10 text-forest-800" },
  recommended: { label: "Recommended", className: "bg-earth-500/15 text-earth-600" },
  soon: { label: "Coming soon", className: "border border-dashed border-ink/25 text-ink-muted" },
};

const STEPS: { title: string; status: Status; label?: string; Icon: (p: { className?: string }) => JSX.Element; body: React.ReactNode }[] = [
  {
    title: "Build a real profile",
    status: "partial",
    label: "Hosts now · travellers soon",
    Icon: UserIcon,
    body: (
      <>
        <p>
          A photo, a name, a short bio, the languages you speak, relevant experience — and reviews where there are some.
          Hosts have full profiles today. Traveller profiles are coming soon; until then, your introduction does that job.
        </p>
        <p>We never invent reviews, ratings or verification marks.</p>
      </>
    ),
  },
  {
    title: "Introduce yourselves",
    status: "now",
    Icon: WaveIcon,
    body: (
      <p>
        A traveller can&apos;t simply book and appear at someone&apos;s land. Every stay starts with a request and a proper
        introduction: who you are, why you&apos;d like to visit, what interests you about the project, any relevant skills,
        and what you hope to learn. The host reads it and says yes or no — nothing is booked or charged until they say yes.
      </p>
    ),
  },
  {
    title: "Talk before you travel",
    status: "now",
    Icon: ChatIcon,
    body: (
      <p>
        Every stay has its own private message thread between traveller and host. Ask the questions that matter to you —
        about the work, the people, the food, the bed, the nearest shop.
      </p>
    ),
  },
  {
    title: "Have a video call",
    status: "recommended",
    Icon: VideoIcon,
    body: (
      <p>
        For a first stay, a remote place or anything longer than a week or two, a short video call before arrival is the
        best way to know it feels right. Use whichever app you both like, then tick it off in your stay&apos;s checklist.
      </p>
    ),
  },
  {
    title: "Verify identity",
    status: "soon",
    Icon: ShieldIcon,
    body: (
      <>
        <p>
          Identity verification is part of how we want trust to work. When it arrives, it will be done by Spend Time Off
          Grid through a trusted verification provider — and the other person will simply see that you&apos;ve been verified,
          not a copy of your documents.
        </p>
        <p className="font-medium text-ink">
          Please don&apos;t send passport or ID scans to each other in messages. Nobody on Spend Time Off Grid should ask you
          to.
        </p>
      </>
    ),
  },
  {
    title: "Agree what to expect",
    status: "now",
    Icon: ListIcon,
    body: (
      <>
        <p>Before you travel, both of you should be clear on:</p>
        <ul className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
          {["Dates", "Help hours and days", "Typical tasks", "Accommodation", "Food", "House rules", "Who else will be there", "Transport", "Internet and signal", "What to bring"].map((x) => (
            <li key={x} className="flex gap-2">
              <span aria-hidden className="text-forest-700">·</span>
              {x}
            </li>
          ))}
        </ul>
        <p className="mt-3">Your stay&apos;s &ldquo;Before you go&rdquo; checklist lays out what the listing says, so you can confirm it together.</p>
      </>
    ),
  },
  {
    title: "Share your plans",
    status: "recommended",
    Icon: ShareIcon,
    body: (
      <p>
        Tell someone you trust where you&apos;re going, who you&apos;re staying with, when you arrive and expect to leave, and how
        to reach your host. You can also add an emergency contact to your stay — it&apos;s private to you and your host.
      </p>
    ),
  },
  {
    title: "Check in",
    status: "now",
    Icon: WaveIcon,
    body: (
      <p>
        On arrival day we ask &ldquo;Have you arrived safely?&rdquo;, and the next morning &ldquo;Everything okay with your
        stay?&rdquo; — by email and on your stay page, with one tap to answer and a clear way to say you need help. A request
        for help goes straight to the Spend Time Off Grid team, and if an arrival check-in goes unanswered for a day, the team
        is told so they can follow up.
      </p>
    ),
  },
  {
    title: "Review each other",
    status: "partial",
    label: "Travellers now · hosts soon",
    Icon: StarIcon,
    body: (
      <p>
        After a stay, travellers review the stay and their host; reviews are checked before they go live. Reputation works
        best both ways, so hosts reviewing travellers is coming too.
      </p>
    ),
  },
];

export default function TrustPage({ params }: { params: SiteParams }) {
  const brand = brandFromParams(params);
  // Spend Time Off Grid only.
  if (brand.theme !== "earth") notFound();

  return (
    <>
      <section className="bg-sand-100">
        <div className="container-editorial py-14 sm:py-20">
          <p className="eyebrow text-forest-700">Trust & safety</p>
          <h1 className="mt-3 max-w-3xl font-display text-[clamp(2.4rem,5vw,4rem)] font-semibold leading-[1.02] tracking-[-0.02em] text-ink">
            Know who you&apos;re staying with.
          </h1>
          <div className="mt-6 max-w-2xl space-y-4 text-lg leading-relaxed text-ink-soft">
            <p>
              Spend Time Off Grid is about staying with real people in real places. That makes trust more important than it
              is when booking an ordinary hotel.
            </p>
            <p>
              We want hosts and travellers to introduce themselves properly, understand what they&apos;re agreeing to and feel
              comfortable before anyone starts travelling.
            </p>
          </div>
        </div>
      </section>

      <section className="container-editorial py-14 sm:py-20">
        <ol className="mx-auto max-w-3xl divide-y divide-ink/10">
          {STEPS.map(({ title, status, label, Icon, body }, i) => (
            <li key={title} className="grid gap-4 py-8 first:pt-0 sm:grid-cols-[3.5rem_1fr] sm:gap-6">
              <span className="relative flex h-12 w-12 items-center justify-center rounded-full border border-forest-700/20 bg-sand-100 text-forest-800">
                <Icon className="h-6 w-6" />
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-forest-700 text-[0.62rem] font-semibold text-sand-50">
                  {i + 1}
                </span>
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="font-display text-2xl font-semibold text-ink">{title}</h2>
                  <span className={cn("rounded-full px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-eyebrow", STATUS[status].className)}>
                    {label ?? STATUS[status].label}
                  </span>
                </div>
                <div className="mt-3 space-y-3 leading-relaxed text-ink-soft">{body}</div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-forest-900 text-sand-50">
        <div className="container-editorial py-14 sm:py-20">
          <p className="eyebrow text-sand-100/60">If something isn&apos;t right</p>
          <h2 className="mt-3 max-w-2xl font-display text-[clamp(1.9rem,3vw,2.6rem)] font-semibold leading-[1.08]">
            No one should feel pressured into a stay.
          </h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-sand-100/85">
            Either of you can decide it doesn&apos;t feel like the right fit — before you travel or once you&apos;re there.
          </p>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <div className="rounded-xl2 border border-sand-50/15 p-6 sm:p-7">
              <p className="font-display text-xl font-semibold">A mismatch or a problem</p>
              <p className="mt-3 leading-relaxed text-sand-100/85">
                Talk to each other first — most things are misunderstandings about hours, food or space. If that doesn&apos;t
                fix it, or you&apos;d rather not, contact us and we&apos;ll help, including with changing or ending the stay.
              </p>
              <a href={`mailto:${brand.contactEmail}`} className="mt-4 inline-block text-sand-50 underline underline-offset-4">
                {brand.contactEmail}
              </a>
            </div>
            <div className="rounded-xl2 border border-earth-400/60 bg-sand-50/[0.04] p-6 sm:p-7">
              <p className="font-display text-xl font-semibold">If you&apos;re in danger</p>
              <p className="mt-3 leading-relaxed text-sand-100/85">
                Leave the situation if you can do so safely, and contact the local emergency services or police straight away.
                Once you&apos;re safe, tell us what happened.
              </p>
              <p className="mt-4 text-sm text-sand-100/70">
                Spend Time Off Grid isn&apos;t an emergency service and can&apos;t send help — always call local emergency
                numbers first.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="container-editorial py-14 text-center sm:py-20">
        <p className="mx-auto max-w-xl font-display text-2xl text-ink">Ready to find somewhere?</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/experiences" className="rounded-full bg-forest-700 px-6 py-3 text-xs font-medium uppercase tracking-eyebrow text-sand-50 hover:bg-forest-800">
            Explore stays
          </Link>
          <Link href="/host" className="rounded-full border border-forest-700/30 px-6 py-3 text-xs font-medium uppercase tracking-eyebrow text-forest-800 hover:border-forest-700">
            List your land
          </Link>
        </div>
      </section>
    </>
  );
}
