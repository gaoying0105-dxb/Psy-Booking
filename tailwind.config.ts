import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        mist: "var(--mist)",
        ink: "var(--ink)",
        pine: "var(--pine)",
        "pine-soft": "var(--pine-soft)",
        amber: "var(--amber)",
        line: "var(--line)",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
      },
    },
  },
  plugins: [],
};
export default config;
