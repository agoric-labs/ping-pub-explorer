import DaisyUI from 'daisyui';
import DaisyThemes from 'daisyui/src/theming/themes';
import { Config } from 'tailwindcss';
import colors from './colors';

const config: Config = {
  content: ['index.html', 'src/**/*.{vue,js,ts,jsx,tsx}'],
  daisyui: {
    themes: [
      {
        light: {
          ...DaisyThemes['[data-theme=light]'],
          primary: colors.primary,
        },
      },
      {
        dark: {
          ...DaisyThemes['[data-theme=dark]'],
          'base-100': colors.base[100],
          'base-200': colors.base[200],
          primary: colors.primary,
        },
      },
    ],
  },
  darkMode: ['class'],
  // @ts-ignore
  plugins: [DaisyUI],
  theme: {
    extend: {
      colors,
    },
  },
};

export default config;
