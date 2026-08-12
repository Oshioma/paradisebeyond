import type { Config } from "tailwindcss";

/**
 * Paradise Beyond design system.
 * Natural, warm, editorial. Colours are drawn from sand, clay, ocean and palm —
 * not a generic SaaS palette. Type pairs a high-contrast display serif with a
 * calm humanist sans.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Warm paper backgrounds
        sand: {
          50: "#faf7f2",
          100: "#f4efe6",
          200: "#e9e0d1",
          300: "#d8cab2",
        },
        // Deep ink / near-black with warmth
        ink: {
          DEFAULT: "#1c1a16",
          soft: "#3a352c",
          muted: "#6b6357",
        },
        // Ocean — primary accent
        ocean: {
          50: "#eef5f5",
          100: "#cfe3e3",
          500: "#2f6b6b",
          600: "#245757",
          700: "#1b4242",
        },
        // Clay / terracotta — warm accent for CTAs & urgency
        clay: {
          400: "#d98a5f",
          500: "#c9744a",
          600: "#a95b36",
        },
        // Palm — subtle success / nature
        palm: {
          500: "#5c7a52",
          600: "#48633f",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      fontSize: {
        // Editorial display scale
        "display-lg": ["clamp(2.75rem, 7vw, 6rem)", { lineHeight: "0.98", letterSpacing: "-0.02em" }],
        "display": ["clamp(2.25rem, 5vw, 4rem)", { lineHeight: "1.02", letterSpacing: "-0.015em" }],
        "headline": ["clamp(1.6rem, 3vw, 2.5rem)", { lineHeight: "1.08", letterSpacing: "-0.01em" }],
      },
      letterSpacing: {
        eyebrow: "0.22em",
      },
      maxWidth: {
        prose: "68ch",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      boxShadow: {
        soft: "0 20px 60px -30px rgba(28,26,22,0.35)",
        lift: "0 30px 80px -40px rgba(28,26,22,0.45)",
      },
      transitionTimingFunction: {
        "out-soft": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "kenburns": {
          "0%": { transform: "scale(1.05)" },
          "100%": { transform: "scale(1.14)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.7s cubic-bezier(0.16,1,0.3,1) both",
        "kenburns": "kenburns 18s ease-out both alternate infinite",
      },
    },
  },
  plugins: [],
};

export default config;
