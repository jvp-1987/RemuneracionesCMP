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
  remuneracion_presupuesto?: {
    escala_base: number;
    asignacion_aps: number;
    asignacion_zona: number;
    desempeno_dificil: number;
    porcentaje_zona: number;
    porcentaje_dificil: number;
    total_base_mensual: number;
    valor_hora: number;
  };
  centro_salud?: {
    nombre: string;
  };
  stats?: {
    total_he: number;
    total_atrasos: number;
    total_viaticos: number;
    monto_he_real: number;
    monto_he_25_maestro: number;
    monto_he_50_maestro: number;
    monto_he_presupuesto: number;
    monto_atrasos_real: number;
    monto_atrasos_presupuesto: number;
    total_haberes_real: number;
    total_descuentos_real: number;
    monto_liquido_real: number;
    periodo_maestro?: string;
  };
  liquidaciones?: {
    id: number;
    periodo: { mes: number; anio: number };
    sueldo_base: number;
    total_haberes: number;
    total_descuentos: number;
    monto_liquido: number;
    detalle_json: any;
  }[];
  contratos?: any[];
  ausentismos?: any[];
  asignaciones?: any[];
  AsignacionFuncionario?: any[];
}

export default function FuncionarioDetailPage() {
  const { rut } = useParams();
  const router = useRouter();
  const [funcionario, setFuncionario] = useState<Funcionario | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'perfil' | 'historial' | 'contratos' | 'ausentismos' | 'resoluciones' | 'asignaciones'>('perfil');
  const [selectedRawData, setSelectedRawData] = useState<any | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api-remuneracion.apscolab.com';
        const res = await axios.get(`${apiUrl}/funcionarios/${rut}`);
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
      </header>

      <div className="px-12 max-w-7xl mx-auto w-full pt-8">
        <div className="flex gap-10 border-b border-outline-variant/10 overflow-x-auto no-scrollbar">
          {(['perfil', 'asignaciones', 'historial', 'contratos', 'ausentismos', 'resoluciones'] as const).map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "pb-4 text-[11px] font-black uppercase tracking-[0.2em] transition-all relative whitespace-nowrap",
                activeTab === tab ? "text-primary" : "text-outline hover:text-secondary"
              )}
            >
              {tab === 'perfil' ? 'Hoja de Vida' : tab === 'historial' ? 'Historial Liquidaciones' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              {activeTab === tab && <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />}
            </button>
          ))}
        </div>
      </div>

      <div className="p-12 max-w-7xl mx-auto w-full space-y-12">
        {activeTab === 'perfil' && (
           <section className="flex flex-col lg:flex-row gap-12 items-start animate-in fade-in slide-in-from-bottom-4 duration-700">
             <div className="w-full lg:w-1/3 bg-white rounded-[3rem] p-10 shadow-2xl shadow-slate-200/30 border border-outline-variant/5">
                <div className="flex flex-col items-center text-center">
                  <div className="w-44 h-44 rounded-[3rem] overflow-hidden mb-8 shadow-2xl relative group">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${funcionario.rut}`} alt={funcionario.nombre_completo} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all" />
                  </div>
                  <h1 className="text-3xl font-black text-on-surface tracking-tighter uppercase mb-2">{funcionario.nombre_completo}</h1>
                  <span className="px-5 py-1.5 bg-primary/10 text-primary font-black text-[10px] uppercase tracking-[0.2em] rounded-full">{funcionario.profesion_enum}</span>
                </div>
                <div className="mt-12 space-y-6 pt-8 border-t border-outline-variant/5">
                  <HeroField label="Establecimiento" value={funcionario.centro_salud?.nombre || 'Sin asignar'} />
                  <HeroField 
                    label="Sueldo Base" 
                    value={`$${Math.round(
                      (funcionario.remuneracion_presupuesto?.escala_base || 0) + (funcionario.remuneracion_presupuesto?.asignacion_aps || 0) || funcionario.sueldo_base || 0
                    ).toLocaleString('es-CL')}`} 
                  />
                  <HeroField label="Ley Médica" value={`Cat. ${funcionario.categoria_aps} • Niv. ${funcionario.nivel_aps}`} />
                  <HeroField label="Jornada" value={`${funcionario.jornada_horas} hrs / Semanal`} border={false} />
                </div>
             </div>
             
             <div className="w-full lg:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white rounded-[3rem] p-10 shadow-2xl border border-outline-variant/5 flex flex-col justify-between group overflow-hidden relative transition-all">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex flex-col">
                          <h3 className="text-[11px] font-black uppercase tracking-[0.2em] opacity-60">Horas Extras</h3>
                          {funcionario.stats?.periodo_maestro ? (
                             <span className="text-[9px] font-bold text-primary uppercase mt-1">({funcionario.stats.periodo_maestro})</span>
                          ) : (
                             <span className="text-[9px] font-bold text-outline uppercase mt-1">(Sin Maestro)</span>
                          )}
                        </div>
                        <span className="material-symbols-outlined text-3xl text-primary">schedule</span>
                      </div>
                      <div className="flex flex-col gap-1 mb-4">
                        <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-outline">HE 25%</span><span className="text-sm font-black">${Math.round(funcionario.stats?.monto_he_25_maestro || 0).toLocaleString('es-CL')}</span></div>
                        <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-outline">HE 50%</span><span className="text-sm font-black">${Math.round(funcionario.stats?.monto_he_50_maestro || 0).toLocaleString('es-CL')}</span></div>
                      </div>
                      <div className="flex items-baseline gap-2 pt-4 border-t border-outline-variant/10">
                        <span className="text-[10px] font-black uppercase text-primary">Total Pagado:</span>
                        <span className="text-xl font-black">${Math.round(funcionario.stats?.monto_he_real || 0).toLocaleString('es-CL')}</span>
                      </div>
                    </div>
                  </div>
                <div className="bg-white rounded-[3rem] p-10 shadow-2xl border border-outline-variant/5 flex flex-col justify-between group overflow-hidden relative transition-all">
                  <div>
                    <div className="flex justify-between items-start mb-8">
                      <div className="flex flex-col">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] opacity-60">Líquido Real</h3>
                        {funcionario.stats?.periodo_maestro && <span className="text-[9px] font-bold text-emerald-600 uppercase mt-1">({funcionario.stats.periodo_maestro})</span>}
                      </div>
                      <span className="material-symbols-outlined text-3xl text-primary">payments</span>
                    </div>
                    <div className="flex items-baseline gap-3"><span className="text-5xl font-black tracking-tighter">${(funcionario.stats?.monto_liquido_real || 0).toLocaleString('es-CL')}</span></div>
                  </div>
                </div>
                {funcionario.remuneracion_presupuesto && (
                  <div className="md:col-span-2 bg-gradient-to-br from-indigo-50 to-white rounded-[3rem] p-10 shadow-2xl border border-indigo-100/20">
                     <div className="flex justify-between items-center mb-6">
                       <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-indigo-900/60">Estructura Remunerativa</h3>
                       {funcionario.stats?.periodo_maestro && <span className="text-[9px] font-black bg-indigo-900/10 text-indigo-900 px-3 py-1 rounded-full uppercase">{funcionario.stats.periodo_maestro}</span>}
                     </div>
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="bg-white/60 p-6 rounded-[2rem] shadow-sm"><p className="text-[9px] font-black uppercase mb-2">Base Escala</p><p className="text-lg font-black">${Math.round(funcionario.remuneracion_presupuesto.escala_base).toLocaleString('es-CL')}</p></div>
                        <div className="bg-white/60 p-6 rounded-[2rem] shadow-sm"><p className="text-[9px] font-black uppercase mb-2">Asig. APS</p><p className="text-lg font-black">${Math.round(funcionario.remuneracion_presupuesto.asignacion_aps).toLocaleString('es-CL')}</p></div>
                        <div className="bg-emerald-50/50 p-6 rounded-[2rem] shadow-sm"><p className="text-[9px] font-black uppercase mb-2">Zona {funcionario.remuneracion_presupuesto.porcentaje_zona}%</p><p className="text-lg font-black">${Math.round(funcionario.remuneracion_presupuesto.asignacion_zona).toLocaleString('es-CL')}</p></div>
                        <div className="bg-amber-50/50 p-6 rounded-[2rem] shadow-sm"><p className="text-[9px] font-black uppercase mb-2">Difícil {funcionario.remuneracion_presupuesto.porcentaje_dificil}%</p><p className="text-lg font-black">${Math.round(funcionario.remuneracion_presupuesto.desempeno_dificil).toLocaleString('es-CL')}</p></div>
                     </div>
                  </div>
                )}
                {funcionario.liquidaciones?.[0]?.detalle_json && (
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white rounded-[3rem] p-10 shadow-2xl border border-outline-variant/5">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] opacity-60">Otras Asignaciones</h3>
                      </div>
                      <div className="space-y-3">
                        {Object.entries(funcionario.liquidaciones[0].detalle_json)
                          .filter(([key, val]) => {
                            if (typeof val !== 'number' || val <= 0) return false;
                            const k = key.toUpperCase();
                            
                            const isMetadata = ['MES', 'AÑO', 'EDAD', 'FICHA', 'NIVEL', 'N°HORAS', 'JORNADA', 'JORNADA HRS', 'DIAS TRABAJADOS', 'FECHA DE NACIMIENTO', 'FECHA INICIO SERVICIO', 'NºCARGAS FAMILIARES', 'DIAS ACREDITADOS', 'AÑOS ACREDITADOS', 'MESES ACREDITADOS', 'PUNTAJE ANTIGÜEDAD', 'TELEFONO', 'N° DECRETO', 'N° DEC. NOMBRAMIENTO', 'Nº BIENIOS', 'POST TITULO', 'MONTO PACTADO'].some(w => k === w);
                            if (isMetadata) return false;
                            
                            // Excluir Aportes del empleador que no son de libre disposicion
                            if (k.includes('APORTE') || k.includes('PATRONAL') || k.includes('EMPLEADOR')) return false;

                            // Excluir base y novedades
                            if (k.includes('SUELDO BASE') || k.includes('ATENCION PRIMARIA') || k.includes('ASIGNACION APS') || k.includes('ASIG. APS') || k.includes('ZONA') || k.includes('DIFICIL') || k.includes('CALCULATED_')) return false;
                            if (k.includes('HORAS EXTRAS') || k.includes('VIATICOS') || k.includes('ATRASO')) return false;
                            
                            // Excluir Subtotales
                            if (k.includes('TOTAL') || k.includes('LIQUIDO') || k.includes('IMPONIBLE') || k.includes('TRIBUTABLE') || k.includes('PROMEDIO')) return false;
                            
                            // Excluir Descuentos conocidos
                            const isDescuento = ['SALUD', 'AFP', 'PENSION', 'IMPUESTO', 'ANTICIPO', 'DESCUENTO', 'CAJA', 'CCAF', 'PRESTAMO', 'SEGURO', 'CESANTIA', 'ASOC', 'COLEGIO', 'SINDICATO', 'AHORRO', 'VOLUNTARI', 'ATRASO', 'BIENESTAR', 'FONDO', 'MUTUAL'].some(w => k.includes(w));
                            if (isDescuento) return false;
                            
                            return true;
                          })
                          .map(([key, val]) => (
                            <div key={key} className="flex justify-between items-center border-b border-outline-variant/5 pb-2">
                              <span className="text-[9px] font-bold text-outline uppercase tracking-widest truncate max-w-[70%]">{key}</span>
                              <span className="text-sm font-black text-emerald-600">${Number(val).toLocaleString('es-CL')}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                    <div className="bg-white rounded-[3rem] p-10 shadow-2xl border border-outline-variant/5">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] opacity-60">Descuentos Aplicados</h3>
                      </div>
                      <div className="space-y-3">
                        {Object.entries(funcionario.liquidaciones[0].detalle_json)
                          .filter(([key, val]) => {
                            if (typeof val !== 'number' || val <= 0) return false;
                            const k = key.toUpperCase();
                            
                            // Excluir base y novedades
                            if (k.includes('HORAS EXTRAS') || k.includes('VIATICOS')) return false;
                            
                            // Excluir Subtotales
                            if (k.includes('TOTAL') || k.includes('LIQUIDO') || k.includes('IMPONIBLE') || k.includes('TRIBUTABLE') || k.includes('PROMEDIO')) return false;
                            
                            const isDescuento = ['SALUD', 'AFP', 'PENSION', 'IMPUESTO', 'ANTICIPO', 'DESCUENTO', 'CAJA', 'CCAF', 'PRESTAMO', 'SEGURO', 'CESANTIA', 'ASOC', 'COLEGIO', 'SINDICATO', 'AHORRO', 'VOLUNTARI', 'ATRASO', 'BIENESTAR', 'FONDO', 'MUTUAL'].some(w => k.includes(w));
                            if (isDescuento) return true;
                            
                            return false;
                          })
                          .map(([key, val]) => (
                            <div key={key} className="flex justify-between items-center border-b border-outline-variant/5 pb-2">
                              <span className="text-[9px] font-bold text-outline uppercase tracking-widest truncate max-w-[70%]">{key}</span>
                              <span className="text-sm font-black text-rose-500">${Number(val).toLocaleString('es-CL')}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}
             </div>
         </section>
        )}

        {activeTab === 'asignaciones' && (
          <div className="bg-white rounded-[3rem] shadow-2xl border border-outline-variant/5 p-10 space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-black uppercase">Beneficios y Asignaciones Fijas</h3>
              <span className="text-[10px] font-black uppercase text-outline tracking-[0.2em]">Registro Histórico</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Formulario de Enrolamiento (Mini) */}
              <div className="bg-surface-container-low p-8 rounded-[2rem] border border-outline-variant/10">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 mb-6">Nueva Asignación</h4>
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    try {
                      const url = process.env.NEXT_PUBLIC_API_URL || 'https://api-remuneracion.apscolab.com';
                      await axios.post(`${url}/asignaciones/funcionario`, {
                        funcionario_rut: rut,
                        asignacion_id: Number(formData.get('asignacion_id')),
                        tipo_calculo: formData.get('tipo_calculo'),
                        valor: Number(formData.get('valor')),
                        fecha_inicio: formData.get('fecha_inicio'),
                        fecha_termino: formData.get('fecha_termino') || null,
                        num_resolucion: formData.get('num_resolucion')
                      });
                      alert('Asignación agregada correctamente');
                      window.location.reload();
                    } catch (error) {
                      console.error(error);
                      alert('Error al agregar asignación');
                    }
                  }} 
                  className="space-y-4"
                >
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">ID de Catálogo (A futuro será un Select)</label>
                    <input name="asignacion_id" type="number" required className="w-full text-sm bg-white border border-slate-200 rounded-xl px-4 py-2" placeholder="ID (ej: 1)"/>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Tipo</label>
                      <select name="tipo_calculo" className="w-full text-sm bg-white border border-slate-200 rounded-xl px-4 py-2">
                        <option value="MONTO_FIJO">Monto Fijo ($)</option>
                        <option value="PORCENTAJE">Porcentaje (%)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Valor</label>
                      <input name="valor" type="number" step="0.01" required className="w-full text-sm bg-white border border-slate-200 rounded-xl px-4 py-2" placeholder="Ej: 150000 o 15"/>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Inicio</label>
                      <input name="fecha_inicio" type="date" required className="w-full text-sm bg-white border border-slate-200 rounded-xl px-4 py-2"/>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Término (Opcional)</label>
                      <input name="fecha_termino" type="date" className="w-full text-sm bg-white border border-slate-200 rounded-xl px-4 py-2"/>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Nº Resolución</label>
                    <input name="num_resolucion" type="text" className="w-full text-sm bg-white border border-slate-200 rounded-xl px-4 py-2" placeholder="Ej: Res. Exenta N°1234"/>
                  </div>
                  <button type="submit" className="w-full py-3 mt-2 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:brightness-110">
                    Guardar Beneficio
                  </button>
                </form>
              </div>

              {/* Lista de Asignaciones */}
              <div className="space-y-4">
                {(!funcionario.AsignacionFuncionario || funcionario.AsignacionFuncionario.length === 0) ? (
                  <div className="p-12 text-center border-2 border-dashed border-outline-variant/20 rounded-[2rem]">
                    <p className="text-[10px] font-black text-outline uppercase tracking-widest italic">No tiene asignaciones activas</p>
                  </div>
                ) : (
                  funcionario.AsignacionFuncionario.map((asig: any) => (
                    <div key={asig.id} className="p-6 rounded-[2rem] border border-outline-variant/10 bg-slate-50 relative overflow-hidden group">
                      <div className={`absolute top-0 left-0 w-1.5 h-full ${asig.estado === 'ACTIVO' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-sm font-black text-slate-800">{asig.catalogo?.nombre || 'Asignación'}</h4>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${asig.estado === 'ACTIVO' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {asig.estado}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Monto / Tipo</p>
                          <p className="text-xs font-black text-slate-700">
                            {asig.tipo_calculo === 'PORCENTAJE' ? `${asig.valor}%` : `$${Number(asig.valor).toLocaleString('es-CL')}`}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Resolución</p>
                          <p className="text-xs font-bold text-slate-700">{asig.num_resolucion || 'S/N'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Inicio</p>
                          <p className="text-xs font-bold text-slate-700">{new Date(asig.fecha_inicio).toLocaleDateString('es-CL')}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Término</p>
                          <p className="text-xs font-bold text-slate-700">{asig.fecha_termino ? new Date(asig.fecha_termino).toLocaleDateString('es-CL') : 'Indefinido'}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'historial' && (
          <div className="bg-white rounded-[3rem] shadow-2xl border border-outline-variant/5 p-10 space-y-6">
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-2xl font-black uppercase">Historial de Pagos</h3>
               <span className="text-[10px] font-black uppercase text-outline tracking-[0.2em]">Cargados desde Maestro</span>
             </div>
             
             {!funcionario.liquidaciones || funcionario.liquidaciones.length === 0 ? (
                <div className="p-20 text-center border-2 border-dashed border-outline-variant/20 rounded-[2rem]">
                  <p className="text-[10px] font-black text-outline uppercase tracking-widest italic">Aún no se ha sincronizado el maestro de este funcionario.</p>
                </div>
             ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {funcionario.liquidaciones.map((liq) => (
                    <div key={liq.id} className="bg-slate-50 p-8 rounded-[2rem] border border-outline-variant/10 hover:border-primary/30 transition-all group relative overflow-hidden">
                       <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-[100px] -z-10 group-hover:scale-150 transition-transform"></div>
                       <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.25em] mb-6">
                         {new Date(liq.periodo.anio, liq.periodo.mes - 1).toLocaleString('es-CL', { month: 'long' })} {liq.periodo.anio}
                       </h4>
                       <div className="space-y-4">
                         <div className="flex justify-between items-center border-b border-outline-variant/5 pb-3">
                           <span className="text-[10px] font-bold text-outline uppercase tracking-widest">Total Haberes</span>
                           <span className="text-sm font-black text-slate-700">${Math.round(liq.total_haberes || 0).toLocaleString('es-CL')}</span>
                         </div>
                         <div className="flex justify-between items-center border-b border-outline-variant/5 pb-3">
                           <span className="text-[10px] font-bold text-outline uppercase tracking-widest">Total Descuentos</span>
                           <span className="text-sm font-black text-slate-700">${Math.round(liq.total_descuentos || 0).toLocaleString('es-CL')}</span>
                         </div>
                         <div className="flex justify-between items-center pt-2">
                           <span className="text-xs font-black text-slate-900 uppercase tracking-widest">Líquido Pagado</span>
                           <span className="text-xl font-black text-emerald-600">${Math.round(liq.monto_liquido || 0).toLocaleString('es-CL')}</span>
                         </div>
                       </div>
                       
                       <div className="mt-6 pt-6 border-t border-outline-variant/10 flex justify-end">
                         <button 
                           onClick={() => setSelectedRawData(liq.detalle_json)}
                           className="text-[9px] font-black text-primary uppercase tracking-widest hover:underline"
                         >
                           Ver Datos Brutos del Excel
                         </button>
                       </div>
                    </div>
                  ))}
                </div>
             )}
          </div>
        )}

        {activeTab === 'contratos' && (
          <div className="bg-white rounded-[3rem] shadow-2xl border border-outline-variant/5 p-10 space-y-6">
             <h3 className="text-2xl font-black uppercase mb-8">Historial de Contratos</h3>
             {!funcionario.contratos || funcionario.contratos.length === 0 ? (
                <div className="p-20 text-center border-2 border-dashed border-outline-variant/20 rounded-[2rem]">
                  <p className="text-[10px] font-black text-outline uppercase tracking-widest italic">No se registran contratos en el sistema</p>
                </div>
             ) : (
               funcionario.contratos.map((c: any) => {
                  const isExpired = c.fecha_termino && new Date(c.fecha_termino) < new Date();
                  return (
                    <div key={c.id} className="p-8 bg-slate-50 rounded-[2rem] border border-outline-variant/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 group hover:border-primary/20 transition-all">
                       <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black bg-primary/10 text-primary px-3 py-1 rounded-full uppercase tracking-widest">{c.tipo_contrato}</span>
                            <span className={cn(
                              "px-3 py-1 text-[10px] font-black rounded-full uppercase tracking-widest",
                              c.estado === 'Vigente' 
                                ? (isExpired ? "bg-rose-600 text-white animate-pulse shadow-lg shadow-rose-600/20" : "bg-emerald-500 text-white") 
                                : "bg-slate-200 text-slate-500"
                            )}>
                              {c.estado === 'Vigente' && isExpired ? 'Vigente (VENCIDO)' : c.estado}
                            </span>
                          </div>
                          <h4 className="text-xl font-black text-slate-900 group-hover:text-primary transition-colors">{c.cargo || 'Cargo no especificado'}</h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-8">
                             <div className="space-y-1">
                                <p className="text-[9px] font-black text-outline uppercase tracking-tighter">Desde</p>
                                <p className="text-[11px] font-bold text-secondary">{new Date(c.fecha_inicio).toLocaleDateString()}</p>
                             </div>
                             <div className="space-y-1">
                                <p className="text-[9px] font-black text-outline uppercase tracking-tighter">Hasta</p>
                                <p className={cn("text-[11px] font-bold", isExpired && c.estado === 'Vigente' ? "text-rose-600" : "text-secondary")}>
                                  {c.fecha_termino ? new Date(c.fecha_termino).toLocaleDateString() : 'Indefinido'}
                                </p>
                             </div>
                             <div className="space-y-1">
                                <p className="text-[9px] font-black text-outline uppercase tracking-tighter">Jornada</p>
                                <p className="text-[11px] font-bold text-secondary">{c.jornada_horas || 44} Horas</p>
                             </div>
                          </div>
                       </div>
                    </div>
                  );
               })
             )}
          </div>
        )}

        {activeTab === 'ausentismos' && (
          <div className="bg-white rounded-[3rem] shadow-2xl border border-outline-variant/5 p-10 space-y-4">
             <h3 className="text-2xl font-black uppercase mb-8">Ausentismos</h3>
             {funcionario.ausentismos?.map((a: any) => (
                <div key={a.id} className="p-6 bg-slate-50 rounded-2xl border border-outline-variant/10 flex justify-between items-center">
                   <div><span className="text-[10px] font-black bg-rose-50 text-rose-600 px-3 py-1 rounded-full">{a.tipo_ausentismo}</span><p className="text-sm font-bold mt-3">{a.dias_habiles} Días Hábiles</p></div>
                   {a.descuento_aplicable && <span className="text-[10px] font-black text-rose-600 uppercase">Aplica Descuento</span>}
                </div>
             ))}
          </div>
        )}

        {activeTab === 'resoluciones' && (
          <div className="bg-white rounded-[3rem] shadow-2xl border border-outline-variant/5 p-10 space-y-4">
             <h3 className="text-2xl font-black uppercase mb-8">Resoluciones</h3>
             {funcionario.asignaciones?.map((asig: any) => (
                <div key={asig.id} className="p-6 bg-slate-50 rounded-2xl border border-outline-variant/10 flex justify-between items-center">
                   <div><h4 className="text-lg font-black">{asig.tipo_asignacion}</h4><p className="text-[10px] font-black uppercase opacity-60">Res N° {asig.nro_resolucion}</p></div>
                   <p className="text-xl font-black text-primary">${Math.round(asig.monto_o_porcentaje).toLocaleString('es-CL')}</p>
                </div>
             ))}
          </div>
        )}
      </div>

      {selectedRawData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center bg-slate-50">
              <h3 className="text-sm font-black uppercase tracking-widest text-primary">Detalle Completo del Maestro</h3>
              <button 
                onClick={() => setSelectedRawData(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 hover:bg-slate-300 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto bg-slate-50/50 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                {Object.entries(selectedRawData)
                  .filter(([k]) => !k.startsWith('calculated_') && k !== 'originalRut')
                  .map(([key, value]) => {
                    const strValue = String(value);
                    if (!strValue || strValue === '0' || strValue === 'null' || strValue === 'undefined') return null;
                    return (
                      <div key={key} className="flex flex-col py-2 border-b border-outline-variant/5">
                        <span className="text-[9px] font-bold text-outline uppercase tracking-wider">{key}</span>
                        <span className="text-xs font-black text-slate-800 break-words mt-1">
                          {typeof value === 'number' && value > 1000 && key !== 'AÑO' ? `$${value.toLocaleString('es-CL')}` : strValue}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
            
            <div className="p-4 border-t border-outline-variant/10 bg-white flex justify-end">
              <button 
                onClick={() => setSelectedRawData(null)}
                className="px-6 py-2 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-full hover:brightness-110 active:scale-95 transition-all"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function HeroField({ label, value, border = true }: { label: string, value: string, border?: boolean }) {
  return (
    <div className={cn("flex justify-between items-center pb-5", border && "border-b border-outline-variant/5")}>
      <span className="text-secondary text-[11px] font-black uppercase tracking-widest opacity-60">{label}</span>
      <span className="text-on-surface font-black text-sm uppercase">{value}</span>
    </div>
  );
}

function BentoCard({ title, icon, value, unit }: { title: string, icon: string, value: string, unit?: string }) {
  return (
    <div className="bg-white rounded-[3rem] p-10 shadow-2xl border border-outline-variant/5 flex flex-col justify-between group overflow-hidden relative transition-all">
      <div>
        <div className="flex justify-between items-start mb-8">
          <h3 className="text-[11px] font-black uppercase tracking-[0.2em] opacity-60">{title}</h3>
          <span className="material-symbols-outlined text-3xl text-primary">{icon}</span>
        </div>
        <div className="flex items-baseline gap-3"><span className="text-5xl font-black tracking-tighter">{value}</span>{unit && <span className="text-[11px] font-black uppercase opacity-60">{unit}</span>}</div>
      </div>
    </div>
  );
}
