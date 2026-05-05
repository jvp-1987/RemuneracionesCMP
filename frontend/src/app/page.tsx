'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { 
  Clock, Car, AlertTriangle, Stethoscope, TrendingUp,
  TrendingDown, Building2, RefreshCcw, ChevronRight,
  Activity, ArrowUpRight, BarChart3
} from 'lucide-react';

const formatCLP = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

interface KpiData {
  kpis: {
    total_he: number;
    total_turnos: number;
    total_viaticos: number;
    total_atrasos_descuento: number;
    cantidad_he_25: number;
    cantidad_he_50: number;
    cantidad_turnos_habiles: number;
    cantidad_turnos_inhabiles: number;
    cantidad_viaticos: number;
    cantidad_atrasos: number;
  };
  por_centro: { nombre: string; gasto_total: number }[];
  ultimos_consolidados: any[];
}

function KpiCard({ 
  label, value, sub, icon: Icon, color, delay = 0, trend 
}: { 
  label: string; value: string; sub: string; icon: any; 
  color: string; delay?: number; trend?: 'up' | 'down' | null;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.6, type: 'spring', bounce: 0.4 }}
      className="bg-white/80 backdrop-blur-2xl rounded-[2.5rem] p-8 border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:border-primary/20 transition-all duration-500 group hover:-translate-y-2 cursor-default relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-white/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="flex justify-between items-start mb-6 relative z-10">
        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-secondary/70">{label}</span>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color} shadow-inner transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <div className="text-4xl font-black text-slate-800 tracking-tighter mb-2 relative z-10">{value}</div>
      <div className="flex items-center justify-between mt-6 pt-5 border-t border-slate-100 relative z-10">
        <p className="text-[11px] text-slate-500 font-bold">{sub}</p>
        {trend && (
          <span className={`flex items-center gap-1.5 text-[10px] font-black rounded-full px-3 py-1.5 shadow-sm ${
            trend === 'up' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
          }`}>
            {trend === 'up' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {trend === 'up' ? 'Óptimo' : 'Revisar'}
          </span>
        )}
      </div>
    </motion.div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/consolidados/dashboard`);
      setData(res.data);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Error fetching dashboard KPIs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const gasto_total = data 
    ? data.kpis.total_he + data.kpis.total_turnos + data.kpis.total_viaticos 
    : 0;
  const max_centro = data?.por_centro[0]?.gasto_total ?? 1;

  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc] font-body overflow-x-hidden pb-28">

      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl flex justify-between items-center w-full px-12 py-5 border-b border-white/50 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight font-headline uppercase">
            Remuneraciones <span className="text-primary">CMP</span>
          </h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
            Panel Financiero • Actualizado {lastRefresh.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-5 py-2.5 bg-white rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary hover:shadow-md hover:-translate-y-0.5 transition-all border border-slate-100"
          >
            <RefreshCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-primary' : ''}`} />
            Actualizar
          </button>
          <Link href="/ingreso" className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-0.5 transition-all">
            <Activity className="w-3.5 h-3.5" />
            Ingresar Novedades
          </Link>
        </div>
      </header>

      <section className="px-12 py-12 space-y-12">

        {/* Hero total */}
        <motion.div 
          initial={{ opacity: 0, y: -20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative bg-slate-900 rounded-[3rem] p-12 overflow-hidden shadow-2xl shadow-slate-900/20"
        >
          {/* Animated Background Gradients */}
          <motion.div 
            animate={{ 
              backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage: 'radial-gradient(circle at center, rgba(56, 189, 248, 0.4) 0%, rgba(59, 130, 246, 0.1) 40%, transparent 70%)',
              backgroundSize: '200% 200%'
            }}
          />
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full -translate-y-1/2 translate-x-1/3 blur-[100px] mix-blend-screen" />
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full translate-y-1/2 blur-[80px] mix-blend-screen" />

          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-12">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 mb-6">
                 <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                 <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/90">Gasto Remuneracional Activo</span>
              </div>
              <div className="text-7xl font-black text-white tracking-tighter mb-4 drop-shadow-sm">
                {loading ? '—' : formatCLP(gasto_total)}
              </div>
              <p className="text-white/60 text-xs font-bold tracking-wide uppercase">Consolidado Mensual: H.E. + Programas + Viáticos</p>
            </div>
            <div className="grid grid-cols-2 gap-4 min-w-[360px]">
              {[
                { l: 'H.E. Presup.', v: data?.kpis.total_he ?? 0 },
                { l: 'Prog. Turno', v: data?.kpis.total_turnos ?? 0 },
                { l: 'Viáticos', v: data?.kpis.total_viaticos ?? 0 },
                { l: 'Desc. Atrasos', v: data?.kpis.total_atrasos_descuento ?? 0, neg: true },
              ].map((item, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + (i * 0.1) }}
                  key={item.l} 
                  className="bg-white/5 border border-white/10 rounded-3xl p-5 backdrop-blur-xl hover:bg-white/10 transition-colors"
                >
                  <p className="text-white/50 text-[9px] font-black uppercase tracking-widest mb-2">{item.l}</p>
                  <p className={`text-xl font-black ${item.neg ? 'text-rose-400' : 'text-white'} tracking-tighter`}>
                    {loading ? '—' : formatCLP(item.v)}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          <KpiCard
            label="Horas Extras 25%"
            value={loading ? '—' : `${data?.kpis.cantidad_he_25 ?? 0} hrs`}
            sub={`Total: ${formatCLP(data?.kpis.total_he ?? 0)}`}
            icon={Clock}
            color="bg-blue-50 text-blue-600"
            delay={0.05}
            trend="up"
          />
          <KpiCard
            label="Horas Extras 50%"
            value={loading ? '—' : `${data?.kpis.cantidad_he_50 ?? 0} hrs`}
            sub="Recargo mayor sobre base"
            icon={Activity}
            color="bg-violet-50 text-violet-600"
            delay={0.1}
          />
          <KpiCard
            label="Turnos Hábiles"
            value={loading ? '—' : `${data?.kpis.cantidad_turnos_habiles ?? 0}`}
            sub={`Inhábiles: ${data?.kpis.cantidad_turnos_inhabiles ?? 0} • Total: ${formatCLP(data?.kpis.total_turnos ?? 0)}`}
            icon={Stethoscope}
            color="bg-emerald-50 text-emerald-600"
            delay={0.15}
            trend="up"
          />
          <KpiCard
            label="Viáticos Pagados"
            value={loading ? '—' : `${data?.kpis.cantidad_viaticos ?? 0}`}
            sub={`Monto: ${formatCLP(data?.kpis.total_viaticos ?? 0)}`}
            icon={Car}
            color="bg-amber-50 text-amber-600"
            delay={0.2}
          />
        </div>

        {/* Segundo bloque: Barra por centro + Últimos consolidados */}
        <div className="grid grid-cols-12 gap-8">

          {/* Gasto por Centro de Salud */}
          <div className="col-span-12 lg:col-span-7 bg-white rounded-[2.5rem] p-10 border border-outline-variant/10 shadow-sm">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h3 className="text-xl font-black text-on-surface tracking-tight">Gasto por Centro de Salud</h3>
                <p className="text-[11px] text-secondary font-bold mt-1">H.E. + Turnos + Viáticos acumulados</p>
              </div>
              <BarChart3 className="w-5 h-5 text-outline/40" />
            </div>
            <div className="space-y-5">
              {loading ? (
                [1,2,3].map(i => (
                  <div key={i} className="animate-pulse space-y-2">
                    <div className="h-3 bg-surface-container rounded-full w-1/3" />
                    <div className="h-8 bg-surface-container rounded-xl" />
                  </div>
                ))
              ) : data?.por_centro.length === 0 ? (
                <p className="text-center text-outline font-bold italic py-12 text-xs">Sin datos de gasto aún</p>
              ) : (
                data?.por_centro.map((c, i) => {
                  const pct = max_centro > 0 ? (c.gasto_total / max_centro) * 100 : 0;
                  return (
                    <div key={c.nombre}>
                      <div className="flex justify-between items-baseline mb-1.5">
                        <span className="text-xs font-black text-on-surface uppercase tracking-wider">{c.nombre}</span>
                        <span className="text-sm font-black text-primary tracking-tighter">{formatCLP(c.gasto_total)}</span>
                      </div>
                      <div className="w-full h-9 bg-surface-container-low rounded-xl overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ delay: 0.3 + i * 0.1, duration: 0.8, ease: 'easeOut' }}
                          className={`h-full rounded-xl flex items-center px-4 ${
                            i === 0 ? 'bg-primary' : i === 1 ? 'bg-blue-400' : 'bg-sky-300'
                          }`}
                        >
                          {pct > 20 && (
                            <span className="text-white text-[10px] font-black tracking-wider">{pct.toFixed(0)}%</span>
                          )}
                        </motion.div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Panel derecho: Atrasos + Últimos consolidados */}
          <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">

            {/* Descuentos por Atraso */}
            <div className="bg-rose-50 border border-rose-100 rounded-[2rem] p-8 flex items-center gap-6">
              <div className="w-14 h-14 rounded-2xl bg-error/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-7 h-7 text-error" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-error/70 mb-1">Descuentos por Atrasos</p>
                <p className="text-3xl font-black text-error tracking-tighter">
                  {loading ? '—' : formatCLP(data?.kpis.total_atrasos_descuento ?? 0)}
                </p>
                <p className="text-[11px] font-bold text-error/60 mt-1">{data?.kpis.cantidad_atrasos ?? 0} registros de atraso</p>
              </div>
            </div>

            {/* Últimos consolidados */}
            <div className="bg-white rounded-[2rem] p-8 border border-outline-variant/10 shadow-sm flex-1">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-base font-black text-on-surface tracking-tight">Últimos Consolidados</h3>
                <Link href="/consolidados" className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all">
                  Ver todos <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="space-y-3">
                {loading ? (
                  [1,2,3].map(i => (
                    <div key={i} className="animate-pulse flex items-center gap-3 p-3 rounded-xl">
                      <div className="w-8 h-8 bg-surface-container rounded-lg" />
                      <div className="flex-1 space-y-1">
                        <div className="h-3 bg-surface-container rounded-full w-2/3" />
                        <div className="h-2 bg-surface-container rounded-full w-1/3" />
                      </div>
                    </div>
                  ))
                ) : data?.ultimos_consolidados.length === 0 ? (
                  <p className="text-center text-outline font-bold italic py-8 text-xs">Sin consolidados aún</p>
                ) : (
                  data?.ultimos_consolidados.map((c, i) => (
                    <Link
                      key={c.id}
                      href={`/consolidados/${c.id}`}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-primary/5 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                          <Building2 className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-on-surface group-hover:text-primary transition-colors">
                            {c.centro_salud?.nombre}
                          </p>
                          <p className="text-[10px] text-outline font-bold">
                            {c.periodo ? `${MESES[c.periodo.mes - 1]} ${c.periodo.anio}` : '—'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${
                          c.estado_actual_enum === 'Cerrado' 
                            ? 'bg-emerald-50 text-emerald-700' 
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          {c.estado_actual_enum}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-outline/40 group-hover:text-primary transition-colors" />
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Meta Barra */}
      <footer className="fixed bottom-0 right-0 left-64 bg-white/90 backdrop-blur-sm px-12 py-3 border-t border-outline-variant/10 z-40 flex justify-between items-center">
        <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">
          Corporación Municipal Panguipulli • Salud APS
        </span>
        <div className="flex gap-8">
          <Link href="/consolidados" className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest hover:text-primary transition-colors">Consolidados</Link>
          <Link href="/funcionarios" className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest hover:text-primary transition-colors">Funcionarios</Link>
          <Link href="/ingreso" className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest hover:text-primary transition-colors">Ingresar Novedades</Link>
        </div>
      </footer>
    </div>
  );
}
