import type { Metadata } from "next";
import { Be_Vietnam_Pro, Geist_Mono } from "next/font/google";
import { Header } from "@/components/Header";
import NoKeyShortcuts from "@/components/NoKeyShortcuts";
import "./globals.css";

// Giống app anh em (HAST): Be Vietnam Pro cho chữ, Geist Mono cho mã/serial.
const beVietnam = Be_Vietnam_Pro({
  variable: "--font-geist-sans",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hệ thống Quản lý & In phiếu Bảo hành - HSTC",
  description: "Đăng ký, quản lý và in phiếu bảo hành khớp phôi A5 ngang",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${beVietnam.variable} ${geistMono.variable}`}>
      <body className="antialiased min-h-screen bg-slate-50 flex flex-col">
        <NoKeyShortcuts />
        <Header />
        <main className="flex-1 flex flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
