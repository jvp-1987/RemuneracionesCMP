import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const manrope = Manrope({ subsets: ["latin"], variable: '--font-manrope' });

export const metadata: Metadata = {
  title: "Validator Pro | HR Remuneration",
  description: "Plataforma avanzada de auditoría y gestión de remuneraciones APS.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full light">
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
      </head>
      <body className={`${inter.variable} ${manrope.variable} font-body min-h-screen flex bg-surface text-on-surface antialiased transition-colors duration-500`}>
        <Sidebar />
        <main className="flex-1 ml-72 flex flex-col min-h-screen overflow-x-hidden">
          {children}
        </main>
      </body>
    </html>
  );
}
