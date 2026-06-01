import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Live brand color — BuildContext writes `--primary-color` at runtime.
        primary: 'var(--primary-color, #1c4d2a)',
      },
      fontFamily: {
        heading: ['var(--cv-font-heading)', 'serif'],
        body:    ['var(--cv-font-body)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
