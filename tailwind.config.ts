import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#181511",
        charcoal: "#242019",
        paper: "#EFE9DD",
        parchment: "#F7F3E9",
        brass: "#B08D57",
        "brass-dark": "#8C6D3F",
        emerald: "#1F4B3F",
        "emerald-light": "#2C6653",
        rust: "#A23B33",
        line: "#D8CFB8"
      },
      fontFamily: {
        display: ["var(--font-newsreader)", "serif"],
        sans: ["var(--font-plex-sans)", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"]
      },
      borderRadius: {
        sm: "2px",
        DEFAULT: "3px",
        md: "4px"
      }
    }
  },
  plugins: []
};

export default config;
