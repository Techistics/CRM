import tailwindcssAnimate from 'tailwindcss-animate'

/** @type {import('tailwindcss').Config} */
const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        brand: {
          DEFAULT: '#0ea5e9',
          hover: '#0284c7',
          light: '#e0f2fe',
          text: '#0c4a6e',
        },
        page: '#f1f5f9',
        subtle: '#f8fafc',
        'slate-border': '#e2e8f0',
        'slate-border-strong': '#cbd5e1',
        success: {
          DEFAULT: '#10b981',
          light: '#d1fae5',
          text: '#065f46',
        },
        warning: {
          DEFAULT: '#f59e0b',
          light: '#fef3c7',
          text: '#78350f',
        },
        danger: {
          DEFAULT: '#ef4444',
          light: '#fee2e2',
          text: '#7f1d1d',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'var(--font-dm-sans)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        'crm-sm': '6px',
        'crm-md': '8px',
        'crm-lg': '12px',
        'crm-xl': '16px',
        'crm-2xl': '20px',
      },
      boxShadow: {
        'crm-xs': '0 1px 2px rgba(0,0,0,0.04)',
        'crm-sm': '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'crm-md': '0 4px 6px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.04)',
        'crm-lg': '0 10px 15px rgba(0,0,0,0.07), 0 4px 6px rgba(0,0,0,0.04)',
      },
      fontSize: {
        'crm-xs': ['12px', { lineHeight: '1.5' }],
        'crm-sm': ['13px', { lineHeight: '1.5' }],
        'crm-base': ['14px', { lineHeight: '1.5' }],
        'crm-md': ['15px', { lineHeight: '1.5' }],
        'crm-lg': ['16px', { lineHeight: '1.5' }],
        'crm-xl': ['18px', { lineHeight: '1.3' }],
        'crm-2xl': ['20px', { lineHeight: '1.3' }],
        'crm-3xl': ['24px', { lineHeight: '1.3' }],
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [tailwindcssAnimate],
}

export default config;
