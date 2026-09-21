import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Backgrounds
        bg: {
          DEFAULT: "#ffffff",
          raised: "#fafafa",
          overlay: "#f4f4f5",
        },
        border: {
          subtle: "#f0f0f0",
          DEFAULT: "#e4e4e7",
          strong: "#d1d1d6",
        },
        ink: {
          DEFAULT: "#09090b",
          muted: "#71717a",
          faint: "#a1a1aa",
        },
        accent: {
          DEFAULT: "#18181b",
          hover: "#27272a",
          light: "#f4f4f5",
        },
        // Status pill colors
        status: {
          new:      { bg: "#f4f4f5",  text: "#71717a" },
          to_apply: { bg: "#f0f9ff",  text: "#0284c7" },
          starred:  { bg: "#fefce8",  text: "#ca8a04" },
          ignored:  { bg: "#fafafa",  text: "#a1a1aa" },
        },
        // Source dots
        source: {
          wttj:     "#7c3aed",
          ft:       "#2563eb",
          linkedin: "#0891b2",
          indeed:   "#ea580c",
          manual:   "#71717a",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      fontSize: {
        "2xs": ["0.65rem", { lineHeight: "1rem" }],
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
      },
      boxShadow: {
        sm:  "0 1px 2px 0 rgb(0 0 0 / 0.04)",
        DEFAULT: "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)",
        md:  "0 4px 6px -1px rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.06)",
        lg:  "0 10px 15px -3px rgb(0 0 0 / 0.06), 0 4px 6px -4px rgb(0 0 0 / 0.06)",
        xl:  "0 20px 25px -5px rgb(0 0 0 / 0.08), 0 8px 10px -6px rgb(0 0 0 / 0.06)",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
