/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        midnight: {
          900: "#0f172a",
          800: "#111827",
          700: "#1e293b"
        },
        aurora: {
          500: "#7c3aed",
          400: "#a855f7",
          300: "#c084fc"
        }
      },
      boxShadow: {
        glow: "0 20px 45px rgba(124, 58, 237, 0.35)"
      }
    }
  },
  plugins: []
};
