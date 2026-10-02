import { formatFullDate } from "@/lib/utils";

/**
 * Spend Time Off Grid emails for stay requests and check-ins. Inline styles
 * for email-client support, in the forest / cream palette. Server-only.
 */

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function shell(heading: string, body: string, cta?: { href: string; label: string }) {
  return `
  <div style="font-family:Georgia,serif;background:#faf7f2;padding:32px;color:#1c1a16">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #eee">
      <div style="background:#1c2a1f;color:#faf7f2;padding:26px">
        <div style="font-size:12px;letter-spacing:.2em;text-transform:uppercase;opacity:.8">Spend Time Off Grid</div>
        <div style="font-size:24px;margin-top:8px">${heading}</div>
      </div>
      <div style="padding:26px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#3a352c">
        ${body}
        ${cta ? `<p style="text-align:center;margin:28px 0 8px"><a href="${cta.href}" style="background:#2f4a33;color:#faf7f2;text-decoration:none;padding:14px 28px;border-radius:999px;font-size:13px;letter-spacing:.12em;text-transform:uppercase">${cta.label}</a></p>` : ""}
      </div>
    </div>
  </div>`;
}

const quote = (s: string) =>
  `<div style="background:#f4efe6;border-radius:10px;padding:14px 16px;white-space:pre-line">${esc(s)}</div>`;

const stayLine = (r: { arrival: string; nights: number; guests: number }) =>
  `${formatFullDate(r.arrival)} · ${r.nights} nights · ${r.guests} ${r.guests === 1 ? "traveller" : "travellers"}`;

export function requestReceivedEmail(p: { origin: string; guestName: string; listing: string; arrival: string; nights: number; guests: number; introduction: string }) {
  return {
    subject: `${p.guestName} would like to stay at ${p.listing}`,
    html: shell(
      "A new stay request",
      `<p><strong>${esc(p.guestName)}</strong> would like to stay at <strong>${esc(p.listing)}</strong>.</p>
       <p style="color:#6b6357">${stayLine(p)}</p>
       <p>Here's how they introduced themselves:</p>${quote(p.introduction)}
       <p>Nothing is booked or charged until you accept. If it doesn't feel like the right fit, it's fine to decline.</p>`,
      { href: `${p.origin}/studio/requests`, label: "Reply to the request" },
    ),
  };
}

export function requestDecidedEmail(p: { origin: string; listing: string; departureId: string; accepted: boolean; hostNote?: string; arrival: string; nights: number; guests: number }) {
  const note = p.hostNote ? `<p>Your host added:</p>${quote(p.hostNote)}` : "";
  return p.accepted
    ? {
        subject: `Your host said yes — ${p.listing}`,
        html: shell(
          "Your host said yes",
          `<p>Good news — your request to stay at <strong>${esc(p.listing)}</strong> was accepted.</p>
           <p style="color:#6b6357">${stayLine(p)}</p>${note}
           <p>Confirm your stay to hold your place. Then use your stay page to message each other, have a video call and agree arrival details.</p>`,
          { href: `${p.origin}/book/${p.departureId}`, label: "Confirm your stay" },
        ),
      }
    : {
        subject: `About your request — ${p.listing}`,
        html: shell(
          "Not this time",
          `<p>Your host at <strong>${esc(p.listing)}</strong> isn't able to host you for these dates.</p>${note}
           <p>Nothing was booked or charged. There are other places worth getting your hands dirty for.</p>`,
          { href: `${p.origin}/experiences`, label: "Find another stay" },
        ),
      };
}

export function checkinEmail(p: { origin: string; bookingId: string; kind: "arrival" | "settled"; listing: string }) {
  const arrival = p.kind === "arrival";
  return {
    subject: arrival ? "Have you arrived safely?" : "Everything okay with your stay?",
    html: shell(
      arrival ? "Have you arrived safely?" : "Everything okay with your stay?",
      `<p>${arrival ? `Today's the day you arrive at <strong>${esc(p.listing)}</strong>.` : `You've had your first night at <strong>${esc(p.listing)}</strong>.`} Let us know with one tap.</p>
       <p style="color:#6b6357">If you're ever in danger, leave if you can do so safely and call the local emergency services first — we can't send help ourselves.</p>`,
      { href: `${p.origin}/account/trips/${p.bookingId}#check-in`, label: arrival ? "I've arrived / I need help" : "All good / I have a problem" },
    ),
  };
}

export function supportAlertEmail(p: { origin: string; reason: "help" | "no-reply"; kind: "arrival" | "settled"; reference: string; listing: string; travellerName: string; travellerEmail?: string; note?: string }) {
  const what =
    p.reason === "help"
      ? `${p.kind === "arrival" ? "said they need help on arrival" : "reported a problem with their stay"}`
      : "hasn't answered their arrival check-in after 24 hours";
  return {
    subject: `[Check-in] ${p.reason === "help" ? "Help requested" : "No reply"} — ${p.reference}`,
    html: shell(
      p.reason === "help" ? "A traveller asked for help" : "No reply to an arrival check-in",
      `<p><strong>${esc(p.travellerName)}</strong> ${what}.</p>
       <p style="color:#6b6357">Stay: ${esc(p.listing)} · Ref ${esc(p.reference)}${p.travellerEmail ? ` · ${esc(p.travellerEmail)}` : ""}</p>
       ${p.note ? `<p>They wrote:</p>${quote(p.note)}` : ""}
       <p>Please get in touch with them directly.</p>`,
    ),
  };
}
