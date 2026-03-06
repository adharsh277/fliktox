/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Bebas Neue", "sans-serif"],
        body: ["Inter", "sans-serif"]
      },
      colors: {
        abyss: "#07131f",
        ember: "#eb5e28",
        gold: "#f3b61f",
        mist: "#d7e3f4"
      },
      boxShadow: {
        poster: "0 16px 48px rgba(0, 0, 0, 0.35)"
      }
    }
  },
  plugins: []
};
