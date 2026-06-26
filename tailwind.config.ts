import type { Config } from 'tailwindcss'

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
        bg: 'var(--bg)',
        'surface-sunken': 'var(--surface-sunken)',
        border: 'var(--border)',
        'border-strong': 'var(--border-strong)',
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          subtle: 'var(--accent-subtle)',
        },

        // Legacy aliases kept so existing JSX migrates through the new tokens.
        brand: {
          DEFAULT: 'var(--accent)',
          light:   'var(--accent-hover)',
          subtle:  'var(--accent-subtle)',
        },
        danger:  { DEFAULT: 'var(--danger)', light: 'color-mix(in srgb, var(--danger) 10%, var(--surface))' },
        warning: { DEFAULT: 'var(--warning)', light: 'color-mix(in srgb, var(--warning) 10%, var(--surface))' },
        success: { DEFAULT: 'var(--success)', light: 'color-mix(in srgb, var(--success) 10%, var(--surface))' },
        surface: {
          DEFAULT: 'var(--surface)',
          muted:   'var(--surface-sunken)',
          border:  'var(--border)',
          border2: 'var(--border-strong)',
        },
        text: {
          primary:   'var(--ink)',
          secondary: 'var(--ink-secondary)',
          tertiary:  'var(--ink-tertiary)',
          inverse:   'var(--surface)',
        },
        late:    'var(--danger)',
        done:    'var(--success)',
        pending: 'var(--ink-tertiary)',

        canvas:    'var(--bg)',
        paper:     'var(--surface)',
        paper2:    'var(--surface-sunken)',
        paper3:    'var(--border)',
        ink: {
          DEFAULT:   'var(--ink)',
          2:         'var(--ink-secondary)',
          3:         'var(--ink-tertiary)',
          secondary: 'var(--ink-secondary)',
          tertiary:  'var(--ink-tertiary)',
        },
        line:  'var(--border)',
        line2: 'var(--border)',
        amber: { soft: 'var(--accent-subtle)' },

        // Context colors intentionally resolve to neutral tokens in the premium system.
        ctxPM:      { DEFAULT: 'var(--border-strong)', soft: 'var(--surface-sunken)', ink: 'var(--ink-secondary)' },
        ctxEsdra:   { DEFAULT: 'var(--border-strong)', soft: 'var(--surface-sunken)', ink: 'var(--ink-secondary)' },
        ctxPessoal: { DEFAULT: 'var(--border-strong)', soft: 'var(--surface-sunken)', ink: 'var(--ink-secondary)' },
        ctxFamilia: { DEFAULT: 'var(--border-strong)', soft: 'var(--surface-sunken)', ink: 'var(--ink-secondary)' },
        ctxCCB:     { DEFAULT: 'var(--border-strong)', soft: 'var(--surface-sunken)', ink: 'var(--ink-secondary)' },
        ctxEstudo:  { DEFAULT: 'var(--border-strong)', soft: 'var(--surface-sunken)', ink: 'var(--ink-secondary)' },
        ctxSaude:   { DEFAULT: 'var(--border-strong)', soft: 'var(--surface-sunken)', ink: 'var(--ink-secondary)' },
      },
      borderRadius: {
        xl:    '14px',
        '2xl': '18px',
        '3xl': '22px',
      },
      boxShadow: {
        card: 'none',
        soft: 'none',
        fab:  'none',
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
