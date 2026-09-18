/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Raw Brand Palette
        navy: '#071827',
        'deep-blue': '#0B2940',
        'maritime-blue': '#0B628C',
        'ocean-blue': '#087EA4',
        'accent-cyan': '#20B7D7',
        'cool-white': '#EAF3F7',
        steel: '#6F8798',

        // Semantic Dynamic Design Tokens
        background: 'var(--bg-primary)',
        'background-secondary': 'var(--bg-secondary)',
        surface: {
          DEFAULT: 'var(--surface-primary)',
          secondary: 'var(--bg-secondary)',
          elevated: 'var(--surface-elevated)',
        },
        border: {
          DEFAULT: 'var(--border-color)',
          hover: 'var(--border-color-hover)',
        },
        primary: {
          DEFAULT: 'var(--primary-blue)',
          hover: 'var(--ocean-blue)',
        },
        maritime: 'var(--maritime-blue)',
        ocean: 'var(--ocean-blue)',
        accent: 'var(--accent-cyan)',
        'cyan-accent': 'var(--accent-cyan)',
        ink: {
          DEFAULT: 'var(--text-primary)',
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-muted)',
          muted: 'var(--text-muted)',
        },
        status: {
          green: {
            DEFAULT: 'var(--status-success)',
            bg: 'var(--status-success-bg)',
            border: 'var(--status-success-border)',
          },
          amber: {
            DEFAULT: 'var(--status-warning)',
            bg: 'var(--status-warning-bg)',
            border: 'var(--status-warning-border)',
          },
          yellow: {
            DEFAULT: 'var(--status-warning)',
            bg: 'var(--status-warning-bg)',
            border: 'var(--status-warning-border)',
          },
          red: {
            DEFAULT: 'var(--status-danger)',
            bg: 'var(--status-danger-bg)',
            border: 'var(--status-danger-border)',
          },
          blue: {
            bg: 'var(--status-blue-bg)',
          }
        },
      },
      fontFamily: {
        sans: ['Inter', 'IBM Plex Sans', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
        xs:    ['0.75rem', { lineHeight: '1rem' }],
        sm:    ['0.875rem', { lineHeight: '1.25rem' }],
        base:  ['0.9375rem', { lineHeight: '1.5rem' }],
      },
      borderRadius: {
        sm: '3px',
        DEFAULT: '4px',
        md: '6px',
        lg: '8px',
      },
      boxShadow: {
        subtle: '0 1px 3px rgba(0, 0, 0, 0.08)',
        panel: '0 2px 6px rgba(0, 0, 0, 0.12)',
        card: '0 2px 8px rgba(0, 0, 0, 0.15)',
      },
    },
  },
  plugins: [],
};
