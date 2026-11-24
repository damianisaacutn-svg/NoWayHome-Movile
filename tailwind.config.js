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
        // Guía de estilos "Calma Urbana" (Fase 5 - UI)
        primary: "#B8860B",
        brand: "#B8860B",
        secondary: "#DCDCDC",
        accent: "#B87333",
        brown: "#B87333",
        background: "#FAFAFA",
        cream: "#F5F2EC",
        textMain: "#1C1C1C",
        dark: "#1C1C1C",
        borderLight: "#DCDCDC",
      },
      fontFamily: {
        poppins: ["Poppins_600SemiBold", "Poppins", "System"],
        "poppins-bold": ["Poppins_700Bold", "Poppins", "System"],
        inter: ["Inter_400Regular", "Inter", "System"],
        "inter-medium": ["Inter_500Medium", "Inter", "System"],
        "inter-semibold": ["Inter_600SemiBold", "Inter", "System"],
      },
    },
  },
  plugins: [],
};
