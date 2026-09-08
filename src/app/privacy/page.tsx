import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL } from "@/lib/legal";
import {
  LegalShell,
  Section,
  P,
  Bullets,
  DefRow,
  Callout,
  ContactEmail,
} from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Paradise Beyond collects, uses, shares and protects your personal data — what we hold, why, who we share it with, and the rights you have under UK GDPR.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalShell
      eyebrow="Legal"
      title="Privacy Policy"
      intro="What personal data we hold about you, why we hold it, who else sees it, and how to get it changed or deleted. Written to be read, not skimmed past."
    >
      <Section n={1} title="Who controls your data">
        <P>
          <strong>{LEGAL.traderName}</strong>, trading as <strong>{LEGAL.tradingName}</strong>, is
          the data controller for the personal data described here. We are a sole trader established
          in the United Kingdom, at {LEGAL.address}.
        </P>
        <P>
          For anything about your data — a copy of it, a correction, a deletion — email{" "}
          <ContactEmail />. That address reaches us directly and is the fastest route.
        </P>
        <P>
          We handle personal data under the UK GDPR and the Data Protection Act 2018. Where we serve
          guests and hosts in the EU, the EU GDPR applies to that processing too.
        </P>
      </Section>

      <Section n={2} title="What we collect">
        <div className="space-y-3">
          <DefRow term="Account and identity">
            Your name, email address, password (stored only as a hash, never in readable form), and
            the role your account holds — guest, host or staff.
          </DefRow>
          <DefRow term="Booking data">
            The experience and departure you booked, room type, guest count, price, deposit and
            balance, booking reference, payment status, and your flight arrival and departure
            details when you give them to us.
          </DefRow>
          <DefRow term="Trip preparation — including health information">
            Dietary requirements, medical information relevant to the trip, experience level, and
            your emergency contact&rsquo;s name and phone number. Dietary and medical details are{" "}
            <strong>special category data</strong>; see section 4.
          </DefRow>
          <DefRow term="Host applications and listings">
            If you apply to host: your name, email, links to your work, your background and
            experience, your retreat idea, proposed destination, dates, pricing, group size and
            accommodation, plus verification material we ask for before you go live.
          </DefRow>
          <DefRow term="Messages, reviews and memories">
            Messages exchanged between guests and hosts through the platform, reviews and ratings
            you write, and the photos and notes you contribute to a trip&rsquo;s shared memories.
          </DefRow>
          <DefRow term="Images you upload">
            Photos you or your host upload for listings, profiles and memories, and the technical
            metadata attached to them.
          </DefRow>
          <DefRow term="Payment data">
            Card payments go directly to Stripe. We receive and store confirmation of the payment —
            amount, currency, status, and a payment reference — never your full card number.
          </DefRow>
          <DefRow term="Technical data">
            IP address, browser and device type, pages viewed, and server logs, collected when you
            use the site and needed to keep it secure and working.
          </DefRow>
        </div>
      </Section>

      <Section n={3} title="Why we use it, and our lawful basis">
        <Bullets
          items={[
            <>
              <strong>To take and run your booking</strong> — confirmations, balance reminders,
              trip information, passing what the host needs to run your retreat.{" "}
              <em>Basis: performance of our contract with you.</em>
            </>,
            <>
              <strong>To run your account</strong> — signing in, resetting a password, showing your
              trips and saved experiences. <em>Basis: performance of our contract.</em>
            </>,
            <>
              <strong>To take payment and pay hosts</strong> — including our commission split and
              refunds. <em>Basis: performance of our contract, and legal obligation for records.</em>
            </>,
            <>
              <strong>To review and verify hosts</strong> — assessing applications, checking
              insurance and permits, keeping guests safe. <em>Basis: legitimate interests in a safe,
              curated marketplace.</em>
            </>,
            <>
              <strong>To improve the site and prevent abuse</strong> — diagnostics, security logs,
              fraud prevention. <em>Basis: legitimate interests.</em>
            </>,
            <>
              <strong>To publish your review</strong> alongside the experience.{" "}
              <em>Basis: legitimate interests, and consent for any photo you attach.</em>
            </>,
            <>
              <strong>To send marketing</strong> — occasional emails about new experiences.{" "}
              <em>Basis: consent, or the soft opt-in for existing customers. Every one has an
              unsubscribe link.</em>
            </>,
            <>
              <strong>To meet legal and tax obligations</strong> — keeping transaction records.{" "}
              <em>Basis: legal obligation.</em>
            </>,
          ]}
        />
        <P>
          Where we rely on legitimate interests, we have weighed our interest against your rights,
          and you can object at any time (section 8).
        </P>
      </Section>

      <Section n={4} title="Health and dietary information">
        <Callout title="We only ask for this so your trip is safe">
          <p>
            Dietary needs, allergies and medical information are special category data. We collect
            them only through the trip questionnaire, only for a trip you have booked, and we use
            them for one purpose: so your host can feed you safely, adapt activities and respond in
            an emergency.
          </p>
        </Callout>
        <P>
          Our lawful basis is your <strong>explicit consent</strong>, given when you complete the
          questionnaire. You do not have to give this information — but a host may not be able to
          accommodate a need they do not know about. You can withdraw consent or amend what you told
          us at any time from your trip page, or by emailing <ContactEmail />.
        </P>
        <P>
          We share these details only with the host running your retreat, and with emergency
          services or medical staff if your safety requires it.
        </P>
      </Section>

      <Section n={5} title="Who we share it with">
        <P>We never sell your personal data. We share it only in these cases:</P>
        <div className="space-y-3">
          <DefRow term="Your host">
            Your name, guest count, room, flight details and trip-preparation answers, so they can
            run the retreat you booked. Hosts are separate controllers for what they then do with
            it, and are contractually bound to use it only for your trip.
          </DefRow>
          <DefRow term="Stripe — payments">
            Payment and payout processing, including host payouts and refunds. Stripe is an
            independent controller for its own fraud and compliance purposes.
          </DefRow>
          <DefRow term="Supabase — database, authentication and file storage">
            Hosts our database, sign-in system and uploaded images, as our processor.
          </DefRow>
          <DefRow term="Resend — transactional email">
            Delivers booking confirmations, balance reminders and account emails, as our processor.
          </DefRow>
          <DefRow term="Vercel — hosting">
            Serves the website and holds the request logs that come with it, as our processor.
          </DefRow>
          <DefRow term="Anthropic — AI drafting assistance for hosts">
            When a host uses the retreat builder&rsquo;s drafting help, the listing text they are
            writing is sent to Anthropic&rsquo;s API to generate suggestions. Guest personal data is
            not sent, and the content is not used to train models.
          </DefRow>
        </div>
        <P>
          We will also disclose data where the law requires it, to establish or defend legal claims,
          or to protect someone&rsquo;s safety. If the business is ever sold or transferred, data
          moves with it, and we will tell you first.
        </P>
      </Section>

      <Section n={6} title="Where your data goes">
        <P>
          Some of our providers process data outside the UK, including in the United States, and
          your host is likely to be in your destination country — Tanzania, for our Zanzibar
          retreats. Where data leaves the UK we rely on UK adequacy regulations where they exist, or
          on the International Data Transfer Agreement or the UK Addendum to the EU Standard
          Contractual Clauses, with additional safeguards where needed.
        </P>
      </Section>

      <Section n={7} title="How long we keep it">
        <Bullets
          items={[
            "Booking and payment records: 7 years after the trip, to meet UK tax and accounting rules.",
            "Account data: while your account is open, then 12 months after you close it.",
            "Trip questionnaires, including health and dietary details: deleted 90 days after your trip ends, unless we need them for an open complaint or claim.",
            "Messages between you and your host: 3 years after the trip, so we can resolve disputes.",
            "Reviews and trip memories: published until you ask us to remove them.",
            "Host applications that are not approved: 12 months, then deleted.",
            "Server and security logs: up to 12 months.",
            "Marketing consent records: until you unsubscribe, plus 2 years as proof of consent.",
          ]}
        />
      </Section>

      <Section n={8} title="Your rights">
        <P>Under UK GDPR you can ask us to:</P>
        <Bullets
          items={[
            "give you a copy of the personal data we hold about you;",
            "correct anything inaccurate or incomplete;",
            "delete your data, where we have no continuing reason to keep it;",
            "restrict how we use it while a concern is investigated;",
            "send your data to you, or another provider, in a portable format;",
            "stop processing based on legitimate interests, including profiling;",
            "stop sending marketing, at any time and without a reason; and",
            "withdraw a consent you gave — for health information, or for a photo — without affecting what we did lawfully before you withdrew it.",
          ]}
        />
        <P>
          Email <ContactEmail /> and we will respond within one month. We may ask you to confirm
          your identity first. There is no charge unless a request is clearly excessive.
        </P>
        <P>
          You can also complain to the {LEGAL.regulator.name} at{" "}
          <a
            href={LEGAL.regulator.url}
            target="_blank"
            rel="noreferrer"
            className="link-underline text-ink"
          >
            ico.org.uk
          </a>
          . We would rather hear from you first, so we can put it right.
        </P>
      </Section>

      <Section n={9} title="Cookies and what your browser stores">
        <P>
          We keep this light. We do not run advertising cookies and we do not track you across other
          websites.
        </P>
        <div className="space-y-3">
          <DefRow term="Strictly necessary cookies">
            Keep you signed in, keep your session secure, and remember which view you are using.
            These cannot be switched off without breaking the site, and they do not need consent.
          </DefRow>
          <DefRow term="Local storage on your device">
            Your saved experiences (the wishlist), a packing-list you tick off, and a host&rsquo;s
            in-progress retreat draft are kept in your own browser so they survive a refresh. This
            never reaches our servers unless you save it to your account, and clearing your browser
            data removes it.
          </DefRow>
        </div>
        <P>
          If we ever add analytics or marketing cookies, we will ask for your consent first and give
          you a way to change your mind.
        </P>
      </Section>

      <Section n={10} title="Keeping it safe">
        <P>
          The site runs over HTTPS. Passwords are hashed, never stored in readable form. Database
          access is restricted by row-level security so accounts only reach their own records, and
          admin areas require a verified staff role. Payment card details never touch our servers.
        </P>
        <P>
          No system is perfect. If a breach ever puts your rights at risk, we will tell you and the
          ICO without undue delay.
        </P>
      </Section>

      <Section n={11} title="Children">
        <P>
          Paradise Beyond is for adults. You must be 18 or over to hold an account or make a
          booking. Where a child travels as part of a booking, the adult who booked provides their
          details and is responsible for them. If you believe a child has given us data directly,
          email <ContactEmail /> and we will delete it.
        </P>
      </Section>

      <Section n={12} title="Changes to this policy">
        <P>
          We update this policy when what we do with data changes. The date at the top shows the
          current version. If a change materially affects you, we will email you before it takes
          effect.
        </P>
      </Section>

      <Section n={13} title="Contact us">
        <P>
          {LEGAL.legalEntity}
          <br />
          {LEGAL.address}
          <br />
          <ContactEmail />
        </P>
        <P>
          For the terms that govern bookings, see our{" "}
          <Link href="/terms" className="link-underline text-ink">
            Terms &amp; Conditions
          </Link>
          .
        </P>
      </Section>
    </LegalShell>
  );
}
