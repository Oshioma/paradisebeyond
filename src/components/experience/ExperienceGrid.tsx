import type { Experience } from "@/lib/types";
import { ExperienceCard } from "./ExperienceCard";

export function ExperienceGrid({
  experiences,
  priorityCount = 0,
  linkMode = "marketplace",
}: {
  experiences: Experience[];
  priorityCount?: number;
  linkMode?: "marketplace" | "microsite";
}) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
      {experiences.map((e, i) => (
        <div key={e.slug} className="reveal" style={{ transitionDelay: `${(i % 3) * 70}ms` }}>
          <ExperienceCard experience={e} priority={i < priorityCount} linkMode={linkMode} />
        </div>
      ))}
    </div>
  );
}
