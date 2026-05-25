import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#4f46e5',
          light:   '#6366f1',
          subtle:  '#eef2ff',
        },
        danger:  { DEFAULT: '#dc2626', light: '#fef2f2' },
        warning: { DEFAULT: '#f59e0b', light: '#fffbeb' },
        success: { DEFAULT: '#16a34a', light: '#f0fdf4' },
        surface: {
          DEFAULT: '#ffffff',
          muted:   '#f9fafb',
          border:  '#e5e7eb',
          border2: '#d1d5db',
        },
        text: {
          primary:   '#111827',
          secondary: '#6b7280',
          tertiary:  '#9ca3af',
          inverse:   '#ffffff',
        },
        late:    '#dc2626',
        done:    '#16a34a',
        pending: '#9ca3af',
      }
    },
  },
  plugins: [],
} satisfies Config
