import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Light
        bg: {
          DEFAULT: "#f9f9f8",
          raised: "#ffffff",
          overlay: "#f2f2f0",
        },
        border: {
          subtle: "#e8e8e5",
          DEFAULT: "#d8d8d4",
          strong: "#b8b8b2",
        },
        ink: {
          DEFAULT: "#1a1a18",
          muted: "#6b6b65",
          faint: "#a0a09a",
        },
        accent: {
          DEFAULT: "#2563eb",
          hover: "#1d4ed8",
          light: "#eff6ff",
        },
        // Status
        status: {
          new:       { bg: "#f0f0ee", text: "#6b6b65" },
          to_apply:  { bg: "#eff6ff", text: "#2563eb" },
          starred:   { bg: "#fffbeb", text: "#d97706" },
          ignored:   { bg: "#f9f9f8", text: "#a0a09a" },
        },
        // Source dots
        source: {
          wttj:     "#7c3aed",
          ft:       "#2563eb",
          linkedin: "#0891b2",
          indeed:   "#ea580c",
          manual:   "#6b6b65",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      fontSize: {
        "2xs": ["0.65rem", { lineHeight: "1rem" }],
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "6px",
        md: "8px",
        lg: "12px",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
