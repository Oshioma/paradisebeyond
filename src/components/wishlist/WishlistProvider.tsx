"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/**
 * Wishlist (❤️). For the magazine MVP this persists to localStorage so guests
 * can save without an account. When auth lands, this provider hydrates from and
 * writes through to the `wishlists` table for signed-in users — the component
 * API stays identical.
 */

interface WishlistContextValue {
  saved: string[];
  isSaved: (slug: string) => boolean;
  toggle: (slug: string) => void;
  ready: boolean;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);
const STORAGE_KEY = "pb:wishlist";

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [saved, setSaved] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSaved(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch {
      /* ignore */
    }
  }, [saved, ready]);

  const toggle = useCallback((slug: string) => {
    setSaved((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  }, []);

  const value = useMemo<WishlistContextValue>(
    () => ({
      saved,
      ready,
      isSaved: (slug) => saved.includes(slug),
      toggle,
    }),
    [saved, ready, toggle],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}
