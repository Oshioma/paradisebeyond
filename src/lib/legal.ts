/**
 * Single source of truth for the trading identity, contact route and policy
 * dates used by the legal pages and the site footer. Change it here and every
 * surface (Terms, Privacy, footer, emails) follows.
 *
 * Paradise Beyond trades as a UK sole trader, not a limited company, so there
 * is no company number — the trader's own name is the legal counterparty and
 * must appear on the consumer-facing terms.
 */
export const LEGAL = {
  /** The legal person behind the trading name. */
  traderName: "Oshi Okomilo",
  tradingName: "Paradise Beyond",
  /** How the counterparty must be described in a contract. */
  legalEntity: "Oshi Okomilo, trading as Paradise Beyond",
  /**
   * Postal address for service and for data-subject correspondence. UK GDPR
   * expects a controller's address to be reachable — swap the placeholder for
   * the real trading address before launch.
   */
  address: "[Trading address — line 1], [Town], [Postcode], United Kingdom",
  /** The one published contact route for legal, booking and privacy queries. */
  email: "paradisebeyond@guestlist.net",
  jurisdiction: "England and Wales",
  /** Supervisory authority for data-protection complaints. */
  regulator: {
    name: "Information Commissioner's Office (ICO)",
    url: "https://ico.org.uk/make-a-complaint/",
  },
  /** Shown on both policies; bump when the wording materially changes. */
  lastUpdated: "8 September 2026",
  /** Platform commission, mirrored from DEFAULT_COMMISSION_BPS (1500 bps). */
  commissionPercent: 15,
} as const;
