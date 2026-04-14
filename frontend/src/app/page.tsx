'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const [periods, setPeriods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get('http://localhost:3000/consolidados/dashboard');
        setPeriods(res.data);
      } catch (err) {
        console.error('Error fetching dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-surface font-body overflow-x-hidden pb-20">
      {/* Top Bar Navigation (Internal to Page Content) */}
      <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-md flex justify-between items-center w-full px-12 py-6 border-b border-outline-variant/10">
        <div className="relative group w-96">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-on-surface">
            <span className="material-symbols-outlined text-lg select-none" dangerouslySetInnerHTML={{ __html: '&#xe8b6;' }} />
          </span>
          <input 
            type="text" 
            placeholder="Buscar auditoría por ID o Centro..." 
            className="w-full bg-surface-container border-outline/20 border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary transition-all text-on-surface placeholder:text-outline"
          />
        </div>
        <div className="flex items-center gap-4">
          <button className="text-on-surface-variant hover:bg-surface-container p-2 rounded-full transition-colors active:scale-95">
            <span className="material-symbols-outlined select-none" dangerouslySetInnerHTML={{ __html: '&#xe7f4;' }} />
          </button>
          <div className="h-8 w-[1px] bg-outline-variant/20 mx-2" />
          <button className="flex items-center gap-2 text-on-surface-variant hover:bg-surface-container px-3 py-1.5 rounded-full transition-colors">
            <span className="material-symbols-outlined select-none" dangerouslySetInnerHTML={{ __html: '&#xe853;' }} />
            <span className="text-xs font-bold uppercase tracking-wider">Perfil Auditor</span>
          </button>
        </div>
      </header>

      <section className="px-12 py-12">
        {/* Hero Heading */}
        <div className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h2 className="text-[3.5rem] font-black leading-none tracking-tight text-primary font-headline mb-4">
            Remuneración Salud CMP
          </h2>
          <div className="flex items-center gap-4 text-secondary">
            <div className="flex items-center gap-2 bg-secondary-container/30 px-4 py-1.5 rounded-full">
              <span className="material-symbols-outlined text-sm select-none" dangerouslySetInnerHTML={{ __html: '&#xe935;' }} />
              <span className="text-sm font-bold uppercase tracking-wide">Periodo Activo: Mayo 2024</span>
            </div>
            <div className="flex items-center gap-2 bg-primary/10 px-4 py-1.5 rounded-full text-primary">
              <span className="font-black text-sm">84% COMPLETADO</span>
            </div>
          </div>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-12 gap-8 mb-12">
          {/* Metric Card: Validation Health */}
          <div className="col-span-12 md:col-span-4 bg-surface-container-low p-8 rounded-[2.5rem] border border-outline-variant/10 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
            <div>
              <div className="flex justify-between items-start mb-6">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-secondary">Salud de Validación</span>
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined select-none" style={{ fontVariationSettings: "'FILL' 1" }} dangerouslySetInnerHTML={{ __html: '&#xe1d5;' }} />
                </div>
              </div>
              <div className="text-5xl font-black text-on-surface tracking-tighter">98.2%</div>
              <p className="text-sm text-secondary mt-3 font-bold leading-relaxed">Tasa de cumplimiento en todos los sectores de salud de este ciclo.</p>
            </div>
            <div className="mt-8 pt-6 border-t border-outline-variant/10">
              <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '98.2%' }}
                  className="bg-primary h-full"
                />
              </div>
            </div>
          </div>

          {/* Metric Card: Pending Rejections */}
          <div className="col-span-12 md:col-span-4 bg-surface-container-low p-8 rounded-[2.5rem] border border-outline-variant/10 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
            <div>
              <div className="flex justify-between items-start mb-6">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-secondary">Rechazos Pendientes</span>
                <div className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center text-error">
                  <span className="material-symbols-outlined select-none" dangerouslySetInnerHTML={{ __html: '&#xe85d;' }} />
                </div>
              </div>
              <div className="text-5xl font-black text-on-surface tracking-tighter">142</div>
              <p className="text-sm text-secondary mt-3 font-bold leading-relaxed">Casos críticos que requieren revisión manual inmediata del auditor.</p>
            </div>
            <div className="mt-8">
              <span className="bg-error-container text-on-error-container text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest border border-error/10">
                Prioridad Crítica
              </span>
            </div>
          </div>

          {/* Metric Card: Financial Impact */}
          <div className="col-span-12 md:col-span-4 bg-primary text-on-primary p-8 rounded-[2.5rem] flex flex-col justify-between shadow-xl shadow-primary/20 relative overflow-hidden group hover:scale-[1.01] transition-transform">
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-6">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-white">Impacto Financiero</span>
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <span className="material-symbols-outlined select-none" dangerouslySetInnerHTML={{ __html: '&#xef63;' }} />
                </div>
              </div>
              <div className="text-5xl font-black tracking-tighter text-white">$24.8M</div>
              <p className="text-sm text-white mt-3 font-bold leading-relaxed">Ajustes de auditoría calculados para el ciclo de remuneraciones actual.</p>
            </div>
            <div className="mt-8 flex items-center gap-2 text-[11px] font-black bg-white/10 w-fit px-4 py-2 rounded-full relative z-10">
              <span className="material-symbols-outlined text-xs">trending_up</span>
              <span className="uppercase tracking-widest">+12.4% vs Mar 2024</span>
            </div>
            {/* Decorative Glow */}
            <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-[80px] group-hover:bg-white/20 transition-all duration-700"></div>
          </div>

          {/* Large Chart Block: Validation Progress */}
          <div className="col-span-12 lg:col-span-8 bg-surface-container-lowest p-10 rounded-[2.5rem] shadow-sm border border-outline-variant/10 group">
            <div className="flex justify-between items-end mb-12">
              <div>
                <h3 className="text-2xl font-black text-on-surface mb-2 tracking-tight">Progreso de Validación</h3>
                <p className="text-sm text-secondary font-bold">Estado de sincronización diaria de unidades de auditoría</p>
              </div>
              <div className="flex gap-2 p-1.5 bg-surface-container rounded-2xl shadow-inner">
                <button className="px-5 py-2 text-on-surface-variant text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-white transition-all">Diario</button>
                <button className="px-5 py-2 bg-primary text-white text-[11px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20">Semanal</button>
              </div>
            </div>
            
            {/* Custom Visual Graph */}
            <div className="relative h-64 w-full flex items-end justify-between gap-6 px-4">
              {[40, 55, 45, 85, 60, 75, 70, 90, 82].map((height, idx) => (
                <div key={idx} className="flex-1 relative group/bar">
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{ delay: idx * 0.05, duration: 0.8, ease: "easeOut" }}
                    className={cn(
                      "w-full rounded-t-xl transition-all duration-300",
                      height > 80 ? "bg-primary shadow-lg shadow-primary/10" : "bg-surface-container-highest/60 group-hover/bar:bg-primary/20"
                    )}
                  />
                  {height === 85 && (
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] px-3 py-1 rounded-full font-black shadow-lg">
                      85%
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-6 text-[11px] font-black text-outline uppercase tracking-[0.2em] px-4">
              <span>Lun</span><span>Mar</span><span>Mie</span><span>Jue</span><span>Vie</span><span>Sab</span><span>Dom</span><span>Lun</span><span>Mar</span>
            </div>
          </div>

          {/* Active Periods Tray */}
          <div className="col-span-12 lg:col-span-4 bg-surface-container p-10 rounded-[2.5rem] flex flex-col border border-outline-variant/5">
            <h3 className="text-2xl font-black text-on-surface mb-8 tracking-tight">Periodos Activos</h3>
            <div className="space-y-4 flex-1">
              {loading ? (
                <div className="flex items-center justify-center h-48 animate-pulse text-outline font-black uppercase tracking-widest text-[11px]">
                  Sincronizando registros...
                </div>
              ) : periods.slice(0, 3).map((p, idx) => (
                <div 
                  key={p.id}
                  className={cn(
                    "p-5 rounded-2xl flex items-center justify-between transition-all cursor-pointer group hover:scale-[1.02]",
                    idx === 0 ? "bg-white shadow-xl shadow-slate-200/50 border-l-4 border-primary" : "bg-white/40 border-l-4 border-outline-variant/30 opacity-70 hover:opacity-100"
                  )}
                >
                  <div>
                    <p className="text-[15px] font-black text-on-surface">{new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(new Date(2026, p.periodo.mes - 1))} {p.periodo.anio}</p>
                    <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mt-1 group-hover:text-primary transition-colors">
                      {p.centro_salud.nombre}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-[11px] font-black uppercase tracking-widest", idx === 0 ? "text-primary" : "text-secondary")}>
                      {idx === 0 ? 'En Progreso' : 'Cerrado'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <button className="mt-10 w-full py-4 bg-primary/10 text-primary font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-primary hover:text-white transition-all shadow-sm active:scale-95 duration-200">
              Ver Historial de Auditoría
            </button>
          </div>
        </div>

        {/* Detailed Observations Section */}
        <div className="mt-16">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-3xl font-black text-on-surface font-headline tracking-tight">Observaciones Críticas</h3>
            <div className="flex gap-6">
              <span className="flex items-center gap-2.5 text-[11px] font-black text-secondary uppercase tracking-widest">
                <span className="w-2.5 h-2.5 rounded-full bg-error"></span> Acción Urgente
              </span>
              <span className="flex items-center gap-2.5 text-[11px] font-black text-secondary uppercase tracking-widest">
                <span className="w-2.5 h-2.5 rounded-full bg-primary-fixed"></span> Ajuste Menor
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Observation Card 1 */}
            <div className="bg-white p-8 rounded-[2rem] shadow-lg shadow-slate-100 border border-outline-variant/10 hover:border-primary/30 transition-all group">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h4 className="text-lg font-black text-on-surface group-hover:text-primary transition-colors">Hospital Central - Staff A</h4>
                  <p className="text-[11px] text-on-surface-variant font-bold uppercase tracking-widest mt-1">ID: AUDIT-9921-X</p>
                </div>
                <div className="text-2xl font-black text-primary font-headline tracking-tighter">$12.450</div>
              </div>
              <div className="space-y-4 pt-4 border-t border-outline-variant/5">
                <div className="flex justify-between text-xs">
                  <span className="text-on-surface-variant font-bold">Discrepancia</span>
                  <span className="font-black text-on-surface">Impuesto Salud</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-on-surface-variant font-bold text-xs">Estado</span>
                  <span className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">En Revisión</span>
                </div>
              </div>
            </div>

            {/* Observation Card 2 */}
            <div className="bg-white p-8 rounded-[2rem] shadow-lg shadow-slate-100 border border-outline-variant/10 hover:border-error/30 transition-all group">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h4 className="text-lg font-black text-on-surface group-hover:text-error transition-colors">Clinica Regional - Sector 4</h4>
                  <p className="text-[11px] text-on-surface-variant font-bold uppercase tracking-widest mt-1">ID: AUDIT-8812-Y</p>
                </div>
                <div className="text-2xl font-black text-error font-headline tracking-tighter">$42.900</div>
              </div>
              <div className="space-y-4 pt-4 border-t border-outline-variant/5">
                <div className="flex justify-between text-xs">
                  <span className="text-on-surface-variant font-bold">Discrepancia</span>
                  <span className="font-black text-error">Duplicidad H.E.</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-on-surface-variant font-bold text-xs">Estado</span>
                  <span className="bg-error-container text-on-error-container px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Alerta Alta</span>
                </div>
              </div>
            </div>

            {/* Observation Card 3 */}
            <div className="bg-white p-8 rounded-[2rem] shadow-lg shadow-slate-100 border border-outline-variant/10 hover:border-primary/30 transition-all group">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h4 className="text-lg font-black text-on-surface group-hover:text-primary transition-colors">Unidad Médica Norte</h4>
                  <p className="text-[11px] text-on-surface-variant font-bold uppercase tracking-widest mt-1">ID: AUDIT-7734-Z</p>
                </div>
                <div className="text-2xl font-black text-primary font-headline tracking-tighter">$8.200</div>
              </div>
              <div className="space-y-4 pt-4 border-t border-outline-variant/5">
                <div className="flex justify-between text-xs">
                  <span className="text-on-surface-variant font-bold">Discrepancia</span>
                  <span className="font-black text-on-surface">Índice Sueldo Base</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-on-surface-variant font-bold text-xs">Estado</span>
                  <span className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Pendiente V°B°</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Floating Action Button */}
      <button className="fixed bottom-24 right-12 bg-primary text-white p-6 rounded-[2rem] shadow-2xl flex items-center gap-4 hover:scale-110 active:scale-95 transition-all z-50 shadow-primary/40 group">
        <span className="material-symbols-outlined text-2xl group-hover:rotate-90 transition-transform select-none" dangerouslySetInnerHTML={{ __html: '&#xf23a;' }} />
        <span className="font-black text-sm uppercase tracking-widest pr-2">Nueva Unidad</span>
      </button>

      {/* Footer Meta Barra */}
      <footer className="fixed bottom-0 right-0 left-64 bg-surface-container/90 backdrop-blur-sm px-12 py-3 border-t border-outline-variant/10 z-40 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Remuneración Salud CMP • Progreso Global: 84%</span>
        </div>
        <div className="flex gap-8">
          <a href="#" className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest hover:text-primary transition-colors">Soporte</a>
          <a href="#" className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest hover:text-primary transition-colors">Privacidad</a>
          <a href="#" className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest hover:text-primary transition-colors">Estado Sistema</a>
        </div>
      </footer>
    </div>
  );
}

