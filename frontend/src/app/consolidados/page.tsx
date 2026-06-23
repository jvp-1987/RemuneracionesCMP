'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { cn } from "@/lib/utils";
import { HealthCenterLogo } from "@/components/HealthCenterLogo";
import { useAuth } from "@/components/AuthProvider";

interface Consolidado {
  id: number;
  estado_actual_enum: string;
  vb_control_interno: boolean;
  vb_finanzas: boolean;
  centro_salud: { nombre: string };
  periodo: { mes: number; anio: number; tipo?: string };
  _count?: {
    horas_extras?: number;
    viaticos?: number;
    atrasos?: number;
    turnos_urgencia?: number;
    procedimientos?: number;
  };
}

const MONTHS = [
  { mes: 1,  label: 'Enero 2026' },
  { mes: 2,  label: 'Febrero 2026' },
  { mes: 3,  label: 'Marzo 2026' },
  { mes: 4,  label: 'Abril 2026' },
  { mes: 5,  label: 'Mayo 2026' },
  { mes: 6,  label: 'Junio 2026' },
  { mes: 7,  label: 'Julio 2026' },
  { mes: 8,  label: 'Agosto 2026' },
  { mes: 9,  label: 'Septiembre 2026' },
  { mes: 10, label: 'Octubre 2026' },
  { mes: 11, label: 'Noviembre 2026' },
  { mes: 12, label: 'Diciembre 2026' },
];

