'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";
import ChangePasswordForm from "@/components/ChangePasswordForm";

export default function ConfigurationPage() {
  return (
    <div className="space-y-12 p-2 font-manrope">
      {/* Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-end border-b border-slate-200/20 pb-8"
      >
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Configuración</h1>
          <div className="flex items-center gap-2">
            <span className="w-8 h-1 bg-primary rounded-full"></span>
            <p className="text-slate-500 font-bold text-[11px] tracking-widest uppercase">Parámetros Globales Audit Console</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-primary text-white font-black hover:brightness-110 transition-all text-xs uppercase tracking-widest shadow-xl shadow-primary/20">
          <span className="material-symbols-outlined text-sm">save</span>
          Guardar Cambios
        </button>
      </motion.div>

      {/* Settings Grid (Bento) */}
      <div className="grid grid-cols-12 gap-8">
        
        {/* Audit Parameters - Large Widget */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="col-span-12 lg:col-span-8 bg-white p-10 rounded-[2.5rem] border border-slate-200/50 shadow-xl shadow-slate-200/40 relative overflow-hidden group"
        >
          <div className="flex items-center gap-3 mb-10">
            <div className="p-3 rounded-2xl bg-primary/5 text-primary border border-primary/10">
              <span className="material-symbols-outlined text-3xl">rule_settings</span>
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Parámetros de Auditoría</h3>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Reglas de validación maestra</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Umbral de Anomalía (%)</label>
              <div className="relative">
                <input 
                  type="number" 
                  defaultValue={20} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-black focus:ring-4 focus:ring-primary/10 focus:border-primary text-slate-900 transition-all shadow-inner"
                />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-primary font-black">%</span>
              </div>
              <p className="text-[10px] text-slate-400 font-bold italic leading-relaxed">Dispara alertas visuales si el monto aumenta más de este porcentaje.</p>
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Límite Horas Extras Mensuales</label>
              <div className="relative">
                <input 
                  type="number" 
                  defaultValue={40} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-black focus:ring-4 focus:ring-primary/10 focus:border-primary text-slate-900 transition-all shadow-inner"
                />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-primary font-black">HRS</span>
              </div>
              <p className="text-[10px] text-slate-400 font-bold italic leading-relaxed">Tope de horas permitidas antes de requerir justificación especial.</p>
            </div>
          </div>

          <div className="mt-12 pt-10 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-200 shadow-inner group/toggle cursor-pointer hover:border-primary/30 transition-all">
              <div>
                <p className="text-xs font-black text-slate-900 uppercase tracking-tight">Validadores Requeridos</p>
                <p className="text-[10px] text-slate-500 font-bold mt-1">Requiere V°B° Control y Finanzas</p>
              </div>
              <div className="w-14 h-7 bg-primary rounded-full relative p-1.5 shadow-lg shadow-primary/20">
                <div className="w-4 h-4 bg-white rounded-full ml-auto"></div>
              </div>
            </div>
            <div className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-200 shadow-inner opacity-60">
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-tight">Auto-Validación Inteligente</p>
                <p className="text-[10px] text-rose-500 font-black mt-1 uppercase tracking-widest">Desactivado por Seguridad</p>
              </div>
              <div className="w-14 h-7 bg-slate-200 rounded-full relative p-1.5">
                <div className="w-4 h-4 bg-slate-400 rounded-full"></div>
              </div>
            </div>
          </div>
          {/* Decorative Glow */}
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-all duration-700"></div>
        </motion.div>

        {/* Identity & Profile - Side Widget */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="col-span-12 lg:col-span-4 space-y-8"
        >
          <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200/50 shadow-xl shadow-slate-200/40">
            <h3 className="text-xs font-black text-slate-500 uppercase mb-8 tracking-[0.2em]">Identidad Administrador</h3>
            <div className="flex flex-col items-center mb-10">
              <div className="relative group">
                <img 
                  className="w-28 h-28 rounded-[2rem] object-cover grayscale opacity-80 border-4 border-slate-50 p-1 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500 rotate-3 group-hover:rotate-0 shadow-lg"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAcIiOV0sebGOap7bo-0R7uTZOB8-RGJ-3XbNW4Wda2s5tNlurbmSN45rXwukcO7VQUVOpgu2CCs6eKKzP0F1lhGBhCfjQowrwt3p0OjRpEmmjVaSPGKBRGHVvuXD3f1z8Iisd1dvicS3HDVNWa4LJnnugecJ24iJzBaTAukOdzf1voy0vVwj2C7ynhQkCxI6z7rkjjr3DZBIgwsn17mZUxU9yje4QCMQP1KxudGiPf5c7Y57cxZVEsU5-21IA6nVTYR5q5zX3NuqGB"
                  alt="Admin Profile"
                />
                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary text-white rounded-xl shadow-xl flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-all">
                  <span className="material-symbols-outlined text-base">photo_camera</span>
                </div>
              </div>
              <h4 className="mt-8 font-black text-slate-900 text-lg tracking-tight leading-none mb-1">Admin Multi-Centro</h4>
              <p className="text-[10px] text-primary uppercase font-black tracking-[0.2em] bg-primary/5 px-3 py-1 rounded-full">Nivel 4 Auditor Maestro</p>
            </div>
            <div className="space-y-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 underline decoration-primary decoration-2 underline-offset-4 uppercase tracking-widest block mb-1">Nombre Visual Firma</label>
                  <input type="text" defaultValue="ANGELICA MARIA NAVIA JOFRE" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-primary/10 mr-2" />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 underline decoration-primary decoration-2 underline-offset-4 uppercase tracking-widest block mb-1">Cargo Ejecutivo</label>
                  <input type="text" defaultValue="Jefa de Personal Panguipulli" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-primary/10 mr-2" />
               </div>
               
               <Link href="/configuracion/usuarios" className="flex items-center justify-center gap-3 w-full py-4 mt-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all group">
                  <span className="material-symbols-outlined text-base group-hover:rotate-12 transition-transform">group</span>
                  Gestionar Perfiles de Acceso
               </Link>
               
               <Link href="/configuracion/periodos" className="flex items-center justify-center gap-3 w-full py-4 mt-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all group">
                  <span className="material-symbols-outlined text-base group-hover:rotate-12 transition-transform">calendar_month</span>
                  Control de Periodos
               </Link>
            </div>
          </div>

          <ChangePasswordForm />
        </motion.div>

        {/* APS Rates - Full Width Widget */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="col-span-12 bg-white p-12 rounded-[3.5rem] border border-slate-200/50 shadow-2xl shadow-slate-200/40 overflow-hidden"
        >
          <div className="flex justify-between items-center mb-12">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-3xl bg-secondary/5 text-secondary border border-secondary/10 shadow-inner">
                <span className="material-symbols-outlined text-4xl">payments</span>
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Valores Horas APS 2026</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Escala remunerativa oficial centralizada</p>
              </div>
            </div>
            <span className="px-5 py-2 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Sincronizado Minsal
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {['CATEGORÍA A', 'CATEGORÍA B', 'CATEGORÍA C'].map((cat, i) => (
              <div key={cat} className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-200 shadow-inner hover:border-primary/30 transition-all group relative overflow-hidden">
                <div className="flex justify-between items-center mb-10 relative z-10">
                  <span className="text-lg font-black text-slate-900 group-hover:text-primary transition-colors tracking-tight">{cat}</span>
                  <div className="p-2 bg-white rounded-xl border border-slate-100 shadow-sm cursor-pointer hover:bg-primary hover:text-white transition-all active:scale-95">
                    <span className="material-symbols-outlined text-base">edit</span>
                  </div>
                </div>
                <div className="space-y-6 relative z-10">
                  <div className="flex justify-between items-end border-b border-slate-200 border-dotted pb-3">
                    <span className="text-[11px] text-slate-400 font-black uppercase tracking-widest">VALOR DIURNO (25%)</span>
                    <span className="text-xl font-mono font-black text-slate-900 group-hover:text-primary transition-colors">$12.450</span>
                  </div>
                  <div className="flex justify-between items-end border-b border-slate-200 border-dotted pb-3">
                    <span className="text-[11px] text-slate-400 font-black uppercase tracking-widest">VALOR NOCTURNO (50%)</span>
                    <span className="text-xl font-mono font-black text-slate-900 group-hover:text-primary transition-colors">$15.560</span>
                  </div>
                </div>
                {/* Decoration */}
                <span className="absolute -right-4 -bottom-4 material-symbols-outlined text-8xl opacity-[0.03] group-hover:opacity-[0.08] transition-all" style={{ fontVariationSettings: "'FILL' 1" }}>monetization_on</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
