/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#FDFBF7",
        charcoal: "#1E1E1E",
        terracotta: "#D46A43",
        olive: "#4A5D4E",
        acidlime: "#D4E834",
        apricot: "#FF7A00",
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'glow-lime': '0 0 25px -5px rgba(212, 232, 52, 0.4)',
        'glow-terracotta': '0 0 25px -5px rgba(212, 106, 67, 0.3)',
        'glow-apricot': '0 0 25px -5px rgba(255, 122, 0, 0.4)',
      }
    },
  },
  plugins: [],
}
