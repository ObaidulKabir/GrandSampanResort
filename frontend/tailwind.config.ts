import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ocean: '#0E3A5A',
        gold: '#D4AF37',
        pearl: '#F8F8F6',
        sunset: '#FF7A3D'
      }
    }
  }
};
export default config;

