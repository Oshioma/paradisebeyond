"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Progressive enhancement: fade elements marked `.reveal` into view as they
 * enter the viewport. Without JS (or with reduced-motion) content is fully
 * visible, so this only ever adds polish — never hides content.
 */
export function RevealScript() {
  const pathname = usePathname();

  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    if (!("IntersectionObserver" in window) || els.length === 0) {
      els.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);

  return null;
}
