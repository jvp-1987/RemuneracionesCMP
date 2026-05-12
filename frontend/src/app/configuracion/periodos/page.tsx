'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";
import { 
  Calendar, 
  Lock, 
  Unlock, 
  RefreshCcw, 
  CheckCircle2, 
  AlertTriangle,
  FileText,
  ChevronRight,
  ShieldCheck,
  Zap
} from 'lucide-react';

// --- Tipos ---
interface PeriodStatus {
  id: number;
  mes: number;
  anio: number;
  estado: string;
  hasMaestro: boolean;
  maestroCount: number;
  auditProgress: number;
  isClosed: boolean;
}

const MESES_LARGOS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function PeriodControlPage() {
  const [periodos, setPeriodos] = useState<PeriodStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api-remuneracion.apscolab.com';
      const res = await axios.get(`${apiUrl}/periodos/status/detailed`);
      setPeriodos(res.data);
      
      // Auto-seed si no hay periodos para 2026
      if (res.data.length === 0) {
        handleSeed();
      }
    } catch (err) {
      console.error('Error fetching period status:', err);
      setError('No se pudo cargar el estado de los períodos.');
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api-remuneracion.apscolab.com';
      await axios.post(`${apiUrl}/periodos/seed/2026`);
      await fetchStatus();
    } catch (err) {
      console.error('Error seeding periods:', err);
    } finally {
      setSeeding(false);
    }
  };

  const togglePeriodStatus = async (id: number, currentStatus: string) => {
    if (!isAdmin) return;
    
    const newStatus = currentStatus === 'Abierto' ? 'Cerrado' : 'Abierto';
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    try {
      await axios.patch(`${apiUrl}/periodos/${id}`, { estado: newStatus });
      setPeriodos(prev => prev.map(p => p.id === id ? { ...p, estado: newStatus, isClosed: newStatus === 'Cerrado' } : p));
    } catch (err) {
      console.error('Error toggling period status:', err);
    }
  };

  useEffect(() => {
    // Leemos el usuario guardado tras el login para verificar si es ADMIN
    const authData = localStorage.getItem('usuario'); // Ajusta la key si usas otro nombre
    if (authData) {
      try {
        const user = JSON.parse(authData);
        setIsAdmin(user.rol === 'ADMIN' || user.rol_enum === 'ADMIN');
      } catch (e) {
        console.error('Error al parsear usuario local');
      }
    }
    fetchStatus();
  }, []);

  return (
    <div className="min-h-screen bg-surface p-12 font-manrope">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12 border-b border-outline-variant/10 pb-12">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-primary/10 text-primary rounded-2xl">
              <Calendar className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Control de Períodos</h1>
              <div className="flex items-center gap-2">
                <span className="w-8 h-1 bg-primary rounded-full"></span>
                <p className="text-slate-500 font-bold text-[10px] tracking-widest uppercase">Gestión Anual Remuneraciones 2026</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button 
            onClick={fetchStatus}
            className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-white border border-slate-200 text-slate-600 font-black text-[11px] uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
          >
            <RefreshCcw className={cn("w-4 h-4", loading && "animate-spin text-primary")} />
            Refrescar
          </button>
          
          {isAdmin && (
            <button 
              onClick={handleSeed}
              disabled={seeding}
              className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-slate-900 text-white font-black text-[11px] uppercase tracking-widest hover:brightness-125 transition-all shadow-xl"
            >
              <Zap className={cn("w-4 h-4", seeding && "animate-pulse")} />
              {seeding ? 'Generando...' : 'Inicializar 2026'}
            </button>
          )}
        </div>
      </div>

      {loading && periodos.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="bg-white/50 border border-slate-100 rounded-[2.5rem] h-64 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {periodos.map((p, index) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "group relative bg-white rounded-[2.5rem] p-8 border transition-all duration-500 hover:shadow-2xl hover:shadow-slate-200/50 hover:-translate-y-1 overflow-hidden",
                p.isClosed ? "border-rose-100 bg-rose-50/10" : "border-slate-100 shadow-sm"
              )}
            >
              {/* Month Indicator */}
              <div className="flex justify-between items-start mb-10">
                <div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tighter leading-none mb-1">
                    {MESES_LARGOS[p.mes - 1]}
                  </h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{p.anio}</p>
                </div>
                
                <span className={cn(
                  "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2",
                  p.isClosed 
                    ? "bg-rose-100 text-rose-600 border border-rose-200" 
                    : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                )}>
                  <span className={cn("w-2 h-2 rounded-full", p.isClosed ? "bg-rose-500" : "bg-emerald-500 animate-pulse")} />
                  {p.estado}
                </span>
              </div>

              {/* Data Status */}
              <div className="space-y-6 mb-12">
                {/* Maestro Status */}
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner transition-colors",
                    p.hasMaestro ? "bg-emerald-50 text-emerald-500" : "bg-slate-50 text-slate-300"
                  )}>
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em] mb-0.5">Planilla Maestro</p>
                    <p className={cn(
                      "text-xs font-black",
                      p.hasMaestro ? "text-slate-700" : "text-slate-400 italic"
                    )}>
                      {p.hasMaestro ? `${p.maestroCount} funcionarios` : 'Pendiente cargar'}
                    </p>
                  </div>
                </div>

                {/* Audit Progress */}
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em]">Avance de Auditoría</p>
                    <span className="text-[11px] font-bold text-primary">{p.auditProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${p.auditProgress}%` }}
                      className={cn(
                        "h-full rounded-full transition-all duration-1000",
                        p.auditProgress === 100 ? "bg-primary shadow-[0_0_12px_rgba(59,130,246,0.5)]" : "bg-blue-400"
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-8 border-t border-slate-50 flex items-center justify-between gap-4">
                {isAdmin ? (
                  <button 
                    onClick={() => togglePeriodStatus(p.id, p.estado)}
                    className={cn(
                      "flex-1 py-4 rounded-2xl flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95",
                      p.isClosed 
                        ? "bg-slate-100 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 border border-transparent hover:border-emerald-200" 
                        : "bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 shadow-sm"
                    )}
                  >
                    {p.isClosed ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    {p.isClosed ? 'Reabrir Mes' : 'Cerrar Mes'}
                  </button>
                ) : (
                  <div className="flex-1 flex items-center justify-center gap-2 py-4 text-slate-300 font-bold text-[9px] uppercase tracking-widest bg-slate-50 rounded-2xl border border-slate-100">
                    <ShieldCheck className="w-4 h-4" />
                    Vista de Lectura
                  </div>
                )}
                
                <a 
                  href={p.isClosed ? '#' : `/ingreso?periodo=${p.id}`}
                  className={cn(
                    "p-4 rounded-2xl transition-all",
                    p.isClosed 
                      ? "bg-slate-50 text-slate-300 cursor-not-allowed" 
                      : "bg-primary/5 text-primary hover:bg-primary hover:text-white shadow-inner active:scale-90"
                  )}
                  title="Gestionar Novedades"
                >
                  <ChevronRight className="w-5 h-5" />
                </a>
              </div>

              {/* Decorative month number background */}
              <span className="absolute -right-6 -top-6 text-[120px] font-black text-slate-50 opacity-20 pointer-events-none group-hover:opacity-40 transition-opacity">
                {p.mes.toString().padStart(2, '0')}
              </span>
              
              {p.auditProgress === 100 && (
                <div className="absolute top-8 right-8 text-emerald-500 drop-shadow-sm">
                   <CheckCircle2 className="w-6 h-6 fill-emerald-50" />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Security Tip Bar */}
      {isAdmin && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-6">
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="bg-slate-900/90 backdrop-blur-md p-4 rounded-[2rem] border border-white/10 shadow-2xl flex items-center gap-6"
          >
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-primary/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">Mesa de Seguridad</p>
              <p className="text-[12px] font-bold text-white leading-tight">
                Cerrar un mes bloquea las cargas de Maestro y el ingreso de novedades para asegurar la inalterabilidad de los reportes enviados a Contraloría.
              </p>
            </div>
          </motion.div>
        </div>
      )}

      {/* Custom Styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
