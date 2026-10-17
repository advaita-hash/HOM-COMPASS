/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Clinical, calm palette inspired by professional desktop repertories.
        brand: {
          50: '#eef6f4',
          100: '#d6ebe6',
          200: '#aed7ce',
          300: '#7cbcb0',
          400: '#4e9c8e',
          500: '#337f72',
          600: '#26665c',
          700: '#20524b',
          800: '#1c423d',
          900: '#183833',
        },
        grade: {
          1: '#94a3b8',
          2: '#3b82f6',
          3: '#7c3aed',
          4: '#dc2626',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
