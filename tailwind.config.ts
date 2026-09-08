import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // base
        paper: "#F5F8FC",     // page background — cool, easy on the eyes for long entry sessions
        surface: "#FFFFFF",   // cards, inputs
        ink: "#1B2733",       // primary text
        slate: "#64748B",     // secondary/muted text
        line: "#DDE4ED",      // borders/dividers

        // section accents — one hue per form, used for wayfinding
        sapphire: "#2657A6",
        "sapphire-dark": "#1D4680",
        topaz: "#B87A1A",
        "topaz-dark": "#96630F",
        amethyst: "#6B4C9A",
        "amethyst-dark": "#553B7C",

        // status — meaning stays consistent everywhere they appear
        emerald: "#16805A",
        "emerald-light": "#EAF7F1",
        ruby: "#C23B4B",
        "ruby-light": "#FBEAEC"
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        sans: ["var(--font-manrope)", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"]
      },
      borderRadius: {
        sm: "3px",
        DEFAULT: "5px",
        md: "6px"
      }
    }
  },
  plugins: []
};

export default config;
