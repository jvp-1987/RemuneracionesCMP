'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { cn } from "@/lib/utils";

interface Funcionario {
  rut: string;
  nombre_completo: string;
  profesion_enum: string;
  categoria_aps: string;
  nivel_aps: number;
  jornada_horas: number;
}

export default function FuncionariosPage() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/funcionarios`);
        setFuncionarios(res.data);
      } catch (err) {
        console.error('Error fetching funcionarios:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filtered = funcionarios.filter(f => 
    f.nombre_completo.toLowerCase().includes(search.toLowerCase()) ||
    f.rut.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-screen bg-surface p-12 pb-32">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12 animate-in fade-in slide-in-from-top-4 duration-500">
        <div>
          <h2 className="text-4xl font-black text-primary font-headline tracking-tight mb-2 uppercase">Maestro de Funcionarios</h2>
          <p className="text-secondary font-black text-xs tracking-[0.2em] uppercase opacity-60">
            Registro Centralizado • <span className="text-primary">{funcionarios.length}</span> Colaboradores APS
          </p>
        </div>
        <button className="px-8 py-4 rounded-2xl bg-primary text-white font-black hover:brightness-110 active:scale-95 transition-all flex items-center gap-3 shadow-2xl shadow-primary/20 text-[11px] uppercase tracking-widest group">
          <span className="material-symbols-outlined text-lg group-hover:rotate-12 transition-transform">person_add</span>
          Incorporar Nuevo Registro
        </button>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row gap-6 items-center justify-between mb-10 bg-surface-container-low p-6 rounded-[2.5rem] border border-outline-variant/10 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
        <div className="relative flex-1 group w-full">
          <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-outline text-lg group-focus-within:text-primary transition-colors">search</span>
          <input 
            type="text" 
            placeholder="Buscar por nombre clínico, RUT o identificación..."
            className="w-full pl-14 pr-6 py-4 bg-white border border-outline-variant/5 rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary shadow-sm transition-all text-sm font-bold text-on-surface placeholder:text-outline/50"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="px-8 py-4 bg-white border border-outline-variant/10 rounded-[1.5rem] flex items-center gap-3 text-secondary font-black hover:bg-surface-container-lowest shadow-sm transition-all text-[11px] uppercase tracking-widest">
          <span className="material-symbols-outlined text-lg">tune</span>
          Filtros Avanzados
        </button>
      </div>

      {/* High-Density Registry Table */}
      <div className="bg-white rounded-[3.5rem] border border-outline-variant/5 shadow-2xl shadow-slate-200/40 overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container/30 border-b border-outline-variant/5">
              <th className="px-10 py-7 text-[10px] font-black text-outline uppercase tracking-[0.25em]">Funcionario</th>
              <th className="px-10 py-7 text-[10px] font-black text-outline uppercase tracking-[0.25em] text-center">Clasificación APS</th>
              <th className="px-10 py-7 text-[10px] font-black text-outline uppercase tracking-[0.25em] text-center">Jornada Lab.</th>
              <th className="px-10 py-7 text-[10px] font-black text-outline uppercase tracking-[0.25em]">Estalafón / Profesión</th>
              <th className="px-10 py-7 text-[10px] font-black text-outline uppercase tracking-[0.25em] text-right">Expediente</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/5">
            {loading ? (
              [1,2,3,4,5].map((i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={5} className="px-10 py-12">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-surface-container rounded-2xl" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-surface-container rounded-full w-[40%]" />
                        <div className="h-2 bg-surface-container rounded-full w-[20%]" />
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-10 py-48 text-center font-black italic text-outline uppercase tracking-widest text-[11px] opacity-40">
                  Sincronizando registros para la consulta actual...
                </td>
              </tr>
            ) : (
              filtered.map((f, i) => (
                <tr 
                  key={f.rut}
                  onClick={() => router.push(`/funcionarios/${f.rut}`)}
                  className="hover:bg-primary/5 transition-all group cursor-pointer border-l-4 border-transparent hover:border-l-primary"
                >
                  <td className="px-10 py-7">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-[1rem] bg-secondary-container flex items-center justify-center border border-outline-variant/10 shadow-sm group-hover:bg-primary group-hover:text-white transition-all overflow-hidden relative">
                         <img 
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${f.rut}`} 
                            className="w-full h-full object-cover scale-150 grayscale group-hover:grayscale-0 transition-all opacity-40 group-hover:opacity-100" 
                            alt={f.nombre_completo}
                         />
                      </div>
                      <div>
                        <p className="font-black text-[15px] text-on-surface tracking-tight leading-none mb-1.5 group-hover:text-primary transition-colors uppercase">{f.nombre_completo}</p>
                        <p className="text-[10px] font-black text-outline uppercase tracking-widest opacity-60">RUT: {f.rut}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-7">
                    <div className="flex justify-center items-center gap-2">
                      <span className="px-4 py-1.5 rounded-xl bg-primary/10 text-primary text-[10px] font-black border border-primary/10 uppercase tracking-widest">
                        Cat. {f.categoria_aps || '?'}
                      </span>
                      <span className="px-4 py-1.5 rounded-xl bg-surface-container text-secondary text-[10px] font-black border border-outline-variant/10 uppercase tracking-widest">
                        Niv. {f.nivel_aps || '-'}
                      </span>
                    </div>
                  </td>
                  <td className="px-10 py-7 text-center">
                    <div className="inline-flex items-center gap-2 text-on-surface font-black">
                      <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                        <span className="material-symbols-outlined text-[16px] text-primary">schedule</span>
                      </div>
                      <span className="text-sm font-black tracking-tighter">{f.jornada_horas || 44} HRS</span>
                    </div>
                  </td>
                  <td className="px-10 py-7 text-left">
                    <span className="text-[10px] text-outline font-black uppercase tracking-[0.2em] bg-surface-container-low px-4 py-2 rounded-xl group-hover:bg-white transition-all shadow-sm">{f.profesion_enum}</span>
                  </td>
                  <td className="px-10 py-7 text-right">
                    <button className="p-3 bg-surface-container-lowest border border-outline-variant/10 rounded-2xl text-primary hover:bg-primary hover:text-white transition-all shadow-sm active:scale-95 group-hover:rotate-6">
                      <span className="material-symbols-outlined text-lg">chevron_right</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Floating Meta Footer */}
      <footer className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-on-background/95 backdrop-blur-2xl px-12 py-5 rounded-[2.5rem] flex items-center gap-16 shadow-2xl z-50 animate-in slide-in-from-bottom-8 duration-500">
        <div className="flex items-center gap-5 border-r border-white/10 pr-16">
          <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center">
             <span className="material-symbols-outlined text-primary text-2xl">clinical_notes</span>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-1">Registro Profesional</p>
            <p className="text-xl font-bold text-white tracking-tighter">Planilla Maestro CMP</p>
          </div>
        </div>
        <div className="flex gap-12">
           <div className="text-center">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Auditados</p>
              <p className="text-xl font-black text-primary">100%</p>
           </div>
           <button className="px-10 py-3 bg-white text-on-background rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-xl active:scale-95">
             Exportar Matriz
           </button>
        </div>
      </footer>
    </div>
  );
}
