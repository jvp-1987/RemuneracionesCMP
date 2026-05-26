'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";
import { 
  Calendar,
  Download,
  Filter,
  DollarSign,
  Users,
  ArrowLeft,
  Search,
  Activity
} from 'lucide-react';
import Link from 'next/link';

interface HaberResumen {
  nombre_haber: string;
  total_monto: number;
  total_funcionarios: number;
}

interface HaberDetalleFuncionario {
  rut: string;
  nombre: string;
  haberes: Record<string, number>;
  total_haberes_seleccionados: number;
}

export default function HaberesReportPage() {
  const [resumen, setResumen] = useState<HaberResumen[]>([]);
  const [detalle, setDetalle] = useState<HaberDetalleFuncionario[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [availablePeriods, setAvailablePeriods] = useState<{ id: number; mes: number; anio: number }[]>([]);
  const [selectedPeriods, setSelectedPeriods] = useState<number[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const init = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api-remuneracion.apscolab.com';
        const perRes = await axios.get(`${apiUrl}/periodos`);
        const periods = perRes.data.sort((a: any, b: any) => {
          if (b.anio !== a.anio) return b.anio - a.anio;
          return b.mes - a.mes;
        });
        setAvailablePeriods(periods);
        if (periods.length > 0) {
          setSelectedPeriods([periods[0].id]);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching periods:', err);
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (selectedPeriods.length === 0 && availablePeriods.length > 0) return;
    if (availablePeriods.length === 0) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api-remuneracion.apscolab.com';
        const params = { periodoIds: selectedPeriods.join(',') };
        const res = await axios.get(`${apiUrl}/reportes/haberes-stats`, { params });
        setResumen(res.data.resumen || []);
        setDetalle(res.data.detalle || []);
      } catch (err: any) {
        console.error('Error fetching haberes stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedPeriods, availablePeriods]);

  const filteredDetalle = detalle.filter(f => 
    f.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    f.rut.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const maxHaberAmount = Math.max(...resumen.map(r => r.total_monto), 1);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-surface p-12 items-center justify-center">
        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="mt-8 font-black uppercase tracking-[0.3em] text-outline text-xs animate-pulse">Analizando Haberes...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-surface p-12 pb-32">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-8 relative z-50">
        <div>
          <Link href="/reportes" className="flex items-center gap-2 text-xs font-bold text-primary mb-4 hover:underline">
            <ArrowLeft className="w-4 h-4" /> Volver a Dashboard General
          </Link>
          <h2 className="text-[3.5rem] font-black leading-none tracking-tight text-primary font-headline mb-4">
            Reporte de Haberes
          </h2>
          <div className="flex items-center gap-3">
            <span className="bg-primary/10 text-primary text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-primary/20">
              Desglose de Pagos
            </span>
            <span className="text-secondary text-xs font-bold opacity-60 flex items-center gap-2">
              <Calendar className="w-3 h-3" /> {selectedPeriods.length === 1 ? '1 Período Seleccionado' : `${selectedPeriods.length} Períodos Seleccionados`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-white/50 backdrop-blur-md p-2 rounded-2xl border border-outline-variant/10 shadow-sm">
          <div className="relative">
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="px-4 py-3 bg-white border border-outline-variant/10 rounded-xl text-xs font-black uppercase tracking-widest text-primary hover:border-primary/30 transition-all outline-none cursor-pointer flex items-center gap-2"
            >
              Filtro Períodos
              <span className="bg-primary text-white px-2 py-0.5 rounded-full text-[10px]">{selectedPeriods.length}</span>
            </button>
            {dropdownOpen && (
              <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-outline-variant/10 p-3 z-50 max-h-64 overflow-y-auto">
                <div className="flex justify-between items-center mb-3 pb-2 border-b border-outline-variant/10">
                  <span className="text-[10px] font-black uppercase tracking-widest text-secondary">Períodos Disponibles</span>
                  <button onClick={() => setDropdownOpen(false)} className="text-[10px] text-primary hover:underline">Cerrar</button>
                </div>
                {availablePeriods.map(p => (
                  <label key={p.id} className="flex items-center gap-3 p-2 hover:bg-surface-container rounded-lg cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      checked={selectedPeriods.includes(p.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPeriods([...selectedPeriods, p.id]);
                        } else {
                          setSelectedPeriods(selectedPeriods.filter(id => id !== p.id));
                        }
                      }}
                      className="w-4 h-4 rounded text-primary focus:ring-primary"
                    />
                    <span className="text-xs font-bold text-on-surface">{MONTHS[p.mes - 1]} {p.anio}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <button className="px-6 py-3 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 flex items-center gap-2 hover:scale-[1.02] active:scale-95 transition-all">
            <Download className="w-4 h-4 text-white" /> Exportar Informe
          </button>
        </div>
      </div>

      {/* Main KPI Grid */}
      <div className="grid grid-cols-12 gap-8 mb-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="col-span-12 md:col-span-4 bg-primary text-on-primary p-8 rounded-[2.5rem] shadow-xl shadow-primary/20 flex flex-col justify-between relative overflow-hidden group"
        >
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-2">Total Analizado (Haberes)</p>
              <h3 className="text-5xl font-black tracking-tighter">
                ${resumen.reduce((acc, curr) => acc + curr.total_monto, 0).toLocaleString('es-CL')}
              </h3>
            </div>
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-white/5 rounded-full blur-[80px] group-hover:scale-125 transition-transform duration-1000" />
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="col-span-12 md:col-span-4 bg-white p-8 rounded-[2.5rem] border border-outline-variant/10 shadow-sm flex flex-col justify-between"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary mb-2">Funcionarios Implicados</p>
              <h3 className="text-5xl font-black text-on-surface tracking-tighter">
                {detalle.length}
              </h3>
            </div>
            <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="col-span-12 md:col-span-4 bg-white p-8 rounded-[2.5rem] border border-outline-variant/10 shadow-sm flex flex-col justify-between"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary mb-2">Haber de Mayor Gasto</p>
              <h3 className="text-2xl font-black text-primary leading-tight mt-1 mb-2">
                {resumen.length > 0 ? resumen[0].nombre_haber : 'N/A'}
              </h3>
              <p className="text-lg font-bold text-on-surface">
                ${resumen.length > 0 ? resumen[0].total_monto.toLocaleString('es-CL') : '0'}
              </p>
            </div>
            <div className="w-12 h-12 bg-primary-container text-on-primary-container rounded-2xl flex items-center justify-center">
              <Activity className="w-6 h-6" />
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-12 gap-8 items-start">
        {/* Resumen Agrupado */}
        <div className="col-span-12 lg:col-span-5 bg-white p-10 rounded-[3rem] shadow-xl shadow-slate-200/40 border border-outline-variant/5 h-[800px] flex flex-col">
          <div className="mb-8">
            <h3 className="text-2xl font-black text-on-surface tracking-tight">Resumen por Tipo de Haber</h3>
            <p className="text-sm text-secondary font-bold mt-1">Impacto financiero por concepto</p>
          </div>
          <div className="flex-1 overflow-y-auto pr-4 space-y-6">
            {resumen.map((r, idx) => (
              <div key={r.nombre_haber} className="group cursor-pointer">
                <div className="flex justify-between items-end mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-black text-on-surface group-hover:text-primary transition-colors max-w-[200px] truncate" title={r.nombre_haber}>{r.nombre_haber}</span>
                    <span className="text-[10px] font-bold bg-surface-container px-2 py-0.5 rounded text-outline">{r.total_funcionarios} func.</span>
                  </div>
                  <span className="text-xs font-bold text-outline">${r.total_monto.toLocaleString('es-CL')}</span>
                </div>
                <div className="w-full h-4 bg-surface-container rounded-xl overflow-hidden relative">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(r.total_monto / maxHaberAmount) * 100}%` }}
                    className={cn(
                      "h-full transition-colors duration-500",
                      idx % 3 === 0 ? "bg-primary" : idx % 3 === 1 ? "bg-secondary" : "bg-primary-container"
                    )}
                  />
                </div>
              </div>
            ))}
            {resumen.length === 0 && (
              <div className="text-center py-20 text-outline">No hay datos para este período.</div>
            )}
          </div>
        </div>

        {/* Detalle por Funcionario */}
        <div className="col-span-12 lg:col-span-7 bg-white p-10 rounded-[3rem] shadow-xl shadow-slate-200/40 border border-outline-variant/5 h-[800px] flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-2xl font-black text-on-surface tracking-tight">Detalle Funcionarios</h3>
              <p className="text-sm text-secondary font-bold mt-1">Monto de haberes seleccionados</p>
            </div>
            <div className="relative w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
              <input 
                type="text" 
                placeholder="Buscar por Nombre o RUT..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-surface-container rounded-xl text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all border border-transparent focus:border-primary/30"
              />
            </div>
          </div>

          <div className="flex-1 overflow-x-auto overflow-y-auto">
            <table className="w-full text-left border-collapse min-w-max">
              <thead className="sticky top-0 bg-white z-10">
                <tr>
                  <th className="p-4 border-b border-outline-variant/10 text-[10px] font-black uppercase tracking-widest text-secondary">RUT</th>
                  <th className="p-4 border-b border-outline-variant/10 text-[10px] font-black uppercase tracking-widest text-secondary">Nombre Completo</th>
                  <th className="p-4 border-b border-outline-variant/10 text-[10px] font-black uppercase tracking-widest text-secondary text-right">Monto Total</th>
                  <th className="p-4 border-b border-outline-variant/10 text-[10px] font-black uppercase tracking-widest text-secondary">Desglose (Top 3)</th>
                </tr>
              </thead>
              <tbody>
                {filteredDetalle.map((f) => {
                  const sortedHaberes = Object.entries(f.haberes).sort((a, b) => b[1] - a[1]).slice(0, 3);
                  return (
                    <tr key={f.rut} className="hover:bg-surface-container/50 transition-colors border-b border-outline-variant/5">
                      <td className="p-4 text-xs font-bold text-outline whitespace-nowrap">{f.rut}</td>
                      <td className="p-4 text-sm font-black text-on-surface max-w-[200px] truncate" title={f.nombre}>{f.nombre}</td>
                      <td className="p-4 text-sm font-bold text-primary text-right">${f.total_haberes_seleccionados.toLocaleString('es-CL')}</td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          {sortedHaberes.map(([k, v]) => (
                            <span key={k} className="inline-block px-2 py-1 bg-surface-container rounded text-[10px] font-bold text-on-surface-variant whitespace-nowrap" title={k}>
                              {k.length > 20 ? k.substring(0, 20) + '...' : k}: ${v.toLocaleString('es-CL')}
                            </span>
                          ))}
                          {Object.keys(f.haberes).length > 3 && (
                            <span className="inline-block px-2 py-1 bg-primary/10 text-primary rounded text-[10px] font-black">
                              +{Object.keys(f.haberes).length - 3} más
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filteredDetalle.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-12 text-outline font-bold text-sm">No se encontraron resultados</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
