import type { Config } from 'tailwindcss'

// Additive extension of the existing theme — keeps legacy tokens so old
// components keep working while new screens migrate to the Direction B palette.
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:  ['"Inter Tight"', 'Inter', '-apple-system', 'system-ui', 'sans-serif'],
        serif: ['"Instrument Serif"', '"Source Serif Pro"', 'Georgia', 'serif'],
      },
      colors: {
        // ── Legacy (unchanged from before, to keep existing JSX working) ──
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

        // ── Direction B palette (new) ──
        canvas:    '#F7F6F2',
        paper:     '#FFFFFF',
        paper2:    '#EFEEE8',
        paper3:    '#E5E3DB',
        ink: {
          DEFAULT: '#1A1814',
          2:       '#6B6760',
          3:       '#A09B91',
        },
        line:  '#E5E3DB',
        line2: '#EBE9E1',
        amber: { soft: '#FFE9C2' },

        // contexts — used as left bars / soft chips
        ctxPM:      { DEFAULT: '#3F58D9', soft: '#E6E9FF', ink: '#3046C0' },
        ctxEsdra:   { DEFAULT: '#7C3AED', soft: '#F1E6FF', ink: '#6831B5' },
        ctxPessoal: { DEFAULT: '#C88E2A', soft: '#FFE9C2', ink: '#7A4A0F' },
        ctxFamilia: { DEFAULT: '#1E8590', soft: '#D6F0F2', ink: '#125F66' },
        ctxCCB:     { DEFAULT: '#5C8A2C', soft: '#E6F0D8', ink: '#3F6420' },
        ctxEstudo:  { DEFAULT: '#C53580', soft: '#FFE0EC', ink: '#9D2960' },
        ctxSaude:   { DEFAULT: '#2E8B4F', soft: '#DCEFE1', ink: '#1F5F36' },
      },
      borderRadius: {
        xl:    '14px',
        '2xl': '18px',
        '3xl': '22px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(26,24,20,.04), 0 1px 0 rgba(26,24,20,.02)',
        soft: '0 8px 24px -10px rgba(26,24,20,.18)',
        fab:  '0 10px 22px -4px rgba(26,24,20,.45), 0 4px 10px -2px rgba(26,24,20,.18)',
      },
    },
  },
  // Make sure context utility classes generated dynamically aren't purged.
  safelist: [
    'bg-ctxPM', 'bg-ctxEsdra', 'bg-ctxPessoal', 'bg-ctxFamilia', 'bg-ctxCCB', 'bg-ctxEstudo', 'bg-ctxSaude',
    'bg-ctxPM-soft', 'bg-ctxEsdra-soft', 'bg-ctxPessoal-soft', 'bg-ctxFamilia-soft', 'bg-ctxCCB-soft', 'bg-ctxEstudo-soft', 'bg-ctxSaude-soft',
    'text-ctxPM-ink', 'text-ctxEsdra-ink', 'text-ctxPessoal-ink', 'text-ctxFamilia-ink', 'text-ctxCCB-ink', 'text-ctxEstudo-ink', 'text-ctxSaude-ink',
    'border-l-ctxPM', 'border-l-ctxEsdra', 'border-l-ctxPessoal', 'border-l-ctxFamilia', 'border-l-ctxCCB', 'border-l-ctxEstudo', 'border-l-ctxSaude',
  ],
  plugins: [],
} satisfies Config
