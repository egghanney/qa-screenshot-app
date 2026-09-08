import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        qa: {
          bg: "#EDEDEB",
          warm: "#F4F3EE",
          surface: "#F8F8F5",
          white: "#FFFFFF",
          muted: "#E5E5E0",
          border: "#DCDDD6",
          borderSubtle: "#EAEAE5",
        },
        clinical: {
          bg: "#EDEDEB",
          warm: "#F4F3EE",
          surface: "#F8F8F5",
          white: "#FFFFFF",
          muted: "#E5E5E0",
          border: "#DCDDD6",
          borderSubtle: "#EAEAE5",
        },
        dark: {
          chassis: "#1D1E1C",
          secondary: "#292A28",
          tertiary: "#3A3B38",
          black: "#111210",
        },
        txt: {
          primary: "#171816",
          secondary: "#656660",
          muted: "#969790",
          disabled: "#B7B8B1",
          inverse: "#FFFFFF",
        },
        neon: {
          DEFAULT: "#F2F52A",
          bright: "#F8FA35",
          soft: "#E8EA8B",
          muted: "#D8DA74",
        },
        status: {
          normal: "#A8AAA3",
          positive: "#9BD3B5",
          warning: "#F2F52A",
          critical: "#E56B68",
          info: "#9EB9C5",
        },
      },
      borderRadius: {
        panel: "32px",
        card: "20px",
        pill: "9999px",
      },
      boxShadow: {
        subtle: "0 2px 8px rgba(0,0,0,0.04)",
        card: "0 6px 18px rgba(0,0,0,0.06)",
        floating: "0 12px 32px rgba(0,0,0,0.09)",
        modal: "0 24px 60px rgba(0,0,0,0.14)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
