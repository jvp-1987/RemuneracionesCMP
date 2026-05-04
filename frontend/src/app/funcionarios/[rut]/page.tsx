'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";

interface Funcionario {
  rut: string;
  nombre_completo: string;
  profesion_enum: string;
  categoria_aps: string;
  nivel_aps: number;
  jornada_horas: number;
  sueldo_base?: number;
}

export default function FuncionarioDetailPage() {
  const { rut } = useParams();
  const router = useRouter();
  const [funcionario, setFuncionario] = useState<Funcionario | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`/funcionarios/${rut}`);
        setFuncionario(res.data);
      } catch (err) {
        console.error('Error fetching funcionario:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [rut]);

  if (loading) return <div className="p-20 text-center animate-pulse text-primary font-black uppercase tracking-widest text-xs">Sincronizando Hoja de Vida...</div>;
  if (!funcionario) return <div className="p-20 text-center text-error font-extrabold whitespace-pre-line uppercase tracking-widest text-xs">Error de Carga: {rut} No Encontrado</div>;

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      {/* TopAppBar - Aligned with the new dashboard style */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-outline-variant/10 px-12 h-20 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => router.push('/funcionarios')}
            className="p-2.5 bg-surface-container-low hover:bg-surface-container rounded-xl transition-all active:scale-95 group"
          >
            <span className="material-symbols-outlined text-secondary group-hover:text-primary transition-colors">arrow_back</span>
          </button>
          <div className="h-6 w-[1px] bg-outline-variant/20 mx-2"></div>
          <h2 className="text-xs font-black tracking-[0.1em] text-on-surface uppercase">
            Escalafón <span className="text-primary mx-2">/</span> {funcionario.nombre_completo}
          </h2>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="relative hidden lg:block w-64 group">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-xs group-focus-within:text-primary transition-colors">search</span>
            <input 
              className="bg-surface-container-low border border-outline-variant/5 rounded-xl py-2 pl-10 pr-4 text-[10px] w-full focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-outline font-bold transition-all" 
              placeholder="Historial de auditoría..." 
              type="text"
            />
          </div>
          <div className="flex items-center gap-4">
             <button className="p-2.5 hover:bg-surface-container rounded-full text-secondary transition-colors">
                <span className="material-symbols-outlined">notifications</span>
             </button>
             <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-black text-[10px] text-primary">
                {funcionario.nombre_completo.split(' ').map(n => n[0]).join('').slice(0, 2)}
             </div>
          </div>
        </div>
      </header>

      <div className="p-12 max-w-7xl mx-auto w-full space-y-12">
        {/* Employee Hero Section */}
        <section className="flex flex-col lg:flex-row gap-12 items-start animate-in fade-in slide-in-from-bottom-4 duration-700">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full lg:w-1/3 bg-white rounded-[3rem] p-10 shadow-2xl shadow-slate-200/30 border border-outline-variant/5"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-44 h-44 rounded-[3rem] overflow-hidden mb-8 shadow-2xl ring-8 ring-surface-container-low relative group">
                <img 
                  alt={funcionario.nombre_completo} 
                  className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110 grayscale hover:grayscale-0"
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${funcionario.rut}`} 
                />
              </div>
              <h1 className="text-3xl font-black text-on-surface tracking-tighter uppercase mb-2 font-headline">{funcionario.nombre_completo}</h1>
              <span className="px-5 py-1.5 bg-primary/10 text-primary font-black text-[10px] uppercase tracking-[0.2em] rounded-full border border-primary/10">
                {funcionario.profesion_enum}
              </span>
              
              <div className="mt-8 flex wrap justify-center gap-3">
                <span className="px-4 py-1.5 bg-surface-container text-secondary text-[9px] font-black rounded-full uppercase tracking-widest border border-outline-variant/10">RUT: {funcionario.rut}</span>
                <span className="px-4 py-1.5 bg-emerald-50 text-emerald-600 text-[9px] font-black rounded-full uppercase tracking-widest border border-emerald-100 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                  Vínculo Activo
                </span>
              </div>
            </div>

            <div className="mt-12 space-y-6 pt-8 border-t border-outline-variant/5">
              <HeroField label="Establecimiento" value="Centro APS Central" />
              <HeroField label="Sueldo Base" value={`$${(funcionario.sueldo_base || 1250000).toLocaleString('es-CL')}`} />
              <HeroField label="Ley Médica" value={`Cat. ${funcionario.categoria_aps} • Niv. ${funcionario.nivel_aps}`} />
              <HeroField label="Jornada" value={`${funcionario.jornada_horas} hrs / Semanal`} border={false} />
            </div>
          </motion.div>

          {/* Bento Grid Statistics */}
          <div className="w-full lg:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-8">
            <BentoCard 
              title="Horas Mensuales" 
              icon="schedule" 
              value={`${funcionario.jornada_horas || 44}`} 
              unit="Horas Base"
              color="primary"
              footer={
                <div className="flex gap-8">
                  <MiniStat label="Sobretiempo 25%" value="12.5 hrs" />
                  <div className="w-[1px] h-8 bg-outline-variant/20"></div>
                  <MiniStat label="Sobretiempo 50%" value="4.0 hrs" />
                </div>
              }
            />
            
            <BentoCard 
              title="Impacto Viáticos" 
              icon="flight_takeoff" 
              value="$842.150" 
              color="primary"
              footer={
                <div className="flex items-center gap-4">
                  <div className="flex -space-x-2.5">
                    {[1,2,3].map(i => (
                      <div key={i} className="w-8 h-8 rounded-full bg-primary/20 border-2 border-white flex items-center justify-center text-[10px] font-black text-primary shadow-sm hover:z-10 transition-all cursor-pointer">
                        {i}
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] font-black text-secondary uppercase tracking-widest">8 Documentos Visados</p>
                </div>
              }
            />

            {/* Historical Trend (Large Bento) */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="md:col-span-2 bg-white rounded-[3rem] p-10 shadow-2xl shadow-slate-200/30 border border-outline-variant/5 relative overflow-hidden group"
            >
              <div className="flex justify-between items-center mb-12">
                <div>
                  <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-secondary opacity-60">Tendencia de Remuneración</h3>
                  <p className="text-xs text-secondary font-bold mt-1 uppercase tracking-tight">Variación semestral de haberes calculados</p>
                </div>
                <div className="flex gap-2 p-1.5 bg-surface-container rounded-2xl shadow-inner">
                  <button className="px-5 py-2 text-[10px] font-black text-secondary hover:text-primary transition-all uppercase tracking-widest">Sueldo</button>
                  <button className="px-5 py-2 bg-primary text-white rounded-xl shadow-lg shadow-primary/20 font-black text-[10px] uppercase tracking-widest">Horas</button>
                </div>
              </div>
              
              <div className="h-48 w-full flex items-end justify-between gap-6 px-4">
                <TrendBar month="OCT" height="60%" />
                <TrendBar month="NOV" height="75%" />
                <TrendBar month="DIC" height="85%" />
                <TrendBar month="ENE" height="45%" opacity={0.3} />
                <TrendBar month="FEB" height="95%" />
                <TrendBar month="MAR" height="80%" active />
              </div>
              <span className="absolute -right-12 -top-12 material-symbols-outlined text-[120px] opacity-[0.02] text-primary group-hover:rotate-12 transition-transform">monitoring</span>
            </motion.div>
          </div>
        </section>

        {/* Detailed Audit Log & Breakdown */}
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-12 pt-8 border-t border-outline-variant/10">
          {/* Detailed Hours Breakdown */}
          <div className="xl:col-span-2 space-y-8">
            <h3 className="text-2xl font-black text-on-surface tracking-tighter uppercase font-headline flex items-center gap-4">
              <span className="material-symbols-outlined text-primary text-3xl">analytics</span>
              Desglose de Haberes Marzo
            </h3>
            <div className="bg-white rounded-[3rem] overflow-hidden shadow-2xl shadow-slate-200/30 border border-outline-variant/5">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-surface-container-low/40">
                      <th className="px-10 py-6 font-black text-outline uppercase text-[10px] tracking-[0.2em]">Fecha Auditoría</th>
                      <th className="px-10 py-6 font-black text-outline uppercase text-[10px] tracking-[0.2em]">Observación Clínica</th>
                      <th className="px-10 py-6 font-black text-outline uppercase text-[10px] tracking-[0.2em] text-center">H. Base</th>
                      <th className="px-10 py-6 font-black text-outline uppercase text-[10px] tracking-[0.2em] text-center">T. 25%</th>
                      <th className="px-10 py-6 font-black text-outline uppercase text-[10px] tracking-[0.2em] text-center">T. 50%</th>
                      <th className="px-10 py-6 font-black text-outline uppercase text-[10px] tracking-[0.2em] text-right">Monto Bruto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/5">
                    <BreakdownRow date="Mar 22" desc="Operativo Terreno Rural" base="8.0 hrs" ot25="2.0 hrs" ot50="-" amount="$342.500" />
                    <BreakdownRow date="Mar 21" desc="Turno Extendido SAPU" base="8.0 hrs" ot25="1.5 hrs" ot50="1.0 hrs" amount="$398.200" />
                    <BreakdownRow date="Mar 20" desc="Atención Policlínico" base="8.0 hrs" ot25="-" ot50="-" amount="$245.000" />
                    <BreakdownRow date="Mar 19" desc="Interconsulta Especialista" base="8.0 hrs" ot25="3.0 hrs" ot50="-" amount="$365.100" />
                  </tbody>
                </table>
              </div>
              <div className="p-10 bg-surface-container-low/20 flex justify-center border-t border-outline-variant/10">
                <button className="text-[11px] font-black text-primary uppercase tracking-[0.2em] hover:underline flex items-center gap-3 active:scale-95 transition-all">
                  Descargar Reporte Hoja de Vida
                  <span className="material-symbols-outlined text-lg">download</span>
                </button>
              </div>
            </div>
          </div>

          {/* Audit Log Timeline */}
          <div className="space-y-8">
            <h3 className="text-2xl font-black text-on-surface tracking-tighter uppercase font-headline flex items-center gap-4">
              <span className="material-symbols-outlined text-secondary text-3xl">history_edu</span>
              Trazabilidad Administrativa
            </h3>
            <div className="relative pl-12 space-y-12 before:content-[''] before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-[2px] before:bg-outline-variant/15 flex flex-col justify-start">
              <TimelineEntry 
                date="Hoy, 09:42 AM" 
                title="Sueldo Marzo Certificado" 
                desc="Validación realizada por Inspector Senior:" 
                highlight="Dr. Auditor" 
                icon="verified" 
                color="primary" 
              />
              <TimelineEntry 
                date="Ayer, 04:15 PM" 
                title="Ajuste de Asignación" 
                desc="Reajuste automático realizado por sistema CMP-Sync." 
                icon="sync" 
                color="secondary" 
              />
              <TimelineEntry 
                date="Mar 18, 11:30 AM" 
                title="Alerta Anomalía Pendiente" 
                desc="Discrepancia detectada en carga de horas nocturnas." 
                icon="warning" 
                color="error" 
              />
            </div>
          </div>
        </section>
      </div>

      {/* Floating Meta Footer */}
      <footer className="fixed bottom-0 right-0 left-64 bg-white/80 backdrop-blur-md border-t border-outline-variant/10 px-12 py-3.5 z-40 flex justify-between items-center shadow-[0_-8px_20px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-black text-primary uppercase tracking-[0.25em]">Remuneración Salud CMP • Hoja de Vida Digital</span>
        </div>
        <div className="flex gap-10">
          <a href="#" className="text-[10px] font-black text-secondary uppercase tracking-widest hover:text-primary transition-colors">Seguridad</a>
          <a href="#" className="text-[10px] font-black text-secondary uppercase tracking-widest hover:text-primary transition-colors">Términos Legales</a>
          <a href="#" className="text-[10px] font-black text-secondary uppercase tracking-widest hover:text-primary transition-colors">Audit trail</a>
        </div>
      </footer>
    </div>
  );
}

// --- Helper Components ---

function HeroField({ label, value, border = true }: { label: string, value: string, border?: boolean }) {
  return (
    <div className={cn("flex justify-between items-center pb-5", border && "border-b border-outline-variant/5")}>
      <span className="text-secondary text-[11px] font-black uppercase tracking-widest opacity-60">{label}</span>
      <span className="text-on-surface font-black text-sm uppercase tracking-tight">{value}</span>
    </div>
  );
}

function BentoCard({ title, icon, value, unit, color, footer }: { title: string, icon: string, value: string, unit?: string, color: 'primary', footer?: React.ReactNode }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[3rem] p-10 shadow-2xl shadow-slate-200/30 border border-outline-variant/5 flex flex-col justify-between group overflow-hidden relative transition-all hover:shadow-primary/5"
    >
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-8">
          <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-secondary opacity-60 underline decoration-primary/30 decoration-4 underline-offset-[8px]">{title}</h3>
          <span className="material-symbols-outlined text-3xl text-primary transition-transform group-hover:scale-125 duration-300">{icon}</span>
        </div>
        <div className="flex items-baseline gap-3">
          <span className="text-5xl font-black text-on-surface tracking-tighter leading-none">{value}</span>
          {unit && <span className="text-[11px] text-secondary font-black uppercase tracking-widest opacity-60">{unit}</span>}
        </div>
      </div>
      <div className="mt-10 relative z-10">
        {footer}
      </div>
      <span className="absolute -right-12 -bottom-12 material-symbols-outlined text-[160px] opacity-[0.02] text-primary group-hover:scale-110 transition-transform duration-700">{icon}</span>
    </motion.div>
  );
}

function MiniStat({ label, value }: { label: string, value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase font-black text-secondary opacity-60 tracking-widest mb-1.5 leading-none">{label}</p>
      <p className="text-[15px] font-black text-on-surface leading-none">{value}</p>
    </div>
  );
}

function TrendBar({ month, height, active, opacity = 1 }: { month: string, height: string, active?: boolean, opacity?: number }) {
  return (
    <div className="group relative flex flex-col items-center flex-1 h-full justify-end">
      <motion.div 
        initial={{ height: 0 }}
        animate={{ height }}
        transition={{ duration: 1, ease: "easeOut" }}
        style={{ opacity }}
        className={cn(
          "w-full rounded-t-2xl transition-all duration-300 relative group",
          active ? "bg-primary shadow-xl shadow-primary/30" : "bg-surface-container-high hover:bg-primary/20"
        )}
      >
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-on-background text-white text-[9px] px-3 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-all font-black text-center whitespace-nowrap shadow-xl">
          {Math.round(parseInt(height) * 1.85)} hrs
        </div>
      </motion.div>
      <p className={cn("text-[10px] font-black mt-5 tracking-[0.2em]", active ? "text-primary" : "text-secondary opacity-60")}>{month}</p>
    </div>
  );
}

function BreakdownRow({ date, desc, base, ot25, ot50, amount }: { date: string, desc: string, base: string, ot25: string, ot50: string, amount: string }) {
  return (
    <tr className="hover:bg-primary/5 transition-all group border-l-4 border-transparent hover:border-l-primary/30">
      <td className="px-10 py-7 font-black text-on-surface text-[14px] tracking-tighter">{date}</td>
      <td className="px-10 py-7 text-secondary font-bold text-xs uppercase tracking-tight opacity-80">{desc}</td>
      <td className="px-10 py-7 text-center font-black text-on-surface text-xs">{base}</td>
      <td className="px-10 py-7 text-center font-black text-primary text-xs">{ot25}</td>
      <td className="px-10 py-7 text-center font-black text-outline/40 text-xs">{ot50}</td>
      <td className="px-10 py-7 text-right font-black text-primary text-[15px] tracking-tighter">{amount}</td>
    </tr>
  );
}

function TimelineEntry({ date, title, desc, highlight, icon, color }: { date: string, title: string, desc: string, highlight?: string, icon: string, color: 'primary' | 'secondary' | 'error' }) {
  const iconColors: any = {
    primary: 'bg-primary shadow-primary/30',
    secondary: 'bg-secondary shadow-slate-200/50',
    error: 'bg-error shadow-error/30'
  };
  return (
    <div className="relative">
      <div className={cn("absolute -left-[45px] top-0 w-9 h-9 rounded-full border-4 border-white shadow-2xl flex items-center justify-center relative z-10", iconColors[color])}>
        <span className="material-symbols-outlined text-[15px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
      </div>
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-white p-8 rounded-[2rem] shadow-2xl shadow-slate-200/30 border border-outline-variant/10 group hover:border-primary/30 transition-all"
      >
        <p className={cn("text-[10px] font-black uppercase tracking-[0.25em] mb-3", color === 'error' ? 'text-error' : 'text-primary')}>{date}</p>
        <p className="text-sm font-black text-on-surface tracking-tight uppercase mb-2 font-headline">{title}</p>
        <p className="text-[11px] text-secondary font-bold leading-relaxed opacity-80">
          {desc} {highlight && <span className="font-black text-on-surface underline decoration-primary/30 decoration-4 underline-offset-4">{highlight}</span>}
        </p>
      </motion.div>
    </div>
  );
}

