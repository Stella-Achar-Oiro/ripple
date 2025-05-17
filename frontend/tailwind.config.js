/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f0f4fa',
          100: '#d1dfef',
          200: '#a6bfde',
          300: '#7b9fcd',
          400: '#5080bc',
          500: '#3b6399',
          600: '#2e4c79',
          700: '#213559',
          800: '#141f38',
          900: '#080a18',
        }
      },
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
