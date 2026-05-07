/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        toss: {
          blue: '#0064FF',
          'blue-light': '#3384FF',
          'blue-dark': '#004FCC',
          'blue-bg': '#EBF3FF',
          dark: '#202632',
          gray: {
            50: '#F7F8FA',
            100: '#F2F4F6',
            200: '#E6E8EB',
            300: '#D1D6DB',
            400: '#B0B8C1',
            500: '#8B95A1',
            600: '#6B7684',
            700: '#4E5968',
            800: '#333D4B',
            900: '#191F28',
          },
        },
        status: {
          green: '#00C896',
          'green-bg': '#E6FAF5',
          yellow: '#FFB800',
          'yellow-bg': '#FFF8E6',
          red: '#FF4B4B',
          'red-bg': '#FFF0F0',
        },
      },
      fontFamily: {
        sans: [
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Apple SD Gothic Neo"',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px 0 rgba(0,0,0,0.10)',
        modal: '0 20px 60px 0 rgba(0,0,0,0.15)',
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
        '3xl': '20px',
      },
    },
  },
  plugins: [],
}
