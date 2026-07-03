/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Primary: Premium Safety Orange ─────────────────────────────────
        // Used for all primary CTAs, active highlights, focus rings,
        // validation success states, and hero elements.
        primary: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#F97316',
          600: '#EA580C',
          700: '#C2410C',
          800: '#9A3412',
          900: '#7C2D12',
          950: '#431407',
        },
        // ── Accent: Warm Amber / Orange complementary ──────────────────────
        // Used for secondary highlights, badge accents, subtle active states.
        accent: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
          950: '#451A03',
        },
        // ── Surface: Cool Monochrome Slate ─────────────────────────────────
        // Architectural gray matrix for backgrounds, cards, and panels.
        surface: {
          50: '#F1F5F9',
          100: '#E2E8F0',
          200: '#CBD5E1',
          300: '#94A3B8',
          400: '#64748B',
          500: '#475569',
          600: '#334155',
          700: '#1E293B',
          800: '#0F172A',
          900: '#020617',
          950: '#020617',
        },
        // ── Sidebar tokens ─────────────────────────────────────────────────
        sidebar: {
          bg: '#FFF7ED',
          hover: '#FFEDD5',
          active: '#FFEDD5',
          text: '#64748B',
          'text-active': '#EA580C',
        },
        // ── Card tokens ────────────────────────────────────────────────────
        card: {
          bg: '#F1F5F9',
          border: '#CBD5E1',
        },
        // ── Override default Tailwind gray with cool slate ─────────────────
        // This cascades to ALL `bg-gray-*`, `text-gray-*`, `border-gray-*`
        // references across every component without touching the JSX.
        gray: {
          50: '#F1F5F9',
          100: '#E2E8F0',
          200: '#CBD5E1',
          300: '#94A3B8',
          400: '#64748B',
          500: '#475569',
          600: '#334155',
          700: '#1E293B',
          800: '#0F172A',
          900: '#020617',
          950: '#020617',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
        'sidebar': '1px 0 3px 0 rgb(0 0 0 / 0.04)',
      },
    },
  },
  plugins: [],
}
