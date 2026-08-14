import { z } from "zod";

/**
 * Host application schema. Shared between the client form and (once wired) the
 * server action that persists to `host_applications`. Validating in one place
 * keeps the trust boundary honest — the server will re-run this on submit.
 */
export const hostApplicationSchema = z.object({
  name: z.string().min(2, "Please enter your name").max(120),
  email: z.string().email("Enter a valid email").max(200),
  links: z.string().max(500).optional(),
  experience: z.string().min(20, "Tell us a little more (20+ characters)").max(4000),
  background: z.string().min(10, "A sentence or two on your background").max(4000),
  destination: z.string().min(2, "Where would you host?").max(200),
  retreatIdea: z.string().min(20, "Describe your retreat idea (20+ characters)").max(4000),
  duration: z.enum(["7", "14"]),
  approxDates: z.string().min(2, "Roughly when?").max(200),
  expectedPriceUsd: z.coerce.number().int().positive("Enter an expected price").max(1_000_000, "That price looks too high"),
  expectedGroupSize: z.coerce.number().int().positive("Enter a group size").max(100, "That group size looks too high"),
  accommodation: z.string().min(5, "Where would guests stay?").max(2000),
  description: z.string().min(20, "A short description (20+ characters)").max(4000),
});

export type HostApplicationInput = z.infer<typeof hostApplicationSchema>;
