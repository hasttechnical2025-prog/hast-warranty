import type { Metadata } from "next";
import { Header } from "@/components/Header";
import NoKeyShortcuts from "@/components/NoKeyShortcuts";
import "./globals.css";

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
    <html lang="vi">
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
