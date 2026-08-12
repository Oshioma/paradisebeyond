"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { updateDemoState } from "@/lib/demo/state";
import type { FlightDetails } from "@/lib/booking/types";

/**
 * Save the guest's flight details so the retreat organiser can coordinate
 * transfers. We never sell flights — the guest arranges their own and enters
 * them here once booked.
 */
export async function saveFlightDetails(bookingId: string, formData: FormData) {
  const user = await requireUser();

  const flight: FlightDetails = {
    arrivalFlight: String(formData.get("arrivalFlight") ?? "").trim() || undefined,
    arrivalDate: String(formData.get("arrivalDate") ?? "").trim() || undefined,
    departureFlight: String(formData.get("departureFlight") ?? "").trim() || undefined,
    departureDate: String(formData.get("departureDate") ?? "").trim() || undefined,
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  };

  if (isSupabaseConfigured()) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient();
    // RLS ensures the guest can only write flight_details for their own booking.
    await supabase.from("flight_details").upsert(
      {
        booking_id: bookingId,
        arrival_flight: flight.arrivalFlight,
        arrival_time: flight.arrivalDate ? new Date(flight.arrivalDate).toISOString() : null,
        departure_flight: flight.departureFlight,
        departure_time: flight.departureDate ? new Date(flight.departureDate).toISOString() : null,
        notes: flight.notes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "booking_id" },
    );
  } else {
    void user;
    updateDemoState((s) => {
      s.flights[bookingId] = flight;
    });
  }

  revalidatePath(`/account/trips/${bookingId}`);
}
