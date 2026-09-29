/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#02040a',
          900: '#040814',
          850: '#060b1c',
          800: '#0a1128',
          700: '#111a38',
        },
        nova: {
          50: '#eef6ff',
          100: '#d9ebff',
          200: '#b5d8ff',
          300: '#7cc4ff',
          400: '#47a6ff',
          500: '#2b86ff',
          600: '#1f6bff',
          700: '#1a55e0',
          800: '#1b46b4',
          900: '#1c3f8e',
        },
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk Variable"', '"Space Grotesk"', '"Inter Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        glass:
          'inset 0 1px 0 0 rgba(255,255,255,0.08), inset 0 0 0 1px rgba(255,255,255,0.04), 0 20px 60px -20px rgba(0,0,0,0.6)',
        glow: '0 0 0 1px rgba(71,166,255,0.35), 0 8px 30px -6px rgba(43,134,255,0.55)',
        'glow-lg': '0 0 0 1px rgba(71,166,255,0.4), 0 20px 80px -10px rgba(43,134,255,0.55)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translate3d(0,0,0)' },
          '50%': { transform: 'translate3d(0,-10px,0)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translate3d(0,0,0) rotate(0deg)' },
          '50%': { transform: 'translate3d(0,-16px,0) rotate(0.6deg)' },
        },
        drift: {
          '0%, 100%': { transform: 'translate3d(0,0,0) scale(1)' },
          '33%': { transform: 'translate3d(4%,-3%,0) scale(1.06)' },
          '66%': { transform: 'translate3d(-3%,4%,0) scale(0.96)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-120%)' },
          '100%': { transform: 'translateX(220%)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'spin-slow': {
          to: { transform: 'rotate(360deg)' },
        },
        pulseDot: {
          '0%': { transform: 'scale(1)', opacity: '0.7' },
          '100%': { transform: 'scale(2.6)', opacity: '0' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(10px)', filter: 'blur(4px)' },
          to: { opacity: '1', transform: 'none', filter: 'none' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        'float-slow': 'float-slow 9s ease-in-out infinite',
        drift: 'drift 18s ease-in-out infinite',
        shimmer: 'shimmer 2.8s ease-in-out infinite',
        marquee: 'marquee 40s linear infinite',
        'spin-slow': 'spin-slow 40s linear infinite',
        'pulse-dot': 'pulseDot 2s cubic-bezier(0.2,0.6,0.4,1) infinite',
      },
    },
  },
  plugins: [],
}
