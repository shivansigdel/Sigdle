// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class", // enables Tailwind `dark:` variants
  theme: {
    extend: {
      fontFamily: { bebas: ['"Bebas Neue"', "sans-serif"] },
    },
  },
  // no `plugins: [daisyui]` here when using @plugin in CSS
};
