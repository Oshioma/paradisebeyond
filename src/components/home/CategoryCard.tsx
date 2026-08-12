import Image from "next/image";
import Link from "next/link";
import type { Category } from "@/lib/types";
import { img } from "@/lib/images";
import { categoryLabel } from "@/lib/data/categories";

export function CategoryCard({ category }: { category: Category }) {
  return (
    <Link
      href={`/categories/${category.slug}`}
      className="group relative flex aspect-[3/4] flex-col justify-end overflow-hidden rounded-xl2"
    >
      <Image
        src={img(category.imageSeed, 700, 933)}
        alt={categoryLabel(category)}
        fill
        sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 22vw"
        className="object-cover transition-transform duration-[1.4s] ease-out-soft group-hover:scale-110"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/20 to-transparent" />
      <div className="relative p-5">
        <h3 className="font-display text-xl font-semibold text-sand-50">
          {categoryLabel(category)}
        </h3>
        <p className="mt-1 max-w-[22ch] text-xs leading-relaxed text-sand-100/85 opacity-0 transition-all duration-500 ease-out-soft group-hover:opacity-100">
          {category.tagline}
        </p>
      </div>
    </Link>
  );
}
