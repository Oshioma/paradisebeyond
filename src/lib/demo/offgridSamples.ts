import type { Departure, Experience, Host } from "@/lib/types";
import { emptyOffGrid, type OffGridDetails } from "@/lib/offgrid/types";

/**
 * DEMO MODE ONLY — sample Spend Time Off Grid listings so the off-grid pages,
 * cards and booking flow can be exercised without a database (the same role
 * the Paradise Beyond seed plays in demo mode). They are never served when
 * Supabase is configured, and deliberately carry NO reviews, bookings or
 * statistics.
 */

function window(id: string, startDate: string, endDate: string, priceMinor: number, capacity: number): Departure {
  return {
    id,
    startDate,
    endDate,
    priceFromMinor: priceMinor,
    currency: "USD",
    capacity,
    spacesRemaining: capacity,
    depositMinor: 0,
    balanceDueDays: 0,
    status: "open",
  };
}

function og(patch: (o: OffGridDetails) => void): OffGridDetails {
  const o = emptyOffGrid();
  patch(o);
  return o;
}

function sample(p: {
  slug: string;
  name: string;
  strapline: string;
  location: string;
  category: Experience["categorySlugs"][number];
  host: string;
  story: string[];
  offGrid: OffGridDetails;
  windows: Departure[];
  room: { name: string; occupancy: "private" | "shared" };
}): Experience {
  return {
    slug: p.slug,
    name: p.name,
    strapline: p.strapline,
    duration: 7,
    destinationSlug: "",
    location: p.location,
    categorySlugs: [p.category],
    hostSlugs: [p.host],
    verified: false,
    currency: "USD",
    priceFromMinor: p.offGrid.pricing.amountMinor,
    maxGroupSize: 4,
    heroImageSeed: `stog-${p.slug}-hero`,
    gallerySeeds: [`stog-${p.slug}-g0`, `stog-${p.slug}-g1`, `stog-${p.slug}-g2`],
    forYouIf: [],
    story: p.story,
    highlights: [],
    stay: {
      property: p.room.name,
      description: p.offGrid.stay.description,
      roomTypes: [{ id: `${p.slug}-r0`, name: p.room.name, description: p.offGrid.stay.description, occupancy: p.room.occupancy, priceDeltaMinor: 0 }],
      imageSeeds: [],
    },
    inclusions: [],
    exclusions: [],
    itinerary: [],
    departures: p.windows,
    featured: true,
    marketplace: "spendtimeoffgrid",
    offGrid: p.offGrid,
  };
}

export const OFFGRID_DEMO_HOSTS: Host[] = [
  { slug: "demo-mwanaisha", name: "Mwanaisha", headline: "Permaculture farmer, Pemba", bio: "Sample host profile for demo mode.", qualifications: [], specialisms: [], socials: [], verified: false, imageSeed: "stog-host-mwanaisha", since: 2026 },
  { slug: "demo-ines", name: "Inês", headline: "Natural builder, Alentejo", bio: "Sample host profile for demo mode.", qualifications: [], specialisms: [], socials: [], verified: false, imageSeed: "stog-host-ines", since: 2026 },
  { slug: "demo-gareth", name: "Gareth", headline: "Hill farmer & baker, Powys", bio: "Sample host profile for demo mode.", qualifications: [], specialisms: [], socials: [], verified: false, imageSeed: "stog-host-gareth", since: 2026 },
];

