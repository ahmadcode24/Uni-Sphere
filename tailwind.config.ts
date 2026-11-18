import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "var(--paper)",
        surface: "var(--surface)",
        ink: "var(--ink)",
        emerald: "var(--emerald)",
        marigold: "var(--marigold)",
        rose: "var(--rose)",
        sky: "var(--sky)",
        mist: "var(--mist)",
      },
      fontFamily: {
        display: ["var(--font-bricolage)", "sans-serif"],
        sans: ["var(--font-figtree)", "sans-serif"],
      },
      boxShadow: {
        hard: "4px 4px 0 var(--ink)",
        "hard-sm": "2px 2px 0 var(--ink)",
        "hard-lg": "6px 6px 0 var(--ink)",
        "hard-xl": "8px 8px 0 var(--ink)",
      },
      borderRadius: {
        button: "10px",
        input: "8px",
        event: "18px",
        modal: "20px",
      },
    },
  },
  plugins: [],
};
export default config;
