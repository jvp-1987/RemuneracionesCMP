'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function AlertasRRHHPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlertas = async () => {
      try {
        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/alertas-rrhh`);
        setData(res.data);
      } catch (err) {
        console.error('Error fetching alertas:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAlertas();
  }, []);

  if (loading) {
    return <div className="p-20 text-center animate-pulse text-primary font-black uppercase tracking-widest text-xs">Sincronizando Alertas...</div>;
  }

  const contratosAlerts = data?.contratos || [];
  const asignacionesAlerts = data?.asignaciones || [];
  const auditoriaAlerts = data?.auditoria || [];

  return (
    <div className="p-12 max-w-7xl mx-auto w-full space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-4">
        <h1 className="text-5xl font-black text-on-surface tracking-tighter uppercase font-headline">Alertas de RRHH</h1>
        <p className="text-secondary font-black text-xs tracking-[0.2em] uppercase">Monitor de vencimientos y calidad de datos</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Contratos */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[3rem] p-10 shadow-2xl shadow-slate-200/30 border border-outline-variant/5"
        >
          <div className="flex justify-between items-start mb-8">
            <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase font-headline">Contratos</h3>
            <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-[10px] font-black uppercase tracking-widest">{contratosAlerts.length}</span>
          </div>
          
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 no-scrollbar">
            {contratosAlerts.length === 0 ? (
               <p className="text-xs text-outline font-black uppercase tracking-widest italic py-4">No hay alertas de contrato.</p>
            ) : (
              contratosAlerts.map((alert: any) => (
                <Link key={alert.id} href={`/funcionarios/${alert.rut}`} className="block p-5 rounded-2xl border border-outline-variant/10 bg-surface-container-low hover:border-primary/30 transition-all group">
                  <div className="flex justify-between items-center mb-2">
                     <span className="text-xs font-black text-on-surface uppercase tracking-tight group-hover:text-primary transition-colors">{alert.funcionario}</span>
                     <span className={cn(
                       "px-2 py-1 text-[9px] font-black uppercase tracking-widest rounded-md", 
                       alert.dias_restantes < 0 ? "bg-red-600 text-white animate-pulse" : 
                       alert.dias_restantes <= 15 ? "bg-error/10 text-error" : 
                       "bg-amber-50 text-amber-600"
                     )}>
                        {alert.dias_restantes < 0 ? 'VENCIDO' : `${alert.dias_restantes} días`}
                     </span>
                  </div>
                  <div className="text-[10px] font-bold text-secondary uppercase tracking-widest">
                    {alert.detalle} • Hasta {new Date(alert.fecha_termino).toLocaleDateString()}
                  </div>
                </Link>
              ))
            )}
          </div>
        </motion.div>

        {/* Asignaciones */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-[3rem] p-10 shadow-2xl shadow-slate-200/30 border border-outline-variant/5"
        >
          <div className="flex justify-between items-start mb-8">
            <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase font-headline">Asignaciones</h3>
            <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-widest">{asignacionesAlerts.length}</span>
          </div>

          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 no-scrollbar">
            {asignacionesAlerts.length === 0 ? (
               <p className="text-xs text-outline font-black uppercase tracking-widest italic py-4">No hay alertas de asignación.</p>
            ) : (
              asignacionesAlerts.map((alert: any) => (
                <Link key={alert.id} href={`/funcionarios/${alert.rut}`} className="block p-5 rounded-2xl border border-outline-variant/10 bg-surface-container-low hover:border-primary/30 transition-all group">
                  <div className="flex justify-between items-center mb-2">
                     <span className="text-xs font-black text-on-surface uppercase tracking-tight group-hover:text-primary transition-colors">{alert.funcionario}</span>
                     <span className={cn(
                       "px-2 py-1 text-[9px] font-black uppercase tracking-widest rounded-md", 
                       alert.dias_restantes < 0 ? "bg-red-600 text-white animate-pulse" : 
                       alert.dias_restantes <= 15 ? "bg-error/10 text-error" : 
                       "bg-amber-50 text-amber-600"
                     )}>
                        {alert.dias_restantes < 0 ? 'EXPIRADO' : `${alert.dias_restantes} días`}
                     </span>
                  </div>
                  <div className="text-[10px] font-bold text-secondary uppercase tracking-widest">
                    {alert.detalle} • Hasta {new Date(alert.fecha_termino).toLocaleDateString()}
                  </div>
                </Link>
              ))
            )}
          </div>
        </motion.div>

        {/* Auditoría */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-900 rounded-[3rem] p-10 shadow-2xl shadow-slate-900/20 border border-white/10 text-white"
        >
          <div className="flex justify-between items-start mb-8">
            <h3 className="text-xl font-black text-white tracking-tighter uppercase font-headline">Auditoría de Datos</h3>
            <span className="px-3 py-1 bg-white/10 text-white rounded-full text-[10px] font-black uppercase tracking-widest">{auditoriaAlerts.length}</span>
          </div>

          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 no-scrollbar">
            {auditoriaAlerts.length === 0 ? (
               <p className="text-xs text-white/40 font-black uppercase tracking-widest italic py-4">Datos íntegros. Sin inconsistencias.</p>
            ) : (
              auditoriaAlerts.map((alert: any) => (
                <Link key={alert.id} href={`/funcionarios/${alert.rut}`} className="block p-5 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all group">
                  <div className="flex justify-between items-center mb-2">
                     <span className="text-xs font-black text-white uppercase tracking-tight group-hover:text-primary transition-colors">{alert.funcionario}</span>
                     <span className="px-2 py-1 text-[9px] font-black uppercase tracking-widest rounded-md bg-rose-500 text-white">
                        {alert.severidad}
                     </span>
                  </div>
                  <div className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                    {alert.detalle} • RUT {alert.rut}
                  </div>
                </Link>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

