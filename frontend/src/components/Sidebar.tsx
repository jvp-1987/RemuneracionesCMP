'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";
import { useAuth } from './AuthProvider';

const navItems = [
  { name: 'Dashboard', href: '/', icon: '&#xe871;' },
  { name: 'Proyecciones', href: '/dashboard', icon: '&#xe4fc;' },
  { name: 'Ingresar Novedades', href: '/ingreso', icon: '&#xe145;' },
  { name: 'Consolidados', href: '/consolidados', icon: '&#xea17;' },
  { name: 'Funcionarios', href: '/funcionarios', icon: '&#xe7ef;' },
  { name: 'Importar', href: '/importar', icon: '&#xe2c3;' },
  { name: 'Asignaciones Fijas', href: '/asignaciones', icon: '&#xf0c5;' },
  { name: 'Alertas RRHH', href: '/alertas-rrhh', icon: '&#xe002;' },
  { name: 'Reportes', href: '/reportes', icon: '&#xe873;' },
  { name: 'Control Períodos', href: '/configuracion/periodos', icon: '&#xeb93;' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const filteredNavItems = navItems.filter(item => {
    if (!user) return false;
    if (user.rol === 'ADMIN' || user.rol === 'ADMIN_MAESTRO') return true;
    
    if (['CENTRO_SALUD', 'SECRETARIA'].includes(user.rol)) {
      return ['Dashboard', 'Proyecciones', 'Ingresar Novedades', 'Consolidados', 'Funcionarios', 'Asignaciones Fijas'].includes(item.name);
    }
    
    if (user.rol === 'CONTROL') {
      return ['Dashboard', 'Proyecciones', 'Consolidados', 'Funcionarios', 'Asignaciones Fijas'].includes(item.name);
    }
    
    if (user.rol === 'FINANZAS') {
      return ['Dashboard', 'Proyecciones', 'Consolidados', 'Funcionarios', 'Reportes', 'Asignaciones Fijas'].includes(item.name);
    }

    if (user.rol === 'INVITADO') {
      return ['Dashboard', 'Proyecciones', 'Consolidados', 'Funcionarios', 'Reportes', 'Asignaciones Fijas'].includes(item.name);
    }

    if (user.rol === 'CONTABILIDAD') {
      return ['Dashboard', 'Proyecciones', 'Consolidados', 'Funcionarios', 'Reportes'].includes(item.name);
    }
    
    return false;
  });

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-72 bg-surface-container-low border-r border-outline-variant/10 flex flex-col z-50">
      {/* Branding Section */}
      <div className="p-6 mb-2 mt-4 group">
        <div className="flex flex-col items-center gap-3">
          <div className="w-24 h-24 rounded-2xl bg-white flex items-center justify-center shadow-lg shadow-primary/10 p-2 overflow-hidden group-hover:scale-105 transition-transform duration-500">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain mix-blend-multiply" />
          </div>
          <div className="text-center px-2">
            <h1 className="text-[15px] font-black text-primary tracking-tight leading-tight uppercase">Motor Financiero</h1>
            <p className="text-[11px] text-primary font-black tracking-widest uppercase mt-0.5">Y Gestión de Personas</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-6 space-y-1.5 overflow-y-auto custom-scrollbar relative">
        <p className="px-4 mb-4 text-[10px] font-black text-outline uppercase tracking-[0.3em]">Menú Principal</p>
        {filteredNavItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-300 relative z-10",
                isActive 
                  ? "text-white" 
                  : "text-on-surface hover:text-primary hover:bg-primary/5"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active-pill"
                  className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80 rounded-2xl -z-10 shadow-lg shadow-primary/20"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
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
                <span className="material-symbols-outlined text-sm text-white/80 select-none">&#xe5cc;</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer / Account Section */}
      <div className="p-6 mt-auto">
        <div className="p-6 bg-surface-container rounded-[3rem] border border-outline-variant/5">
          { (user?.rol === 'ADMIN' || user?.rol === 'ADMIN_MAESTRO') && (
            <Link href="/configuracion" className="flex items-center gap-4 w-full text-on-surface hover:text-primary transition-colors group mb-6">
              <span className="material-symbols-outlined text-xl text-outline group-hover:text-primary select-none">&#xe8b8;</span>
              <span className="text-xs font-black uppercase tracking-widest">Configuración</span>
            </Link>
          )}
          
          <div className="flex flex-col gap-4 pt-6 border-t border-outline-variant/10">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-xs border border-primary/20 shadow-sm relative overflow-hidden group/avatar">
                <span className="material-symbols-outlined text-xl select-none">&#xe853;</span>
              </div>
              <div className="overflow-hidden flex-1">
                <p className="text-[12px] font-black text-on-surface leading-none mb-1 truncate">{user?.nombre || 'Usuario'}</p>
                <p className="text-[9px] font-bold text-outline uppercase tracking-tight truncate font-label">{user?.rol || 'Administrador'}</p>
              </div>
            </div>
            
            <button 
              onClick={logout}
              className="flex items-center justify-center gap-2 w-full py-2 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all border border-rose-100"
            >
              <span className="material-symbols-outlined text-sm">logout</span>
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
