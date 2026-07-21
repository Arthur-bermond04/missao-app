import type { Metadata } from "next";
import { Inter, Cinzel } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-cinzel",
});

export const metadata: Metadata = {
  title: "MissãoApp — Painel",
  description: "Painel administrativo do MissãoApp",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${cinzel.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <Toaster position="top-right" toastOptions={{ style: { fontSize: '14px' } }} />
      </body>
    </html>
  );
}
