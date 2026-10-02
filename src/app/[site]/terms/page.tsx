import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL } from "@/lib/legal";
import {
  LegalShell,
  Section,
  P,
  Bullets,
  Callout,
  ContactEmail,
} from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "The terms on which you book and host retreats through Paradise Beyond — bookings, deposits, balances, cancellations, flights and liability.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalShell
      eyebrow="Legal"
      title="Terms & Conditions"
      intro="These terms govern your use of Paradise Beyond and any booking you make through us. Please read them before you reserve a place — booking means you accept them."
    >
      <Section n={1} title="Who we are">
        <P>
          Paradise Beyond is operated by <strong>{LEGAL.traderName}</strong>, trading as{" "}
          <strong>{LEGAL.tradingName}</strong>, a sole trader established in the United Kingdom
          (&ldquo;Paradise Beyond&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;). Our trading address is {LEGAL.address}.
        </P>
        <P>
          The only contact route for legal, booking and account matters is <ContactEmail />. We
          answer everything sent there — there is no separate support desk.
        </P>
        <P>
          In these terms, a <strong>host</strong> is the person or business that creates and runs a
          retreat, a <strong>guest</strong> is the person who books a place on it, and an{" "}
          <strong>experience</strong> is a 7 or 14-day retreat listed on the site.
        </P>
      </Section>

      <Section n={2} title="What Paradise Beyond is — and is not">
        <P>
          Paradise Beyond is a curated marketplace. We publish experiences, take bookings and
          collect payment <strong>as agent for the host</strong>. The host is the supplier of the
          retreat: they design the programme, provide or arrange the accommodation, activities,
          food and guiding, and they are responsible for delivering what their listing describes.
        </P>
        <P>
          When you book, your contract for the retreat itself is with the host. Your contract with
          us is for the booking service — the platform, the payment handling, and the support we
          provide around it. We are not the operator of the retreat and we do not own or run the
          accommodation, vehicles, boats, dive centres or activities involved.
        </P>
        <Callout title="This is not a package holiday">
          <p>
            We sell the experience on the ground only. Because your international travel is arranged
            separately by you, what you book through us is not a &ldquo;package&rdquo; under the UK
            Package Travel and Linked Travel Arrangements Regulations 2018, and the insolvency and
            refund protections specific to packages do not apply.
          </p>
        </Callout>
      </Section>

      <Section n={3} title="Eligibility and your account">
        <P>
          You must be at least 18 years old to book or to hold an account. If you book for other
          people, you confirm you are authorised to accept these terms on their behalf and that you
          are responsible for passing on everything we send you about the trip.
        </P>
        <Bullets
          items={[
            "Keep your account details accurate — we use the email on your account for booking confirmations, balance reminders and trip information.",
            "Keep your password to yourself. You are responsible for activity on your account until you tell us it has been compromised.",
            "One person, one account. Don't share, sell or transfer an account.",
            "We may suspend or close an account that is used fraudulently, abusively, or in breach of these terms.",
          ]}
        />
      </Section>

      <Section n={4} title="Listings, prices and availability">
        <P>
          Hosts write their own listings. We curate and review what goes live, but the detail of an
          experience — its itinerary, inclusions, rooms and dates — comes from the host, and they
          are responsible for its accuracy.
        </P>
        <Bullets
          items={[
            "Prices are shown per guest in the currency stated on the listing, and include the room type you select.",
            "Availability is per departure. A place is only held once your deposit has been taken.",
            "We correct obvious errors. If a price or an inclusion is plainly wrong, we may cancel an affected booking and refund you in full rather than hold you to it.",
            "Photography is indicative of the place and the experience. Rooms, boats and menus vary.",
          ]}
        />
      </Section>

      <Section n={5} title="Booking, deposits and the balance">
        <P>
          You can reserve a place with a deposit or pay in full. Your booking is confirmed when we
          take that first payment and send you a confirmation email with a booking reference — not
          when you submit the form.
        </P>
        <Bullets
          items={[
            <>
              <strong>The deposit</strong> secures your place and is shown before you pay. It is
              non-refundable except where these terms say otherwise.
            </>,
            <>
              <strong>The balance</strong> is due the number of days before departure stated on your
              booking and in your confirmation. We will remind you by email.
            </>,
            <>
              <strong>If the balance is not paid</strong> by its due date, the host may treat the
              booking as cancelled by you and release your place. The deposit is not returned in
              that case.
            </>,
            <>
              <strong>Promotional codes</strong> apply on the terms shown at the time, cannot be
              applied after booking, and have no cash value.
            </>,
          ]}
        />
      </Section>

      <Section n={6} title="Payments and our commission">
        <P>
          Card payments are processed by Stripe. We do not see or store your full card number. By
          paying you also accept Stripe&rsquo;s terms as the payment processor.
        </P>
        <P>
          Paradise Beyond earns a commission of {LEGAL.commissionPercent}% of the booking value,
          which is taken from what you pay and retained by us; the remainder is paid to the host.
          The commission rate that applies to your booking is fixed at the moment you book, so later
          changes never affect a booking already made. You pay the price shown — the commission is
          not added on top.
        </P>
        <P>
          You are responsible for any bank or currency-conversion charges your own card issuer
          applies, and for local taxes, tips and fees payable in the destination that the listing
          says are not included.
        </P>
      </Section>

      <Section n={7} title="Flights and getting there">
        <Callout title="Your international flights are not included">
          <p>
            Paradise Beyond experiences start and end at the destination. You arrange and pay for
            your own international travel, and you are responsible for getting yourself there on
            time. We strongly recommend you do not book flights until your place is confirmed.
          </p>
        </Callout>
        <P>
          If a listing includes an airport transfer, the arrival and departure windows it covers are
          stated on the listing. Tell us your flight details in your trip dashboard as soon as you
          have them so the host can plan the transfer.
        </P>
        <P>
          If you miss part of a retreat because of a delayed, cancelled or missed flight, no refund
          is due from us or the host. This is what travel insurance is for.
        </P>
      </Section>

      <Section n={8} title="Passports, visas, health and insurance">
        <Bullets
          items={[
            "You are responsible for a valid passport, any visa or entry permit, and any vaccination or health requirement for your destination and for any country you transit.",
            "Comprehensive travel insurance is a condition of booking. It must cover medical treatment and repatriation, and — for retreats with diving, surfing, climbing, riding or similar — the specific activities on the itinerary.",
            "Tell us about medical conditions, allergies, dietary needs and mobility needs in your trip questionnaire before departure, so the host can prepare or tell us honestly if they cannot accommodate them.",
            "Some activities carry inherent risk. Hosts may reasonably refuse participation in a specific activity on safety grounds.",
          ]}
        />
      </Section>

      <Section n={9} title="Changes and cancellations by you">
        <P>
          Cancellation terms are set by the host for each experience and shown on the listing and at
          checkout. Those terms apply to your booking in addition to this section. Cancel by
          emailing <ContactEmail /> from the address on your booking — a cancellation takes effect
          on the day we receive it.
        </P>
        <Bullets
          items={[
            "The deposit is non-refundable in all cases where you cancel.",
            "Anything you have paid beyond the deposit is refunded according to the host's cancellation terms for that experience.",
            "Changes — different dates, a different room, more or fewer guests — depend on availability and on the host agreeing. A change may cost more; it will never cost less than the deposit you have already paid.",
            "You may transfer a place to someone else, with the host's agreement, up to 14 days before departure. Any difference in price is payable, and the new guest must accept these terms.",
            "No refund is due for arriving late, leaving early, or not using part of the programme.",
          ]}
        />
        <P>
          If you are booking as a consumer in the UK or EU, the 14-day right to change your mind
          does not usually apply to travel and leisure services provided on a specific date. Nothing
          in these terms affects your legal rights where it does apply.
        </P>
      </Section>

      <Section n={10} title="Changes and cancellations by the host or by us">
        <P>
          Retreats depend on people, weather and places. If the host makes a{" "}
          <strong>minor change</strong> — a swapped activity, a reordered day, an equivalent room —
          we will tell you, and the booking continues.
        </P>
        <P>
          If the host makes a <strong>significant change</strong> (a change of dates, a materially
          different location, or a substantial cut to what is included), or cancels the departure,
          you may choose one of the following:
        </P>
        <Bullets
          items={[
            "accept the change;",
            "move to another departure or another experience of comparable value, paying or being refunded any difference; or",
            "cancel and receive a full refund of everything you have paid us, including the deposit.",
          ]}
        />
        <P>
          We may also cancel a booking where a departure does not reach its minimum group size,
          where a host fails our verification or safety standards, or where circumstances beyond
          reasonable control (extreme weather, civil unrest, epidemic, government restriction,
          transport failure) make running the retreat unsafe or impossible. In those cases you get a
          full refund of what you have paid us. We are not responsible for what you have spent
          elsewhere — flights especially.
        </P>
        <P>Refunds are made to the original payment method and typically take 5–10 working days.</P>
      </Section>

      <Section n={11} title="Behaviour on a retreat">
        <P>
          Retreats are small and shared. The host may ask a guest to leave, without refund, where
          their behaviour endangers others, damages property, breaks local law, or persistently
          ruins the experience for the group. You are responsible for damage you cause and for the
          behaviour of anyone under 18 in your party.
        </P>
        <P>
          Respect the place: local customs, protected reefs and wildlife, and the privacy of other
          guests. Ask before photographing people.
        </P>
      </Section>

      <Section n={12} title="Reviews, photos and anything else you post">
        <P>
          Reviews, trip photos, memories and messages you submit stay yours. By posting them you
          give us a worldwide, non-exclusive, royalty-free licence to host, display and use them to
          promote the experience, the host and Paradise Beyond, until you ask us to stop.
        </P>
        <Bullets
          items={[
            "Only review an experience you actually went on, and keep it honest and first-hand.",
            "Don't post anything unlawful, abusive, discriminatory, or that identifies other guests without their agreement.",
            "Only upload images you took or have the right to use.",
            "We may remove content that breaks these rules, and we may decline to publish a review that is not about the experience.",
          ]}
        />
      </Section>

      <Section n={13} title="If you are a host">
        <P>
          These additional terms apply when you list or run an experience. They sit alongside any
          separate host agreement you sign with us; where the two conflict, the signed agreement
          wins.
        </P>
        <Bullets
          items={[
            "You must be legally entitled to run your retreat where you run it — licences, permits, insurance and local tax registration included — and you must hold public liability insurance appropriate to the activities you offer.",
            "Your listing must be accurate and your own. Don't publish photos, itineraries or copy you don't have the rights to.",
            "You must honour every confirmed booking on the terms shown at the time it was made, and the cancellation terms you published.",
            "We deduct our commission and pay out your net share on the payout schedule agreed with you, through Stripe. You are responsible for your own taxes.",
            "We may unpublish a listing, suspend a host account or withhold a payout where there is a credible safety concern, a verification failure, a serious guest complaint, or a breach of these terms.",
            "You appoint us as your agent to take bookings and collect payment for your experiences, and to issue refunds on your behalf in the circumstances set out above.",
          ]}
        />
      </Section>

      <Section n={14} title="Our site and our content">
        <P>
          The Paradise Beyond name, the site design, our editorial copy and our curation are ours
          and are protected by copyright and trade mark law. You may use the site to browse and book.
          You may not scrape it, copy it wholesale, resell our listings, or use our content to build
          a competing catalogue.
        </P>
        <P>
          We aim to keep the site available and accurate, but we may change, suspend or withdraw any
          part of it. Some pages are built on seed and demonstration data while we launch; those are
          not offers to sell.
        </P>
      </Section>

      <Section n={15} title="Our responsibility to you">
        <P>
          Because we act as agent, we are not liable for how a host performs the retreat itself. We{" "}
          <em>are</em> responsible for providing the booking service with reasonable care and skill,
          for taking and handling your payments correctly, and for our own acts and omissions.
        </P>
        <Bullets
          items={[
            "We do not exclude or limit liability for death or personal injury caused by our negligence, for fraud, or for anything else the law does not allow us to limit.",
            "We are not liable for loss you could not reasonably have expected when you booked — including flights, connecting travel, lost earnings or the value of a trip you chose not to take.",
            "Where we are liable for a booking, our liability to you is limited to the total amount you paid us for it.",
            "We are not liable for failures caused by events beyond reasonable control.",
          ]}
        />
        <P>
          If you are a consumer, you always keep your statutory rights under the Consumer Rights Act
          2015. Nothing here takes those away.
        </P>
      </Section>

      <Section n={16} title="If something goes wrong">
        <P>
          Raise it with your host during the retreat if you can — most things can be fixed on the
          spot. If it cannot be, email <ContactEmail /> with your booking reference. We will
          acknowledge within 5 working days and aim to resolve it within 28 days, working with the
          host on your behalf.
        </P>
        <P>
          If you are still unhappy, you keep the right to take the matter to court. UK and EU
          consumers can also use the relevant online dispute-resolution channels available to them.
        </P>
      </Section>

      <Section n={17} title="Changes to these terms">
        <P>
          We may update these terms — for new features, or because the law changes. The version in
          force for your booking is the one published when you booked, and we will not change the
          commercial terms of a confirmed booking without your agreement. The date at the top of
          this page tells you when it was last revised.
        </P>
      </Section>

      <Section n={18} title="Governing law and contact">
        <P>
          These terms are governed by the law of {LEGAL.jurisdiction}, and the courts of{" "}
          {LEGAL.jurisdiction} have jurisdiction. If you live elsewhere in the UK or in the EU, you
          keep the protection of the mandatory consumer law of your home country and may bring
          proceedings there.
        </P>
        <P>
          Write to us at <ContactEmail />, or {LEGAL.address}. For how we handle your personal data,
          see our{" "}
          <Link href="/privacy" className="link-underline text-ink">
            Privacy Policy
          </Link>
          .
        </P>
      </Section>
    </LegalShell>
  );
}
