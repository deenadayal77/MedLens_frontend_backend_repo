import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
        body: ['"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
      },
      colors: {
        ink: '#111827',
        muted: '#5b6472',
        rule: '#d9dee8',
        accent: '#002fa7',
        surface: '#ffffff',
        neutral: '#f7f7f8',
        urgency: {
          critical: '#d63031',
          high:     '#e17055',
          moderate: '#fdcb6e',
          low:      '#00b894',
          veryLow:  '#00cec9',
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        glass: '0 18px 55px rgba(17, 24, 39, 0.08)',
        glow: '0 16px 40px rgba(0, 47, 167, 0.12)',
        'glow-lg': '0 18px 55px rgba(0, 47, 167, 0.16)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'scan': 'scan 2.5s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        scan: {
          '0%, 100%': { transform: 'translateY(0%)', opacity: '0.6' },
          '50%': { transform: 'translateY(100%)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
