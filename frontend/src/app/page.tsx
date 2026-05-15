'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { 
  Clock, Car, AlertTriangle, Stethoscope, TrendingUp,
  TrendingDown, Building2, RefreshCcw, ChevronRight,
  Activity, ArrowUpRight, BarChart3, Users, Wallet,
  MinusCircle, DollarSign, FileText, Info, Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';

const formatCLP = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

interface KpiData {
  periodo: { id: number; mes: number; anio: number; estado: string } | null;
  fuente: string;
  kpis: {
    total_sueldo_base: number;
    total_haberes: number;
    total_descuentos: number;
    total_liquido: number;
    cantidad_funcionarios: number;
    total_he: number;
    cantidad_he_25: number;
    cantidad_he_50: number;
    total_viaticos: number;
    total_atrasos_descuento: number;
    minutos_atraso_total: number;
    // legacy
    total_turnos: number;
  };
  por_centro: { nombre: string; gasto_total: number }[];
  ultimos_consolidados: any[];
}

function KpiCard({ 
  label, value, sub, icon: Icon, color, delay = 0, trend, badge
}: { 
  label: string; value: string; sub: string; icon: any; 
  color: string; delay?: number; trend?: 'up' | 'down' | null; badge?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.6, type: 'spring', bounce: 0.4 }}
      className="bg-white/80 backdrop-blur-2xl rounded-[2rem] p-6 border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:border-primary/20 transition-all duration-500 group hover:-translate-y-1 cursor-default relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="flex justify-between items-start mb-4 relative z-10">
        <span className="text-[9px] font-black uppercase tracking-[0.25em] text-secondary/70">{label}</span>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color} shadow-inner transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="text-3xl font-black text-slate-800 tracking-tighter mb-1 relative z-10">{value}</div>
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 relative z-10">
        <p className="text-[10px] text-slate-500 font-bold">{sub}</p>
        {trend && (
          <span className={`flex items-center gap-1 text-[9px] font-black rounded-full px-2.5 py-1 shadow-sm ${
            trend === 'up' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
          }`}>
            {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend === 'up' ? 'Activo' : 'Descuento'}
          </span>
        )}
        {badge && (
          <span className="text-[9px] font-black rounded-full px-2.5 py-1 bg-slate-50 text-slate-500 border border-slate-100">{badge}</span>
        )}
      </div>
    </motion.div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<KpiData | null>(null);
  const [periods, setPeriods] = useState<any[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [activeSource, setActiveSource] = useState<'hybrid' | 'maestro_remuneraciones' | 'novedades_en_proceso'>('hybrid');
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchPeriods = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api-remuneracion.apscolab.com';
      const res = await axios.get(`${apiUrl}/periodos`);
      setPeriods(res.data);
    } catch (err) {
      console.error('Error fetching periods:', err);
    }
  };

  const fetchData = async (periodId?: string, source?: string) => {
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api-remuneracion.apscolab.com';
      let url = `${apiUrl}/consolidados/dashboard`;
      const params = new URLSearchParams();
      if (periodId) params.append('periodoId', periodId);
      if (source && source !== 'hybrid') params.append('fuente', source);
      
      if (params.toString()) url += `?${params.toString()}`;
      
      const res = await axios.get(url);
      setData(res.data);
      if (res.data.periodo && !selectedPeriodId) {
        setSelectedPeriodId(String(res.data.periodo.id));
      }
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Error fetching dashboard KPIs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchPeriods();
    fetchData(); 
  }, []);

  const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedPeriodId(id);
    fetchData(id, activeSource);
  };

  const handleSourceChange = (source: 'hybrid' | 'maestro_remuneraciones' | 'novedades_en_proceso') => {
    setActiveSource(source);
    fetchData(selectedPeriodId, source);
  };

  const totalLiquido = data?.kpis.total_liquido ?? 0;
  const totalHaberes = data?.kpis.total_haberes ?? 0;
  const totalDescuentos = data?.kpis.total_descuentos ?? 0;
  const totalGastoCentros = data?.por_centro.reduce((acc, c) => acc + c.gasto_total, 0) || 1;

  const periodoLabel = data?.periodo
    ? `${MESES[(data.periodo.mes ?? 1) - 1]} ${data.periodo.anio}`
    : 'Sin período';

  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc] font-body overflow-x-hidden pb-28">

      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl flex justify-between items-center w-full px-12 py-4 border-b border-white/50 shadow-sm">
        <div className="flex items-center gap-8">
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight font-headline uppercase">
              Remuneraciones <span className="text-primary">CMP</span>
            </h2>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">
              Panel Financiero • Maestro • {lastRefresh.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          <div className="h-8 w-[1px] bg-slate-200" />

          {/* Period Selector */}
          <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm hover:border-primary/30 transition-all group">
            <Calendar className="w-4 h-4 text-slate-400 group-hover:text-primary transition-colors" />
            <select 
              value={selectedPeriodId}
              onChange={handlePeriodChange}
              className="bg-transparent text-[11px] font-black uppercase tracking-widest text-slate-700 outline-none cursor-pointer pr-4"
            >
              <option value="">Cargando período...</option>
              {periods.map(p => (
                <option key={p.id} value={p.id}>
                  {MESES[p.mes - 1]} {p.anio}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1">
            <button 
              onClick={() => handleSourceChange('hybrid')}
              className={cn(
                "px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all",
                activeSource === 'hybrid' ? "bg-white text-primary shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              Híbrido
            </button>
            <button 
              onClick={() => handleSourceChange('maestro_remuneraciones')}
              className={cn(
                "px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all",
                activeSource === 'maestro_remuneraciones' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              Maestro
            </button>
            <button 
              onClick={() => handleSourceChange('novedades_en_proceso')}
              className={cn(
                "px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all",
                activeSource === 'novedades_en_proceso' ? "bg-white text-amber-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              Novedades
            </button>
          </div>

          <div className="h-8 w-[1px] bg-slate-200 mx-2" />

          <button
            onClick={() => fetchData(selectedPeriodId, activeSource)}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-primary hover:shadow-md hover:-translate-y-0.5 transition-all border border-slate-100"
          >
            <RefreshCcw className={`w-3 h-3 ${loading ? 'animate-spin text-primary' : ''}`} />
            Actualizar
          </button>
          <Link href="/ingreso" className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-0.5 transition-all">
            <Activity className="w-3 h-3" />
            Ingresar Novedades
          </Link>
        </div>
      </header>

      <section className="px-12 py-10 space-y-10">

        {/* Fuente de datos — banner informativo */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "flex items-center gap-3 px-5 py-3 rounded-2xl text-xs font-bold border",
            data?.fuente === 'novedades_en_proceso' 
              ? "bg-amber-50 border-amber-100 text-amber-700" 
              : "bg-indigo-50 border-indigo-100 text-indigo-700"
          )}
        >
          <Info className="w-4 h-4 flex-shrink-0" />
          <span>
            {data?.fuente === 'novedades_en_proceso' ? (
              <>Mostrando <strong>Novedades en Proceso</strong> ({periodoLabel}). Estos datos corresponden a lo ingresado por los Centros de Salud en el mes vigente.</>
            ) : (
              <>Los datos financieros provienen del <strong>Maestro de Remuneraciones</strong> ({periodoLabel}). El módulo de Novedades es de uso administrativo previo al proceso de pago.</>
            )}
          </span>
        </motion.div>

        {/* Hero — Masa Salarial Total */}
        <motion.div 
          initial={{ opacity: 0, y: -20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative bg-slate-900 rounded-[2.5rem] p-10 overflow-hidden shadow-2xl shadow-slate-900/20"
        >
          <motion.div 
            animate={{ backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage: 'radial-gradient(circle at center, rgba(56, 189, 248, 0.4) 0%, rgba(59, 130, 246, 0.1) 40%, transparent 70%)',
              backgroundSize: '200% 200%'
            }}
          />
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/20 rounded-full -translate-y-1/2 translate-x-1/3 blur-[100px] mix-blend-screen" />
          <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-indigo-500/20 rounded-full translate-y-1/2 blur-[80px] mix-blend-screen" />

          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-10">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 mb-5">
                  <span className={cn(
                    "w-2 h-2 rounded-full animate-pulse",
                    data?.fuente === 'novedades_en_proceso' ? "bg-amber-400" : "bg-emerald-400"
                  )} />
                  <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/90">
                    {data?.fuente === 'novedades_en_proceso' ? 'Masa Salarial Estimada · Novedades en Proceso' : 'Masa Salarial Líquida · Maestro de Remuneraciones'}
                  </span>
              </div>
              <div className="text-6xl font-black text-white tracking-tighter mb-3 drop-shadow-sm">
                {loading ? '—' : formatCLP(totalLiquido)}
              </div>
              <p className="text-white/60 text-xs font-bold tracking-wide uppercase">
                {loading ? '' : `${data?.kpis.cantidad_funcionarios ?? 0} funcionarios · Haberes: ${formatCLP(totalHaberes)} · Desc.: ${formatCLP(totalDescuentos)}`}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 min-w-[320px]">
              {[
                { l: 'Sueldo Base', v: data?.kpis.total_sueldo_base ?? 0 },
                { l: 'Total Haberes', v: data?.kpis.total_haberes ?? 0 },
                { l: 'HE Pagadas', v: data?.kpis.total_he ?? 0 },
                { l: 'Total Descuentos', v: data?.kpis.total_descuentos ?? 0, neg: true },
              ].map((item, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + (i * 0.1) }}
                  key={item.l} 
                  className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-xl hover:bg-white/10 transition-colors"
                >
                  <p className="text-white/50 text-[9px] font-black uppercase tracking-widest mb-1.5">{item.l}</p>
                  <p className={`text-lg font-black ${item.neg ? 'text-rose-400' : 'text-white'} tracking-tighter`}>
                    {loading ? '—' : formatCLP(item.v)}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* KPI Grid — datos del Maestro */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          <KpiCard
            label="Horas Extras 25%"
            value={loading ? '—' : `${(data?.kpis.cantidad_he_25 ?? 0).toFixed(1)} hrs`}
            sub={`Pagado: ${formatCLP(data?.kpis.total_he ?? 0)}`}
            icon={Clock}
            color="bg-blue-50 text-blue-600"
            delay={0.05}
            trend="up"
          />
          <KpiCard
            label="Horas Extras 50%"
            value={loading ? '—' : `${(data?.kpis.cantidad_he_50 ?? 0).toFixed(1)} hrs`}
            sub="Recargo mayor sobre base"
            icon={Activity}
            color="bg-violet-50 text-violet-600"
            delay={0.1}
            trend="up"
          />
          <KpiCard
            label="Viáticos"
            value={loading ? '—' : formatCLP(data?.kpis.total_viaticos ?? 0)}
            sub="Monto real según maestro"
            icon={Car}
            color="bg-amber-50 text-amber-600"
            delay={0.15}
          />
          <KpiCard
            label="Funcionarios Activos"
            value={loading ? '—' : `${data?.kpis.cantidad_funcionarios ?? 0}`}
            sub={`Periodo: ${periodoLabel}`}
            icon={Users}
            color="bg-emerald-50 text-emerald-600"
            delay={0.2}
            badge={data?.fuente === 'novedades_en_proceso' ? 'Novedades' : 'Maestro'}
          />
        </div>

        {/* Segundo bloque */}
        <div className="grid grid-cols-12 gap-8">

          {/* Gasto por Centro de Salud */}
          <div className="col-span-12 lg:col-span-7 bg-white rounded-[2rem] p-8 border border-outline-variant/10 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-lg font-black text-on-surface tracking-tight">Masa Salarial por Centro de Salud</h3>
                <p className="text-[10px] text-secondary font-bold mt-0.5">Monto líquido total desde el Maestro de Remuneraciones</p>
              </div>
              <BarChart3 className="w-5 h-5 text-outline/40" />
            </div>
            <div className="space-y-4">
              {loading ? (
                [1,2,3].map(i => (
                  <div key={i} className="animate-pulse space-y-2">
                    <div className="h-3 bg-surface-container rounded-full w-1/3" />
                    <div className="h-7 bg-surface-container rounded-xl" />
                  </div>
                ))
              ) : data?.por_centro.length === 0 ? (
                <p className="text-center text-outline font-bold italic py-12 text-xs">Sin liquidaciones importadas. Cargue el Maestro de Remuneraciones para ver datos.</p>
              ) : (
                data?.por_centro.map((c, i) => {
                  const pct = totalGastoCentros > 0 ? (c.gasto_total / totalGastoCentros) * 100 : 0;
                  return (
                    <div key={c.nombre}>
                      <div className="flex justify-between items-baseline mb-1.5">
                        <span className="text-xs font-black text-on-surface uppercase tracking-wider">{c.nombre}</span>
                        <span className="text-sm font-black text-primary tracking-tighter">{formatCLP(c.gasto_total)}</span>
                      </div>
                      <div className="w-full h-8 bg-surface-container-low rounded-xl overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ delay: 0.3 + i * 0.1, duration: 0.8, ease: 'easeOut' }}
                          className={`h-full rounded-xl flex items-center px-3 ${
                            i === 0 ? 'bg-primary' : i === 1 ? 'bg-blue-400' : 'bg-sky-300'
                          }`}
                        >
                          {pct > 8 && (
                            <span className="text-white text-[9px] font-black tracking-wider">{pct.toFixed(0)}%</span>
                          )}
                        </motion.div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Panel derecho */}
          <div className="col-span-12 lg:col-span-5 flex flex-col gap-5">

            {/* Descuentos */}
            <div className="bg-rose-50 border border-rose-100 rounded-[1.5rem] p-6 flex items-center gap-5">
              <div className="w-12 h-12 rounded-2xl bg-error/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-error" />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-error/70 mb-0.5">Total Descuentos (Maestro)</p>
                <p className="text-2xl font-black text-error tracking-tighter">
                  {loading ? '—' : formatCLP(data?.kpis.total_descuentos ?? 0)}
                </p>
                <p className="text-[10px] font-bold text-error/60 mt-0.5">
                  Incl. atrasos: {formatCLP(data?.kpis.total_atrasos_descuento ?? 0)}
                </p>
              </div>
            </div>

            {/* Últimos consolidados */}
            <div className="bg-white rounded-[1.5rem] p-6 border border-outline-variant/10 shadow-sm flex-1">
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h3 className="text-sm font-black text-on-surface tracking-tight">Consolidados Recientes</h3>
                  <p className="text-[9px] text-slate-400 font-bold mt-0.5">Proceso de validación de novedades</p>
                </div>
                <Link href="/consolidados" className="text-[9px] font-black text-primary uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all">
                  Ver todos <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="space-y-2">
                {loading ? (
                  [1,2,3].map(i => (
                    <div key={i} className="animate-pulse flex items-center gap-3 p-3 rounded-xl">
                      <div className="w-7 h-7 bg-surface-container rounded-lg" />
                      <div className="flex-1 space-y-1">
                        <div className="h-2.5 bg-surface-container rounded-full w-2/3" />
                        <div className="h-2 bg-surface-container rounded-full w-1/3" />
                      </div>
                    </div>
                  ))
                ) : data?.ultimos_consolidados.length === 0 ? (
                  <p className="text-center text-outline font-bold italic py-6 text-xs">Sin consolidados aún</p>
                ) : (
                  data?.ultimos_consolidados.map((c) => (
                    <Link
                      key={c.id}
                      href={`/consolidados/${c.id}`}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-primary/5 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-surface-container-low flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                          <FileText className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-on-surface group-hover:text-primary transition-colors">
                            {c.centro_salud?.nombre}
                          </p>
                          <p className="text-[9px] text-outline font-bold">
                            {c.periodo ? `${MESES[c.periodo.mes - 1]} ${c.periodo.anio}` : '—'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${
                          c.estado_actual_enum === 'Cerrado' 
                            ? 'bg-emerald-50 text-emerald-700' 
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          {c.estado_actual_enum}
                        </span>
                        <ChevronRight className="w-3 h-3 text-outline/40 group-hover:text-primary transition-colors" />
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="fixed bottom-0 right-0 left-64 bg-white/90 backdrop-blur-sm px-12 py-3 border-t border-outline-variant/10 z-40 flex justify-between items-center">
        <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">
          Corporación Municipal Panguipulli • Salud APS
        </span>
        <div className="flex gap-6">
          <Link href="/consolidados" className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest hover:text-primary transition-colors">Consolidados</Link>
          <Link href="/funcionarios" className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest hover:text-primary transition-colors">Funcionarios</Link>
          <Link href="/ingreso" className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest hover:text-primary transition-colors">Ingresar Novedades</Link>
        </div>
      </footer>
    </div>
  );
}