export const OFFGRID_DEMO_EXPERIENCES: Experience[] = [
  sample({
    slug: "tropical-permaculture-farm-pemba",
    name: "Live on a tropical permaculture farm",
    strapline: "Spice trees, food forest and long evenings by the fire.",
    location: "Pemba Island, Tanzania",
    category: "permaculture",
    host: "demo-mwanaisha",
    story: [
      "A family farm on the quieter island north of Zanzibar, slowly turned from tired cassava fields into a food forest of clove, banana, moringa and cassava again — this time in guilds.",
      "Mornings start early while it's cool. Afternoons are yours: the reef is a twenty-minute walk away.",
    ],
    room: { name: "Private hut", occupancy: "private" },
    windows: [
      window("og-pemba-1", "2026-11-01", "2027-01-31", 2200, 3),
      window("og-pemba-2", "2027-02-01", "2027-04-30", 2200, 3),
    ],
    offGrid: og((o) => {
      o.contribution = { hoursPerDay: 3, daysPerWeek: 5, description: "Mornings in the food forest alongside the family — planting, mulching, harvesting and helping in the kitchen garden.", typicalTasks: ["Planting and mulching", "Harvesting spices and fruit", "Watering the nursery", "Composting"], physicalDifficulty: "moderate", skillsRequired: [], skillsYouCanLearn: ["Food-forest design basics", "Swahili kitchen cooking", "Spice drying"] };
      o.stay = { minNights: 7, accommodationType: "Hut", privacy: "private", description: "A palm-thatched hut with a double bed, mosquito net and a view over the farm." };
      o.food = { mealsIncluded: true, mealsPerDay: 3, dietaryOptions: ["Vegetarian", "Vegan on request"], description: "Shared family meals — rice, coconut curries, fish from the village and whatever the farm is giving." };
      o.facilities = ["solar", "well-water", "composting-toilet", "shower", "mobile-signal"];
      o.lifeOffGrid = "Solar lights and phone charging in the main house; bucket showers with well water warmed by the sun.";
      o.practical = { gettingThere: "Fly or take the ferry to Pemba from Zanzibar, then a 40-minute taxi.", nearestAirport: "Pemba (PMA)", transfersAvailable: true, whatToBring: ["Head torch", "Light long sleeves", "Sturdy sandals", "Reef-safe sun cream"], childrenAllowed: false, petsAllowed: false, accessibility: "Uneven paths; not suitable for wheelchairs.", languages: ["Swahili", "English"], notes: "" };
      o.houseRules = "Modest dress in the village. No alcohol on the farm.";
      o.pricing = { unit: "day", amountMinor: 2200 };
    }),
  }),
  sample({
    slug: "cob-house-alentejo",
    name: "Help raise a cob house in the hills",
    strapline: "Earth, straw and lime under a big Alentejo sky.",
    location: "Alentejo, Portugal",
    category: "natural-building",
    host: "demo-ines",
    story: ["A small team building a two-room cob house by hand, from the land it stands on. Come for the walls, stay for the long lunches."],
    room: { name: "Shared bunkhouse", occupancy: "shared" },
    windows: [window("og-cob-1", "2027-03-01", "2027-06-30", 1500, 6)],
    offGrid: og((o) => {
      o.contribution = { hoursPerDay: 4, daysPerWeek: 5, description: "Mixing and placing cob, lime plastering and site work.", typicalTasks: ["Mixing cob", "Building walls", "Lime plaster"], physicalDifficulty: "demanding", skillsRequired: [], skillsYouCanLearn: ["Cob building", "Lime plastering", "Reading a site"] };
      o.stay = { minNights: 14, accommodationType: "Bunkhouse", privacy: "shared", description: "A timber bunkhouse sleeping four, with a shared outdoor kitchen." };
      o.food = { mealsIncluded: true, mealsPerDay: 2, dietaryOptions: ["Vegetarian"], description: "Lunch and dinner together, mostly from the garden." };
      o.facilities = ["solar", "rainwater", "hot-water", "composting-toilet", "shower", "wifi"];
      o.practical = { ...o.practical, gettingThere: "Train to Évora, then the host collects you.", nearestAirport: "Lisbon (LIS)", transfersAvailable: true, whatToBring: ["Work gloves", "Clothes you don't mind ruining"], languages: ["Portuguese", "English"] };
      o.pricing = { unit: "day", amountMinor: 1500 };
    }),
  }),
  sample({
    slug: "welsh-hill-farm-winter",
    name: "Sheep, sourdough and a slow Welsh winter",
    strapline: "Lambing prep, bread and a wood stove.",
    location: "Powys, Wales",
    category: "homesteads",
    host: "demo-gareth",
    story: ["A hill farm with a flock of Welsh Mountain sheep and a bakery oven that never quite goes cold."],
    room: { name: "Private room", occupancy: "private" },
    windows: [window("og-wales-1", "2026-12-01", "2027-03-31", 0, 2)],
    offGrid: og((o) => {
      o.contribution = { hoursPerDay: 3, daysPerWeek: 5, description: "Feeding rounds, fencing and early-morning bread.", typicalTasks: ["Feeding the flock", "Fencing", "Baking"], physicalDifficulty: "moderate", skillsRequired: [], skillsYouCanLearn: ["Sourdough", "Stock handling"] };
      o.stay = { minNights: 10, maxNights: 30, accommodationType: "Room", privacy: "private", description: "A small room in the farmhouse, warmed by the stove." };
      o.food = { mealsIncluded: true, mealsPerDay: 3, dietaryOptions: [], description: "Farmhouse cooking, and as much bread as you can eat." };
      o.facilities = ["mains", "hot-water", "conventional-toilet", "shower", "no-connectivity"];
      o.practical = { ...o.practical, gettingThere: "Train to Machynlleth; the farm is a 20-minute drive.", nearestAirport: "Manchester (MAN)", whatToBring: ["Waterproofs", "Wellies"], languages: ["English", "Welsh"] };
      o.pricing = { unit: "day", amountMinor: 0 };
    }),
  }),
];
