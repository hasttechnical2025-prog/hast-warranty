import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Giống app anh em: Be Vietnam Pro (chữ) + Geist Mono (mã/serial)
        sans: ["var(--font-geist-sans)", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Màu thương hiệu Hanoi Sieu Thanh: navy chủ đạo (đỏ dùng token `red` để nhấn)
        brand: {
          50: "#eef3fa",
          100: "#d5e2f2",
          200: "#aec8e6",
          300: "#7ea6d6",
          400: "#5081c1",
          500: "#3462a8",
          600: "#244b8b",
          700: "#1f3d70",
          800: "#1c335c",
          900: "#192b4d",
        },
      },
    },
  },
  plugins: [],
};
export default config;
