/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    // Adicione os caminhos para todos os seus arquivos que usam classes do Tailwind
  ],
  theme: {
    extend: {
      colors: {
        "minha-cor": "#ff0000", // Um vermelho personalizado
        "azul-legal": {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1", // Cor base
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b",
        },
      },
    },
  },
  plugins: [],
};
