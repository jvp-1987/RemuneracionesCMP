'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Users, 
  Calculator, 
  Building2,
  Calendar,
  Download,
  Filter,
  DollarSign,
  Activity
} from 'lucide-react';

interface HRStats {
  headcount: number;
  by_category: { name: string; value: number }[];
  by_profesion: { name: string; value: number }[];
  by_contrato?: { name: string; value: number }[];
  periodo?: { mes: number; anio: number };
}

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

interface FinancialStats {
  total_haberes: number;
  total_descuentos: number;
  total_liquido: number;
  distribucion_gasto: { name: string; value: number }[];
}

interface CentroStat {
  id: number;
  nombre: string;
  headcount: number;
  costo_total: number;
}

interface HaberResumen {
  nombre_haber: string;
  total_funcionarios: number;
  total_monto: number;
}
interface HaberDetalleFuncionario {
  rut: string;
  nombre: string;
  establecimiento: string;
  haberes: Record<string, number>;
  total_haberes_seleccionados: number;
}

export default function ReportesPage() {
  const [hrStats, setHrStats] = useState<HRStats | null>(null);
  const [financialStats, setFinancialStats] = useState<FinancialStats | null>(null);
  const [centros, setCentros] = useState<CentroStat[]>([]);
  
  const [haberesResumen, setHaberesResumen] = useState<HaberResumen[]>([]);
  const [haberesDetalle, setHaberesDetalle] = useState<HaberDetalleFuncionario[]>([]);
  const [selectedHaber, setSelectedHaber] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  
  const [availablePeriods, setAvailablePeriods] = useState<{ id: number; mes: number; anio: number }[]>([]);
  const [selectedPeriods, setSelectedPeriods] = useState<number[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

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
        const [hrRes, finRes, centrosRes, habRes] = await Promise.all([
          axios.get(`${apiUrl}/reportes/hr-stats`, { params }),
          axios.get(`${apiUrl}/reportes/financial-stats`, { params }),
          axios.get(`${apiUrl}/reportes/centros-stats`, { params }),
          axios.get(`${apiUrl}/reportes/haberes-stats`, { params })
        ]);
        setHrStats(hrRes.data);
        setFinancialStats(finRes.data);
        setCentros(centrosRes.data);
        setHaberesResumen(habRes.data.resumen);
        setHaberesDetalle(habRes.data.detalle);
        setSelectedHaber(null);
      } catch (err: any) {
        console.error('Error fetching report stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedPeriods, availablePeriods]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-surface p-12 items-center justify-center">
        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="mt-8 font-black uppercase tracking-[0.3em] text-outline text-xs animate-pulse">Analizando Maestro de Remuneraciones...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-surface p-12 pb-32">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-8 relative z-50">
        <div>
          <h2 className="text-[3.5rem] font-black leading-none tracking-tight text-primary font-headline mb-4">
            Gestión de Personas
          </h2>
          <div className="flex items-center gap-3">
            <span className="bg-primary/10 text-primary text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-primary/20">
              Maestro de Remuneraciones
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
          <button className="p-3 bg-white border border-outline-variant/10 rounded-xl text-secondary hover:text-primary transition-all">
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Stats Bento Grid */}
      <div className="grid grid-cols-12 gap-8 mb-12">
        {/* Metric 1: Headcount (HR) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="col-span-12 md:col-span-4 bg-white p-8 rounded-[2.5rem] border border-outline-variant/10 shadow-sm flex flex-col justify-between"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary mb-2">Dotación Activa (Headcount)</p>
              <h3 className="text-5xl font-black text-on-surface tracking-tighter">
                {(hrStats?.headcount || 0).toLocaleString('es-CL')}
              </h3>
            </div>
            <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
          </div>
          <div className="mt-8 space-y-3">
            <p className="text-[10px] font-black text-outline uppercase tracking-wider mb-2">Distribución por Profesión (Top 3)</p>
            {(hrStats?.by_profesion || []).slice(0, 3).map((prof, i) => (
              <div key={i} className="flex justify-between items-center text-xs font-bold text-on-surface-variant">
                <span>{prof.name}</span>
                <span className="text-primary">{prof.value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Metric 2: Financial Impact (Costo Nómina) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="col-span-12 md:col-span-4 bg-primary text-on-primary p-8 rounded-[2.5rem] shadow-xl shadow-primary/20 flex flex-col justify-between relative overflow-hidden group"
        >
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-2">Costo Total Nómina (Haberes)</p>
              <h3 className="text-5xl font-black tracking-tighter">
                ${(financialStats?.total_haberes || 0).toLocaleString('es-CL')}
              </h3>
            </div>
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
              <Calculator className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="relative z-10 mt-8 flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-[11px] font-black bg-white/20 px-3 py-1.5 rounded-full">
              <TrendingUp className="w-3 h-3" /> Impacto Real
            </span>
            <p className="text-[10px] font-bold opacity-60">Basado en el Maestro</p>
          </div>
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-white/5 rounded-full blur-[80px] group-hover:scale-125 transition-transform duration-1000" />
        </motion.div>

        {/* Metric 3: Total Líquido */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="col-span-12 md:col-span-4 bg-white p-8 rounded-[2.5rem] border border-outline-variant/10 shadow-sm flex flex-col justify-between"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary mb-2">Total Líquido a Pago</p>
              <h3 className="text-5xl font-black text-on-surface tracking-tighter">
                ${(financialStats?.total_liquido || 0).toLocaleString('es-CL')}
              </h3>
            </div>
            <div className="w-12 h-12 bg-success/10 rounded-2xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-success" />
            </div>
          </div>
          <div className="mt-8">
            <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${((financialStats?.total_liquido || 0) / (financialStats?.total_haberes || 1)) * 100}%` }}
                className="h-full bg-success"
              />
            </div>
            <div className="flex justify-between mt-3 text-[10px] font-black text-outline uppercase tracking-wider">
              <span>Relación Liquido/Bruto</span>
              <span>{(((financialStats?.total_liquido || 0) / (financialStats?.total_haberes || 1)) * 100).toFixed(1)}%</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-12 gap-8 items-start">
        
        {/* Expenditure Bar Chart */}
        <div className="col-span-12 lg:col-span-8 bg-white p-10 rounded-[3rem] shadow-xl shadow-slate-200/40 border border-outline-variant/5">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h3 className="text-2xl font-black text-on-surface mb-2 tracking-tight flex items-center gap-3">
                <BarChart3 className="w-6 h-6 text-primary" />
                Costo Financiero por Establecimiento
              </h3>
              <p className="text-sm text-secondary font-bold">Distribución de dotación (Headcount) y gasto total bruto</p>
            </div>
          </div>

          <div className="space-y-6">
            {centros.map((centro, idx) => (
              <div key={centro.id} className="group cursor-pointer">
                <div className="flex justify-between items-end mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-black text-on-surface group-hover:text-primary transition-colors">{centro.nombre}</span>
                    <span className="text-[10px] font-bold bg-surface-container px-2 py-0.5 rounded text-outline">{centro.headcount} func.</span>
                  </div>
                  <span className="text-xs font-bold text-outline">${centro.costo_total.toLocaleString('es-CL')}</span>
                </div>
                <div className="w-full h-8 bg-surface-container rounded-xl overflow-hidden relative">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(centro.costo_total / (financialStats?.total_haberes || 1)) * 100}%` }}
                    className={cn(
                      "h-full transition-colors duration-500",
                      idx % 2 === 0 ? "bg-primary/80 group-hover:bg-primary" : "bg-secondary/70 group-hover:bg-secondary"
                    )}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category Donut Chart */}
        <div className="col-span-12 lg:col-span-4 bg-surface-container-low p-10 rounded-[3rem] border border-outline-variant/10">
          <h3 className="text-2xl font-black text-on-surface mb-8 tracking-tight flex items-center gap-3">
            <PieChart className="w-6 h-6 text-secondary" />
            Distribución del Gasto
          </h3>
          
          <div className="relative w-full aspect-square flex items-center justify-center mb-8">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              {(financialStats?.distribucion_gasto || []).map((item, idx) => {
                const total = financialStats?.total_haberes || 1;
                const percentage = (item.value / total) * 100;
                let offset = 0;
                for (let i = 0; i < idx; i++) {
                  offset += ((financialStats?.distribucion_gasto[i].value || 0) / total) * 100;
                }
                return (
                  <motion.circle
                    key={item.name}
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke={idx === 0 ? '#005a61' : idx === 1 ? '#2d3e46' : idx === 2 ? '#007b83' : '#adb9ba'}
                    strokeWidth="12"
                    strokeDasharray={`${percentage} 100`}
                    strokeDashoffset={-offset}
                    initial={{ strokeDasharray: "0 100" }}
                    animate={{ strokeDasharray: `${percentage} 100` }}
                    transition={{ delay: 0.5 + idx * 0.1, duration: 1 }}
                    className="hover:stroke-opacity-100 stroke-opacity-80 transition-all cursor-pointer"
                  />
                );
              })}
              <circle cx="50" cy="50" r="30" fill="white" />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-[10px] font-black text-outline uppercase tracking-widest">Gasto Dominante</span>
              <span className="text-lg font-black text-primary">
                {financialStats?.distribucion_gasto && financialStats.distribucion_gasto[0] ? `${((financialStats.distribucion_gasto[0].value / (financialStats.total_haberes || 1)) * 100).toFixed(1)}%` : '0%'}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {(financialStats?.distribucion_gasto || []).map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-3 h-3 rounded-full",
                    idx === 0 ? "bg-primary" : idx === 1 ? "bg-secondary" : idx === 2 ? "bg-primary-container" : "bg-outline-variant"
                  )} />
                  <span className="text-xs font-bold text-on-surface-variant group-hover:text-primary transition-colors">{item.name}</span>
                </div>
                <span className="text-xs font-black text-on-surface">
                  {((item.value / (financialStats?.total_haberes || 1)) * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tipos de Contrato Proportion Bar */}
      <div className="bg-white p-10 rounded-[3rem] shadow-xl shadow-slate-200/40 border border-outline-variant/5 mb-12">
        <div className="mb-8">
          <h3 className="text-2xl font-black text-on-surface tracking-tight flex items-center gap-3">
            <Users className="w-6 h-6 text-primary" />
            Tipos de Contrato (Dotación)
          </h3>
          <p className="text-sm text-secondary font-bold mt-2">Proporción de modalidades contractuales del personal</p>
        </div>
        
        <div className="w-full h-8 flex rounded-xl overflow-hidden mb-8">
          {hrStats?.by_contrato?.map((item, idx) => {
            const total = hrStats.headcount || 1;
            const percentage = (item.value / total) * 100;
            const colors = ['bg-primary', 'bg-secondary', 'bg-primary-container', 'bg-emerald-500', 'bg-amber-500'];
            return (
              <motion.div 
                key={item.name} 
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                className={cn("h-full transition-colors hover:brightness-110", colors[idx % colors.length])}
                title={`${item.name}: ${item.value}`}
              />
            );
          })}
        </div>



        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {hrStats?.by_contrato?.map((item, idx) => {
            const total = hrStats.headcount || 1;
            const percentage = (item.value / total) * 100;
            const colors = ['bg-primary', 'bg-secondary', 'bg-primary-container', 'bg-emerald-500', 'bg-amber-500'];
            return (
              <div key={item.name} className="flex items-start gap-3">
                <div className={cn("w-3 h-3 rounded-full mt-1 shrink-0", colors[idx % colors.length])} />
                <div>
                  <span className="block text-[10px] font-black text-outline uppercase tracking-wider">{item.name}</span>
                  <div className="flex items-end gap-2 mt-1">
                    <span className="text-2xl font-black text-on-surface leading-none">{item.value}</span>
                    <span className="text-xs font-bold text-outline mb-0.5">{percentage.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Resumen por Tipo de Haber */}
      <div className="bg-white p-10 rounded-[3rem] shadow-xl shadow-slate-200/40 border border-outline-variant/5 mb-12">
        <h3 className="text-2xl font-black text-on-surface tracking-tight flex items-center gap-3 mb-6">
          <DollarSign className="w-6 h-6 text-primary" />
          Desglose por Tipo de Haber
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
            {haberesResumen.map(h => (
              <div 
                key={h.nombre_haber} 
                onClick={() => setSelectedHaber(h.nombre_haber)}
                className={cn(
                  "p-5 rounded-2xl cursor-pointer transition-all border",
                  selectedHaber === h.nombre_haber 
                    ? "border-primary bg-primary/5 shadow-md" 
                    : "border-outline-variant/20 hover:border-primary/50 hover:bg-surface-container"
                )}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black uppercase text-on-surface">{h.nombre_haber}</span>
                    <span className="text-[10px] bg-surface-container px-2 py-0.5 rounded text-outline font-bold">
                      {h.total_funcionarios} func.
                    </span>
                  </div>
                  <span className="text-sm font-black text-primary">
                    ${(h.total_monto || 0).toLocaleString('es-CL')}
                  </span>
                </div>
                <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${((h.total_monto || 0) / (haberesResumen[0]?.total_monto || 1)) * 100}%` }}
                    className="h-full bg-primary"
                  />
                </div>
              </div>
            ))}
            {haberesResumen.length === 0 && (
              <p className="text-xs text-outline text-center p-4">No hay datos de haberes para este período.</p>
            )}
          </div>

          <div className="bg-surface-container-low p-8 rounded-[2rem] border border-outline-variant/10 min-h-[400px]">
            {selectedHaber ? (
              <>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h4 className="text-lg font-black text-on-surface uppercase tracking-tight">{selectedHaber}</h4>
                    <p className="text-[10px] text-secondary font-bold uppercase tracking-widest mt-1">
                      {haberesResumen.find(h => h.nombre_haber === selectedHaber)?.total_funcionarios} Funcionarios
                    </p>
                  </div>
                </div>
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {haberesDetalle
                    .filter(d => d.haberes[selectedHaber])
                    .sort((a, b) => b.haberes[selectedHaber] - a.haberes[selectedHaber])
                    .map(d => (
                    <div key={d.rut} className="flex justify-between items-center p-4 bg-white rounded-xl border border-outline-variant/10 hover:border-primary/30 transition-colors">
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-xs font-black text-on-surface truncate">{d.nombre}</span>
                          <span className="text-[10px] text-outline font-mono bg-surface-container px-2 py-0.5 rounded shrink-0">{d.rut}</span>
                        </div>
                        <span className="text-[10px] font-bold text-secondary uppercase flex items-center gap-1 truncate">
                          <Building2 className="w-3 h-3 shrink-0" /> {d.establecimiento}
                        </span>
                      </div>
                      <span className="text-sm font-black text-primary shrink-0">
                        ${d.haberes[selectedHaber].toLocaleString('es-CL')}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-outline opacity-60 min-h-[400px]">
                <Activity className="w-12 h-12 mb-4" />
                <p className="text-xs font-bold uppercase tracking-widest text-center">Selecciona un concepto<br/>en la lista izquierda<br/>para ver los funcionarios</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Footer Meta */}
      <footer className="fixed bottom-0 right-0 left-72 bg-white/80 backdrop-blur-xl px-12 py-4 border-t border-outline-variant/10 z-50 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-[10px] font-black text-primary uppercase tracking-widest">Sincronizado con Maestro Remuneraciones</span>
          </div>
          <div className="h-4 w-[1px] bg-outline-variant" />
          <span className="text-[10px] font-black text-outline uppercase tracking-widest italic">Confidencial - Jefaturas RRHH</span>
        </div>
      </footer>
    </div>
  );
}
