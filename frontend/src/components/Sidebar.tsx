'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from "@/lib/utils";

const navItems = [
  { name: 'Dashboard', href: '/', icon: '&#xe871;' },
  { name: 'Ingresar Novedades', href: '/ingreso', icon: '&#xe145;' },
  { name: 'Consolidados', href: '/consolidados', icon: '&#xea17;' },
  { name: 'Funcionarios', href: '/funcionarios', icon: '&#xe7ef;' },
  { name: 'Importar', href: '/importar', icon: '&#xe2c3;' },
  { name: 'Reportes', href: '/reportes', icon: '&#xe873;' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-72 bg-surface-container-low border-r border-outline-variant/10 flex flex-col z-50">
      {/* Branding Section */}
      <div className="p-10 mb-6 group">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-[1.25rem] bg-primary flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform duration-500">
            <span className="material-symbols-outlined text-white text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>&#xe16e;</span>
          </div>
          <div>
            <h1 className="text-xl font-black text-primary tracking-tighter leading-none font-headline">Remuneraciones</h1>
            <p className="text-[10px] text-secondary font-black tracking-[0.2em] uppercase mt-1">Salud CMP</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-6 space-y-1.5 overflow-y-auto custom-scrollbar">
        <p className="px-4 mb-4 text-[10px] font-black text-outline uppercase tracking-[0.3em]">Menú Principal</p>
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-300 relative",
                isActive 
                  ? "bg-primary text-white shadow-xl shadow-primary/20" 
                  : "text-on-surface hover:text-primary hover:bg-primary/5"
              )}
            >
              <div className="flex items-center gap-4">
                <span className={cn(
                  "material-symbols-outlined text-xl transition-transform", 
                  isActive ? "text-white" : "text-outline",
                  "group-hover:scale-110"
                )} style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}} dangerouslySetInnerHTML={{ __html: item.icon }} />
                <span className={cn("text-sm font-black tracking-tight", isActive ? "text-white" : "text-on-surface")}>
                  {item.name}
                </span>
              </div>
              {isActive && (
                <span className="material-symbols-outlined text-sm text-white select-none">&#xe5cc;</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer / Account Section */}
      <div className="p-6 mt-auto">
        <div className="p-6 bg-surface-container rounded-[3rem] border border-outline-variant/5">
          <button className="flex items-center gap-4 w-full text-on-surface hover:text-primary transition-colors group mb-6">
            <span className="material-symbols-outlined text-xl text-outline group-hover:text-primary select-none">&#xe8b8;</span>
            <span className="text-xs font-black uppercase tracking-widest">Configuración</span>
          </button>
          
          <div className="flex items-center gap-4 pt-6 border-t border-outline-variant/10">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-xs border border-primary/20 shadow-sm relative overflow-hidden group/avatar">
              <span className="material-symbols-outlined text-xl select-none">&#xe853;</span>
            </div>
            <div className="overflow-hidden">
              <p className="text-[12px] font-black text-on-surface leading-none mb-1 truncate">Juan Vidal</p>
              <p className="text-[9px] font-bold text-outline uppercase tracking-tight truncate font-label">Administrador Jefe</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
