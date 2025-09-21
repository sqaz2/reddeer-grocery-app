import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#174A7C',
          accent: '#2BAE66',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