export default function ConsolidadosPage() {
  const { user } = useAuth();
  const [consolidados, setConsolidados] = useState<Consolidado[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Use sessionStorage to persist filters
  const [selectedMonth, setSelectedMonth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('consolidados_month');
      return saved ? parseInt(saved) : (new Date().getMonth() + 1);
    }
    return (new Date().getMonth() + 1);
  });
  
  const [search, setSearch] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('consolidados_search') || '';
    }
    return '';
  });

  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('consolidados_month', selectedMonth.toString());
      sessionStorage.setItem('consolidados_search', search);
    }
  }, [selectedMonth, search]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api-remuneracion.apscolab.com';
        const res = await axios.get(`${apiUrl}/consolidados`);
        setConsolidados(res.data);

        // Si no hay un mes guardado en la sesión y hay registros, autoseleccionamos el del periodo más reciente
        if (typeof window !== 'undefined' && !sessionStorage.getItem('consolidados_month') && res.data.length > 0) {
          const latest = res.data.reduce((max: any, c: any) => {
            if (!max) return c;
            const maxVal = max.periodo.anio * 12 + max.periodo.mes;
            const cVal = c.periodo.anio * 12 + c.periodo.mes;
            return cVal > maxVal ? c : max;
          }, null);
          if (latest) {
            setSelectedMonth(latest.periodo.mes);
          }
        }
      } catch (err) {
        console.error('Error fetching consolidados:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleDownloadExcelList = async (e: React.MouseEvent, id: number, name: string, mes: number, anio: number, tipo?: string) => {
    e.stopPropagation(); // prevent navigating to details
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api-remuneracion.apscolab.com';
      const response = await axios.get(`${apiUrl}/consolidados/${id}/export`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const suffix = tipo === 'SUPLEMENTARIO' ? '_suplementario' : '';
      const filename = `consolidado_${name.replace(/\s+/g, '_')}_${mes}_${anio}${suffix}.xlsx`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error downloading consolidado:', err);
      alert('Error al descargar el consolidado');
    }
  };

  const filtered = consolidados.filter(c => 
    c.periodo.mes === selectedMonth && 
    c.centro_salud.nombre.toLowerCase().includes(search.toLowerCase())
  );

  const canBatchApprove = user?.rol === 'ADMIN' || user?.rol === 'ADMIN_MAESTRO' || user?.rol === 'CONTROL' || user?.rol === 'FINANZAS';


  return (
    <div className="flex flex-col min-h-screen bg-surface p-12 pb-32">
      {/* Page Header */}
      <div className="mb-12">
        <h2 className="text-4xl font-black text-primary font-headline tracking-tight mb-2">Unidades de Auditoría</h2>
        <p className="text-secondary font-medium flex items-center gap-2">
          Gestión y validación centralizada por centro de salud
        </p>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row gap-6 items-center justify-between mb-8 bg-surface-container-low p-6 rounded-[2rem] border border-outline-variant/10 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
          {MONTHS.map(m => (
            <button
              key={m.mes}
              onClick={() => setSelectedMonth(m.mes)}
              className={cn(
                "px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all",
                selectedMonth === m.mes 
                  ? "bg-primary text-white shadow-lg shadow-primary/20" 
                  : "bg-white text-secondary hover:bg-white/60 border border-outline-variant/10"
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-sm">search</span>
            <input 
              type="text"
              placeholder="Buscar unidad..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-outline-variant/10 rounded-xl pl-11 pr-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
            />
          </div>
          <button className="p-2.5 bg-white border border-outline-variant/10 rounded-xl text-secondary hover:text-primary transition-all">
            <span className="material-symbols-outlined">filter_list</span>
          </button>
        </div>
      </div>

      {/* High-Density Table */}
      <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-outline-variant/5 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-surface-container/30 border-b border-outline-variant/10">
            <tr>
              <th className="px-6 py-3.5 text-[10px] font-black text-outline uppercase tracking-[0.2em]">Unidad de Salud</th>
              <th className="px-6 py-3.5 text-[10px] font-black text-outline uppercase tracking-[0.2em]">Estado Auditoría</th>
              <th className="px-6 py-3.5 text-[10px] font-black text-outline uppercase tracking-[0.2em] text-center">Control / Finanzas</th>
              <th className="px-6 py-3.5 text-[10px] font-black text-outline uppercase tracking-[0.2em] text-center">Registros</th>
              <th className="px-6 py-3.5 text-[10px] font-black text-outline uppercase tracking-[0.2em] text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/5">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-20 text-center animate-pulse text-outline font-black uppercase tracking-widest text-xs">
                  Sincronizando matriz de auditoría...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-20 text-center text-outline font-black uppercase tracking-widest text-xs italic">
                  No se encontraron unidades para este periodo
                </td>
              </tr>
            ) : filtered.map((c) => (
              <tr key={c.id} className="group hover:bg-white hover:scale-[1.01] hover:shadow-lg transition-all duration-300 cursor-pointer relative z-0 hover:z-10" onClick={() => router.push(`/consolidados/${c.id}`)}>
                <td className="px-6 py-3.5">
                  <div className="flex items-center gap-3">
                    <HealthCenterLogo name={c.centro_salud.nombre} className="group-hover:border-primary/30" />
                    <div>
                      <p className="font-black text-[14px] group-hover:text-primary transition-colors flex items-center gap-2">
                        {c.centro_salud.nombre}
                        {c.periodo.tipo === 'SUPLEMENTARIO' && (
                          <span className="text-[9px] bg-amber-500 text-white px-2 py-0.5 rounded font-black tracking-normal uppercase">Supl.</span>
                        )}
                      </p>
                      <p className="text-[9px] font-bold text-outline uppercase tracking-widest mt-0.5">Audit-ID: CMP-{c.id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-3.5">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-1.5 h-1.5 rounded-full", c.estado_actual_enum === 'Aprobado' ? "bg-primary" : "bg-warning")} />
                    <span className={cn(
                       "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                       c.estado_actual_enum === 'Aprobado' ? "bg-primary/10 text-primary" : "bg-surface-container text-secondary"
                    )}>
                      {c.estado_actual_enum === 'Aprobado' ? 'Certificado' : 'En Cierre'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-3.5">
                  <div className="flex justify-center items-center gap-3">
                    <div className={cn("flex items-center gap-1 opacity-40 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all", c.vb_control_interno && "opacity-100 grayscale-0")}>
                      <span className={cn("material-symbols-outlined text-[13px] select-none", c.vb_control_interno ? "text-primary" : "text-outline")} dangerouslySetInnerHTML={{ __html: c.vb_control_interno ? '&#xe86c;' : '&#xef64;' }} />
                      <span className="text-[9px] font-black text-outline uppercase">CI</span>
                    </div>
                    <div className={cn("flex items-center gap-1 opacity-40 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all", c.vb_finanzas && "opacity-100 grayscale-0")}>
                      <span className={cn("material-symbols-outlined text-[13px] select-none", c.vb_finanzas ? "text-primary" : "text-outline")} dangerouslySetInnerHTML={{ __html: c.vb_finanzas ? '&#xe86c;' : '&#xef64;' }} />
                      <span className="text-[9px] font-black text-outline uppercase">FI</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-3.5 text-center">
                  <span className="text-xs font-black text-on-surface">
                    {(c._count?.horas_extras || 0) + 
                     (c._count?.viaticos || 0) + 
                     (c._count?.atrasos || 0) + 
                     (c._count?.turnos_urgencia || 0) + 
                     (c._count?.procedimientos || 0)}
                  </span>
                  <span className="text-[9px] font-bold text-outline uppercase tracking-widest ml-1">Regs</span>
                </td>
                <td className="px-6 py-3.5 text-right">
                  <div className="flex justify-end gap-1.5">
                    <button 
                      onClick={(e) => handleDownloadExcelList(e, c.id, c.centro_salud.nombre, c.periodo.mes, c.periodo.anio, c.periodo.tipo)}
                      className="p-1.5 border border-emerald-200/50 rounded-lg text-emerald-600 bg-emerald-50 hover:bg-emerald-600 hover:text-white transition-all shadow-sm flex items-center justify-center"
                      title="Descargar Excel Consolidado"
                    >
                      <span className="material-symbols-outlined text-base select-none">download</span>
                    </button>
                    <button className="p-1.5 border border-outline-variant/10 rounded-lg text-primary hover:bg-primary hover:text-white transition-all shadow-sm flex items-center justify-center">
                      <span className="material-symbols-outlined text-base select-none" dangerouslySetInnerHTML={{ __html: '&#xe5cc;' }} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Floating Status Bar Overlay - Solo para perfiles de aprobación global */}
      {canBatchApprove && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur-2xl text-white px-8 py-5 rounded-[2.5rem] flex items-center gap-12 shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/10 z-50 animate-in slide-in-from-bottom-8 duration-700">
          <div className="flex items-center gap-4 border-r border-white/10 pr-12">
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Progreso Global Mayo</p>
              <p className="text-xl font-bold">84%</p>
            </div>
            <div className="w-48 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-primary-fixed w-[84%]" />
            </div>
          </div>
          <div className="flex items-center gap-8">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Total Auditoría</p>
              <p className="text-xl font-bold">$24.8M</p>
            </div>
            <button className="relative px-8 py-3 bg-primary text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/30 overflow-hidden group">
              <span className="relative z-10">Aprobar Lote</span>
              <div className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:animate-[shimmer_1s_forwards] skew-x-12" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
