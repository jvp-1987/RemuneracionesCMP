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
      transition={{ delay, duration: 0.5, ease: 'easeOut' }}
      className="bg-white rounded-[2rem] p-8 border border-outline-variant/10 shadow-sm hover:shadow-lg transition-all group hover:-translate-y-1 cursor-default"
    >
      <div className="flex justify-between items-start mb-6">
        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-secondary">{label}</span>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="text-4xl font-black text-on-surface tracking-tighter mb-2">{value}</div>
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-outline-variant/5">
        <p className="text-[11px] text-secondary font-bold">{sub}</p>
        {trend && (
          <span className={`flex items-center gap-1 text-[10px] font-black rounded-full px-2 py-1 ${
            trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-error/10 text-error'
          }`}>
            {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend === 'up' ? 'Al día' : 'Revisar'}
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
    <div className="flex flex-col min-h-screen bg-surface font-body overflow-x-hidden pb-28">

      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md flex justify-between items-center w-full px-12 py-5 border-b border-outline-variant/10">
        <div>
          <h2 className="text-2xl font-black text-primary tracking-tight font-headline uppercase">
            Remuneraciones CMP
          </h2>
          <p className="text-[10px] font-black text-secondary uppercase tracking-[0.3em] opacity-60">
            Panel Financiero • Actualizado {lastRefresh.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-5 py-2.5 bg-surface-container-low rounded-xl text-[10px] font-black uppercase tracking-widest text-secondary hover:text-primary hover:bg-white transition-all border border-outline-variant/10"
          >
            <RefreshCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-primary' : ''}`} />
            Actualizar
          </button>
          <Link href="/ingreso" className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md shadow-primary/20 hover:brightness-110 transition-all">
            <Activity className="w-3.5 h-3.5" />
            Ingresar Novedades
          </Link>
        </div>
      </header>

      <section className="px-12 py-12 space-y-12">

        {/* Hero total */}
        <motion.div 
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-gradient-to-br from-primary via-primary to-blue-700 rounded-[3rem] p-12 overflow-hidden shadow-2xl shadow-primary/30"
        >
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div>
              <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.4em] mb-3">Gasto Total Remuneracional</p>
              <div className="text-6xl font-black text-white tracking-tighter mb-3">
                {loading ? '—' : formatCLP(gasto_total)}
              </div>
              <p className="text-white/70 text-sm font-bold">Suma acumulada: H.E. + Programas + Viáticos</p>
            </div>
            <div className="grid grid-cols-2 gap-4 min-w-[320px]">
              {[
                { l: 'H.E. Presup.', v: data?.kpis.total_he ?? 0 },
                { l: 'Prog. Turno', v: data?.kpis.total_turnos ?? 0 },
                { l: 'Viáticos', v: data?.kpis.total_viaticos ?? 0 },
                { l: 'Desc. Atrasos', v: data?.kpis.total_atrasos_descuento ?? 0, neg: true },
              ].map(item => (
                <div key={item.l} className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
                  <p className="text-white/60 text-[9px] font-black uppercase tracking-widest mb-1">{item.l}</p>
                  <p className={`text-lg font-black ${item.neg ? 'text-rose-300' : 'text-white'} tracking-tighter`}>
                    {loading ? '—' : formatCLP(item.v)}
                  </p>
                </div>
              ))}
            </div>
          </div>
          {/* Decorativo */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-[60px]" />
          <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-blue-400/10 rounded-full translate-y-1/2 blur-[80px]" />
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
