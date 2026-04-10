/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0f172a',
        secondary: '#3b82f6',
        accent: '#8b5cf6',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        background: '#ffffff',
        card: '#f8fafc',
        border: '#e2e8f0',
        text: {
          primary: '#1e293b',
          secondary: '#64748b',
          disabled: '#94a3b8',
        },
      },
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '16px',
        'lg': '24px',
      },
      borderRadius: {
        'sm': '4px',
        'md': '6px',
        'lg': '8px',
        'xl': '16px',
      },
      boxShadow: {
        'sm': '0 2px 4px rgba(0, 0, 0, 0.05)',
        'md': '0 4px 6px rgba(0, 0, 0, 0.1)',
        'lg': '0 10px 15px rgba(0, 0, 0, 0.1)',
      },
      transitionDuration: {
        'fast': '150ms',
        'normal': '200ms',
        'slow': '300ms',
      },
      transitionTimingFunction: {
        'in-out': 'ease-in-out',
        'out': 'ease-out',
      },
    },
  },
  plugins: [],
}
