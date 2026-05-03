'use client';

import { usePathname } from 'next/navigation';
import Sidebar from "@/components/Sidebar";
import AuthProvider from "@/components/AuthProvider";

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  return (
    <AuthProvider>
      {!isLoginPage && <Sidebar />}
      <main className={!isLoginPage ? "flex-1 ml-72 flex flex-col min-h-screen overflow-x-hidden" : "w-full"}>
        {children}
      </main>
    </AuthProvider>
  );
}
