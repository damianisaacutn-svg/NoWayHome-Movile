// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  // Asegúrate de incluir las rutas donde crearás tus pantallas y componentes
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./src/screens/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Aquí puedes traer los colores que ya usas en tu web para no perder el estilo
        primary: "#6B8E23",
        brand: "#6B8E23",
        secondary: "#A67C52",
        brown: "#A67C52",
        background: "#F2E8CF",
        cream: "#F2E8CF",
        textMain: "#5F5F5F",
        dark: "#5F5F5F",
      },
      fontFamily: {
        poppins: ["System"],
      },
    },
  },
  plugins: [],
};
