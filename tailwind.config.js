/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    colors: {
      'default-green': '#1db954',
      'green': '#1ED760',
      'black': '#191414',
      'light-black': '#191919',
      'white': '#FFFFFF',
      'violet': '#8B5CF6',
      'fuchsia': '#D946EF',
      'red': '#f44336',
      'gray': '#444444',
      'light-gray': '#3D3D3D',
      'lighter-gray': '#464646'
    },
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};
