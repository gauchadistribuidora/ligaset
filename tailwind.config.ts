import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sand: {
          50: "#fdf8f1",
          100: "#faedda",
          200: "#f3d6ad",
        },
        court: {
          50: "#eefdf6",
          100: "#d4f7e6",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
        },
        ocean: {
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          900: "#0c1b2a",
          950: "#071320",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 4px 24px -8px rgba(8, 27, 42, 0.18)",
        glow: "0 0 0 1px rgba(16,185,129,0.25), 0 8px 30px -12px rgba(16,185,129,0.45)",
      },
      backgroundImage: {
        "court-gradient":
          "linear-gradient(135deg, #071320 0%, #0c1b2a 45%, #0e7490 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
