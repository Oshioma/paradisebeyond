import { z } from "zod";

/**
 * Host application schema. Shared between the client form and (once wired) the
 * server action that persists to `host_applications`. Validating in one place
 * keeps the trust boundary honest — the server will re-run this on submit.
 */
export const hostApplicationSchema = z.object({
  name: z.string().min(2, "Please enter your name"),
  email: z.string().email("Enter a valid email"),
  links: z.string().optional(),
  experience: z.string().min(20, "Tell us a little more (20+ characters)"),
  background: z.string().min(10, "A sentence or two on your background"),
  destination: z.string().min(2, "Where would you host?"),
  retreatIdea: z.string().min(20, "Describe your retreat idea (20+ characters)"),
  duration: z.enum(["7", "14"]),
  approxDates: z.string().min(2, "Roughly when?"),
  expectedPriceUsd: z.coerce.number().int().positive("Enter an expected price"),
  expectedGroupSize: z.coerce.number().int().positive("Enter a group size"),
  accommodation: z.string().min(5, "Where would guests stay?"),
  description: z.string().min(20, "A short description (20+ characters)"),
});

export type HostApplicationInput = z.infer<typeof hostApplicationSchema>;
