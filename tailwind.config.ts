import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: "#13b6ec",
        "background-dark": "#111e22",
        "surface-dark": "#1a2c32",
        "surface-lighter": "#233f48",
        "text-secondary": "#92bbc9",
      },
      fontFamily: {
        display: ["Inter", "Noto Sans KR", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
