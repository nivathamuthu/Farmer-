/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#eef3f7",
        ink: "#152033",
        leaf: "#1d6a8a",
        moss: "#e5f2f6",
        clay: "#d06a3f",
        sand: "#d4e0e8",
        card: "#f8fbfc",
      },
      fontFamily: {
        serif: ["Fraunces", "Georgia", "serif"],
        sans: ["Outfit", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 12px 30px rgba(21, 32, 51, 0.08)",
      },
    },
  },
  plugins: [],
};
