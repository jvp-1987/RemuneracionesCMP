'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";
import { HealthCenterLogo } from "@/components/HealthCenterLogo";
import { useAuth } from '@/components/AuthProvider';

// --- Types ---
type EstadoValidacion = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';

interface Transaction {
  id: number;
  funcionario: { rut: string; nombre_completo: string; categoria_aps?: string; nivel_aps?: number };
  programa: { id: number; nombre: string };
  monto_25?: number;
  monto_50?: number;
  cantidad_25?: number;
  cantidad_50?: number;
  monto_calculado?: number;
  monto_descuento?: number;
  minutos_atraso?: number;
  tipo_destino?: string;
  tiempo_descuento?: string;
  estado_25?: EstadoValidacion;
  estado_50?: EstadoValidacion;
  estado?: EstadoValidacion;
  observaciones?: string;
  observaciones_25?: string;
  observaciones_50?: string;
  concept?: string;
  url_respaldo?: string;
}

interface ConsolidadoDetail {
  id: number;
  estado_actual_enum: string;
  vb_control_interno: boolean;
  vb_finanzas: boolean;
  centro_salud: { nombre: string; id: number };
  periodo: { mes: number; anio: number };
  horas_extras: Transaction[];
  viaticos: Transaction[];
  atrasos: Transaction[];
  url_respaldo?: string;
}

export default function ConsolidadoDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<ConsolidadoDetail | null>(null);
  const [activeTab, setActiveTab] = useState<'horas' | 'viaticos' | 'atrasos'>('horas');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const canValidateControl = user?.rol === 'ADMIN' || user?.rol === 'ADMIN_MAESTRO' || user?.rol === 'CONTROL';
  const canValidateFinanzas = user?.rol === 'ADMIN' || user?.rol === 'ADMIN_MAESTRO' || user?.rol === 'FINANZAS';
  const canFinalize = user?.rol === 'ADMIN' || user?.rol === 'ADMIN_MAESTRO';

  const fetchData = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api-remuneracion.apscolab.com';
      const res = await axios.get(`${apiUrl}/consolidados/${id}`);
      setData(res.data);
    } catch (err) {
      console.error('Error fetching detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleUpdateStatus = React.useCallback(async (type: string, transId: number, field: string, newStatus: EstadoValidacion) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api-remuneracion.apscolab.com';
      const endpoint = type === 'horas' ? 'horas-extras' : type === 'viaticos' ? 'viaticos' : 'atrasos';
      
      setData(prev => {
        if (!prev) return null;
        const key = type === 'horas' ? 'horas_extras' : type === 'viaticos' ? 'viaticos' : 'atrasos';
        return {
          ...prev,
          [key]: (prev as any)[key].map((t: any) => t.id === transId ? { ...t, [field]: newStatus } : t)
        };
      });

      await axios.patch(`${apiUrl}/${endpoint}/${transId}`, { [field]: newStatus });
    } catch (err) { 
      console.error('Error updating status:', err);
      fetchData();
    }
  }, [fetchData]);

  const handleUpdateObservation = React.useCallback(async (type: string, transId: number, text: string, subType?: '25' | '50') => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api-remuneracion.apscolab.com';
      const endpoint = type === 'horas' ? 'horas-extras' : type === 'viaticos' ? 'viaticos' : 'atrasos';
      const obsKey = type === 'horas' && subType ? `observaciones_${subType}` : 'observaciones';
      
      setData(prev => {
        if (!prev) return null;
        const key = type === 'horas' ? 'horas_extras' : type === 'viaticos' ? 'viaticos' : 'atrasos';
        return {
          ...prev,
          [key]: (prev as any)[key].map((t: any) => t.id === transId ? { ...t, [obsKey]: text } : t)
        };
      });

      await axios.patch(`${apiUrl}/${endpoint}/${transId}`, { [obsKey]: text });
    } catch (err) { 
      console.error('Error updating observation:', err);
      fetchData();
    }
  }, [fetchData]);

  const handleBulkUpdate = async (status: EstadoValidacion) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api-remuneracion.apscolab.com';
      const endpoint = activeTab === 'horas' ? 'horas-extras' : activeTab === 'viaticos' ? 'viaticos' : 'atrasos';
      const payload = activeTab === 'horas' ? { estado_25: status, estado_50: status } : { estado: status };
      await axios.patch(`${apiUrl}/${endpoint}/bulk/${id}`, payload);
      fetchData();
    } catch (err) { console.error('Error in bulk update:', err); }
  };

  const handleFinalizeConsolidado = async () => {
    if (!data?.vb_control_interno || !data?.vb_finanzas) {
      alert('Se requieren los Vistos Buenos Institucionales antes de finalizar.');
      return;
    }
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api-remuneracion.apscolab.com';
      await axios.patch(`${apiUrl}/consolidados/${id}`, { estado_actual_enum: 'Aprobado' });
      router.push('/consolidados');
    } catch (err) { console.error('Error finalizing:', err); }
  };

  const handleToggleValidation = async (field: 'vb_control_interno' | 'vb_finanzas', value: boolean) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api-remuneracion.apscolab.com';
      await axios.patch(`${apiUrl}/consolidados/${id}`, { [field]: value });
      fetchData();
    } catch (err) { console.error('Error toggling validation:', err); }
  };

  const handleRespaldoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api-remuneracion.apscolab.com';
      await axios.post(`${apiUrl}/consolidados/${id}/respaldo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      fetchData();
      alert('Respaldo adjuntado con éxito');
    } catch (err) {
      console.error('Error uploading respaldo:', err);
      alert('Error al subir el respaldo');
    }
  };

  if (loading) return <div className="p-20 text-center animate-pulse text-primary font-black uppercase tracking-widest text-xs">Sincronizando Validator Pro...</div>;
  if (!data) return <div className="p-20 text-center text-error font-extrabold">ERROR DE CARGA</div>;

  const filteredData = () => {
    let list = activeTab === 'horas' ? data.horas_extras : activeTab === 'viaticos' ? data.viaticos : data.atrasos;
    
    list = list.filter(item => {
      if (activeTab === 'horas') {
        return (Number(item.cantidad_25 || 0) > 0 || Number(item.cantidad_50 || 0) > 0);
      }
      if (activeTab === 'viaticos') {
        return Number(item.monto_calculado || 0) > 0;
      }
      if (activeTab === 'atrasos') {
        return Number(item.minutos_atraso || 0) > 0 || (item.tiempo_descuento && item.tiempo_descuento !== '0 min');
      }
      return true;
    });

    if (!searchQuery) return list;
    return list.filter(t => 
      t.funcionario.nombre_completo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.funcionario.rut.includes(searchQuery)
    );
  };

  const approvedSum = () => {
    if (activeTab === 'horas') return data.horas_extras.reduce((acc, h) => acc + (h.estado_25 === 'APROBADO' ? Number(h.monto_25) : 0) + (h.estado_50 === 'APROBADO' ? Number(h.monto_50) : 0), 0);
    if (activeTab === 'viaticos') return data.viaticos.reduce((acc, v) => acc + (v.estado === 'APROBADO' ? Number(v.monto_calculado) : 0), 0);
    return 0;
  };

  const auditProgress = () => {
    const list = activeTab === 'horas' ? data.horas_extras : activeTab === 'viaticos' ? data.viaticos : data.atrasos;
    if (list.length === 0) return 0;
    const reviewed = list.filter(t => activeTab === 'horas' ? (t.estado_25 !== 'PENDIENTE' && t.estado_50 !== 'PENDIENTE') : t.estado !== 'PENDIENTE').length;
    return Math.round((reviewed / list.length) * 100);
  };

  const getTabStats = () => {
    if (!data) return { 
        horas: { count: 0, complete: false }, 
        viaticos: { count: 0, complete: false }, 
        atrasos: { count: 0, complete: false } 
    };

    const horasList = data.horas_extras.filter(item => Number(item.cantidad_25 || 0) > 0 || Number(item.cantidad_50 || 0) > 0);
    const viaticosList = data.viaticos.filter(item => Number(item.monto_calculado || 0) > 0);
    const atrasosList = data.atrasos.filter(item => Number(item.minutos_atraso || 0) > 0 || (item.tiempo_descuento && item.tiempo_descuento !== '0 min'));

    return {
      horas: { 
        count: horasList.length, 
        complete: horasList.length > 0 && horasList.every(t => t.estado_25 !== 'PENDIENTE' && t.estado_50 !== 'PENDIENTE') 
      },
      viaticos: { 
        count: viaticosList.length, 
        complete: viaticosList.length > 0 && viaticosList.every(t => t.estado !== 'PENDIENTE') 
      },
      atrasos: { 
        count: atrasosList.length, 
        complete: atrasosList.length > 0 && atrasosList.every(t => t.estado !== 'PENDIENTE') 
      },
    };
  };

  const stats = getTabStats();

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-xl flex justify-between items-center w-full px-12 h-24 border-b border-outline-variant/10">
        <div className="flex items-center gap-8">
          <button onClick={() => router.push('/consolidados')} className="p-3 bg-surface-container-low hover:bg-surface-container rounded-2xl transition-all active:scale-95 group overflow-hidden">
            <span className="material-symbols-outlined text-secondary group-hover:text-primary transition-colors select-none" dangerouslySetInnerHTML={{ __html: '&#xe5c4;' }} />
          </button>
          
          <div className="flex items-center gap-6">
            <HealthCenterLogo name={data.centro_salud.nombre} isLarge />
            <div>
              <h2 className="font-headline text-2xl font-black text-primary tracking-tight leading-none uppercase">{data.centro_salud.nombre}</h2>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface mt-1.5 flex items-center gap-2">
                <span className="material-symbols-outlined text-[12px] text-primary select-none" dangerouslySetInnerHTML={{ __html: '&#xe935;' }} />
                {new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(new Date(2026, data.periodo.mes - 1))} {data.periodo.anio}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="relative group w-72">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface text-lg select-none" dangerouslySetInnerHTML={{ __html: '&#xe8b6;' }} />
            <input 
              className="bg-surface-container-low border border-outline rounded-xl pl-11 pr-4 py-2.5 text-xs w-full focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-bold placeholder:text-outline"
              placeholder="Buscar funcionario o RUT..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="h-8 w-[1px] bg-outline-variant/15 mx-2" />
          <div className="flex gap-4">
            <button 
              disabled={!canValidateControl}
              onClick={() => handleToggleValidation('vb_control_interno', !data.vb_control_interno)}
              className={cn(
                "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all shadow-sm",
                data.vb_control_interno ? "bg-primary text-white border-primary shadow-primary/20" : "bg-white border-outline-variant/20 text-outline hover:border-primary/50",
                !canValidateControl && "opacity-40 cursor-not-allowed grayscale"
              )}
              title={!canValidateControl ? "Solo perfil CONTROL puede validar" : ""}
            >
              V°B° CONTROL INTERNO
            </button>
            <button 
              disabled={!canValidateFinanzas}
              onClick={() => handleToggleValidation('vb_finanzas', !data.vb_finanzas)}
              className={cn(
                "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all shadow-sm",
                data.vb_finanzas ? "bg-primary text-white border-primary shadow-primary/20" : "bg-white border-outline-variant/20 text-outline hover:border-primary/50",
                !canValidateFinanzas && "opacity-40 cursor-not-allowed grayscale"
              )}
              title={!canValidateFinanzas ? "Solo perfil FINANZAS puede validar" : ""}
            >
              V°B° FINANZAS
            </button>
            
            <div className="h-8 w-[1px] bg-outline-variant/15 mx-2" />
            
            {data.url_respaldo ? (
              <a 
                href={data.url_respaldo} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-200 transition-all hover:scale-105"
              >
                <span className="material-symbols-outlined text-sm">visibility</span>
                Ver Respaldo
              </a>
            ) : (
              <label className={cn(
                "flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-slate-700 transition-all shadow-lg",
                user?.rol === 'CENTRO_SALUD' || user?.rol === 'ADMIN' ? "" : "opacity-50 pointer-events-none"
              )}>
                <span className="material-symbols-outlined text-sm">attach_file</span>
                Adjuntar Respaldo
                <input type="file" className="hidden" onChange={handleRespaldoUpload} accept=".pdf,.jpg,.jpeg,.png" />
              </label>
            )}
          </div>
        </div>
      </header>

      <section className="p-12 space-y-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="space-y-4">
            <h1 className="text-5xl font-black text-on-surface tracking-tighter uppercase font-headline">Validador Pro</h1>
            <p className="text-secondary font-black text-xs tracking-[0.2em] uppercase">Consolidación de Haberes • Ciclo Mensual {new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(new Date(2026, data.periodo.mes - 1))} {data.periodo.anio}</p>
          </div>
          <div className="w-full md:w-[400px] space-y-4">
            <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-[0.2em] text-on-surface">
              <span>Progreso de Auditoría</span>
              <span className="text-primary">{auditProgress()}% Verificado</span>
            </div>
            <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden border border-outline-variant/5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${auditProgress()}%` }}
                className="h-full bg-primary rounded-full shadow-[0_0_12px_rgba(0,96,103,0.3)]"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2 bg-surface-container-low p-10 rounded-[3rem] border border-outline-variant/10 flex flex-col justify-between group overflow-hidden relative shadow-sm hover:shadow-md transition-shadow">
            <div className="relative z-10">
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-secondary mb-6 block">Impacto Presupuestario Total</span>
              <div className="text-6xl font-black text-primary tracking-tighter">${(approvedSum() * 1.25).toLocaleString('es-CL')}</div>
            </div>
            <div className="mt-8 flex items-center gap-3 relative z-10">
              <span className="material-symbols-outlined text-primary text-lg select-none" style={{ fontVariationSettings: "'FILL' 1" }} dangerouslySetInnerHTML={{ __html: '&#xe8e5;' }} />
              <span className="text-[11px] font-black text-primary uppercase tracking-widest">+12.4% vs Periodo Anterior</span>
            </div>
            <div className="absolute -right-12 -bottom-12 w-48 h-48 flex items-center justify-center overflow-hidden pointer-events-none">
              <span className="material-symbols-outlined text-[160px] opacity-[0.03] text-primary group-hover:scale-110 transition-transform select-none" dangerouslySetInnerHTML={{ __html: '&#xf122;' }} />
            </div>
          </div>
          
          <div className="bg-surface-container-lowest p-10 rounded-[3rem] border border-outline-variant/10 shadow-sm hover:shadow-md transition-all group">
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-secondary mb-6 block">Haberes Pendientes</span>
            <div className="text-4xl font-black text-on-surface tracking-tighter group-hover:text-primary transition-colors">
              {data.horas_extras.filter(t => t.estado_25 === 'PENDIENTE' || t.estado_50 === 'PENDIENTE').length}
            </div>
            <div className="mt-6 text-[11px] text-secondary font-bold uppercase tracking-widest leading-relaxed">Requiere V°B° manual de auditores senior</div>
          </div>

          <div className="bg-error-container/20 p-10 rounded-[3rem] border border-error/10 shadow-sm hover:shadow-error/10 transition-all group">
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-error mb-6 block font-black">Alertas de Riesgo</span>
            <div className="text-4xl font-black text-error tracking-tighter">
              {data.horas_extras.filter(t => Number(t.cantidad_50) > 40).length}
            </div>
            <div className="mt-6 text-[11px] text-error font-black uppercase tracking-widest leading-relaxed">Exceden parámetros críticos establecidos</div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-8 pt-6 border-t border-outline-variant/10">
          <div className="flex gap-3 p-2 bg-surface-container rounded-[2rem] border border-outline-variant/5 shadow-inner">
            {(['horas', 'viaticos', 'atrasos'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-8 py-3.5 text-xs font-black rounded-[1.5rem] tracking-widest uppercase transition-all duration-300 flex items-center gap-3",
                  activeTab === tab 
                    ? "bg-white text-primary shadow-lg shadow-slate-200/50" 
                    : "text-secondary hover:text-primary hover:bg-white/40"
                )}
              >
                {tab === 'horas' ? 'Horas Extras' : tab === 'viaticos' ? 'Viáticos' : 'Atrasos'}
                <span className={cn(
                  "px-2.5 py-1 rounded-lg text-[10px] font-black transition-all",
                  stats[tab].complete 
                    ? "bg-green-500 text-white shadow-lg shadow-green-200" 
                    : activeTab === tab ? "bg-primary/10 text-primary" : "bg-outline-variant/10 text-outline px-1.5"
                )}>
                  {stats[tab].complete ? (
                    <div className="flex items-center gap-1">
                      <span>{stats[tab].count}</span>
                      <span className="material-symbols-outlined text-[12px]" dangerouslySetInnerHTML={{ __html: '&#xe876;' }} />
                    </div>
                  ) : stats[tab].count}
                </span>
              </button>
            ))}
          </div>
          <div className="flex gap-4">
            <button 
              disabled={!canValidateControl && !canValidateFinanzas}
              onClick={() => handleBulkUpdate('APROBADO')}
              className={cn(
                "group flex items-center gap-3 px-8 py-4 text-[11px] font-black bg-white text-primary border border-primary/20 shadow-xl shadow-slate-200/40 rounded-[2rem] hover:bg-primary hover:text-white transition-all uppercase tracking-widest active:scale-95 overflow-hidden",
                (!canValidateControl && !canValidateFinanzas) && "opacity-40 cursor-not-allowed"
              )}
            >
              <span className="material-symbols-outlined text-lg group-hover:rotate-12 transition-transform select-none" dangerouslySetInnerHTML={{ __html: '&#xe877;' }} />
              Certificar Todo el Lote
            </button>
          </div>
        </div>

        <div className="bg-white rounded-[3.5rem] shadow-2xl shadow-slate-200/40 overflow-hidden border border-outline-variant/5">
          <div className="p-10 border-b border-outline-variant/5 flex items-center justify-between bg-surface-container-lowest/30">
            <div className="flex items-center gap-4">
              <div className="w-2 h-8 bg-primary rounded-full" />
              <h3 className="font-black text-on-surface text-xl tracking-tight uppercase font-headline">Matriz de Validación Clínica</h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-y-2">
              <thead>
                <tr className="bg-surface-container-low/50">
                  <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface">Funcionario Clínico</th>
                  <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface">RUT / Clasificación</th>
                  <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface text-center">
                    {activeTab === 'horas' ? 'Horas 25%' : activeTab === 'atrasos' ? 'N/A' : 'Destino'}
                  </th>
                  <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface text-center">
                    {activeTab === 'horas' ? 'Horas 50%' : activeTab === 'atrasos' ? 'Concepto' : 'Estado'}
                  </th>
                  <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface">
                    {activeTab === 'atrasos' ? 'Total Tiempo' : 'Total Validado'}
                  </th>
                  <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5">
                {filteredData().map((item) => (
                  <EmployeeTableRow 
                    key={item.id}
                    item={item}
                    activeTab={activeTab}
                    onUpdateStatus={handleUpdateStatus}
                    expanded={expandedId === item.id}
                    onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    onObs={(t, sub) => handleUpdateObservation(activeTab, item.id, t, sub)}
                    canEdit={canValidateControl || canValidateFinanzas}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <footer className="fixed bottom-0 right-0 left-64 h-20 bg-on-background/95 backdrop-blur-2xl px-12 z-50 flex justify-between items-center shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Auditoría Remuneración Salud CMP</span>
          <span className="text-[9px] font-bold text-outline-variant uppercase tracking-widest mt-1">Estado: {auditProgress()}% Auditado</span>
        </div>
        <div className="flex gap-6">
          <button 
            disabled={!canFinalize || !data.vb_control_interno || !data.vb_finanzas}
            onClick={handleFinalizeConsolidado}
            className={cn(
              "px-12 py-3.5 text-xs font-black rounded-2xl uppercase tracking-[0.15em] transition-all shadow-2xl",
              (canFinalize && data.vb_control_interno && data.vb_finanzas)
                ? "bg-primary text-white hover:brightness-110 active:scale-95 shadow-primary/40" 
                : "bg-surface-container text-white/20 cursor-not-allowed border border-white/5"
            )}
            title={!canFinalize ? "Solo ADMIN puede cerrar el consolidado" : ""}
          >
            EJECUTAR CIERRE FINAL
          </button>
        </div>
      </footer>
    </div>
  );
}

function StatusBadge({ status }: { status?: EstadoValidacion }) {
  const config = {
    PENDIENTE: { bg: 'bg-surface-container', text: 'text-secondary', icon: 'pending', label: 'Pendiente' },
    APROBADO: { bg: 'bg-primary/10', text: 'text-primary', icon: 'check_circle', label: 'Validado' },
    RECHAZADO: { bg: 'bg-error-container', text: 'text-error', icon: 'cancel', label: 'Hallazgo' }
  };
  const active = config[status || 'PENDIENTE'];
  return (
    <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-full transition-all overflow-hidden", active.bg)}>
      <span className={cn("material-symbols-outlined text-[14px] select-none", active.text)} dangerouslySetInnerHTML={{ __html: active.icon === 'pending' ? '&#xef64;' : active.icon === 'check_circle' ? '&#xe86c;' : '&#xe5c9;' }} />
      <span className={cn("text-[10px] font-black uppercase tracking-widest", active.text)}>{active.label}</span>
    </div>
  );
}

const EmployeeTableRow = React.memo(({ 
  item, 
  activeTab, 
  onUpdateStatus,
  expanded,
  onToggle,
  onObs,
  canEdit
}: { 
  item: Transaction, 
  activeTab: 'horas' | 'viaticos' | 'atrasos',
  onUpdateStatus: (type: string, id: number, field: string, s: EstadoValidacion) => void,
  expanded: boolean,
  onToggle: () => void,
  onObs: (t: string, sub?: '25' | '50') => void,
  canEdit: boolean
}) => {
  const [obs25, setObs25] = useState(item.observaciones_25 || '');
  const [obs50, setObs50] = useState(item.observaciones_50 || '');
  const [obs, setObs] = useState(item.observaciones || '');

  const initials = item.funcionario.nombre_completo.split(' ').map(n => n[0]).join('').slice(0, 2);
  const totalAmount = activeTab === 'horas' ? (Number(item.monto_25) + Number(item.monto_50)) : Number(item.monto_calculado || item.monto_descuento || 0);

  return (
    <>
      <tr className={cn("hover:bg-primary/5 transition-all duration-300 group cursor-pointer border-l-4 border-transparent", expanded && "bg-surface-container-low border-l-primary shadow-inner")} onClick={onToggle}>
        <td className="px-10 py-7">
          <div className="flex items-center gap-5">
            <div className="h-12 w-12 rounded-[1rem] bg-secondary-container flex items-center justify-center text-on-secondary-container font-black text-[14px] shadow-sm group-hover:bg-primary group-hover:text-white transition-all">
              {initials}
            </div>
            <div>
              <div className="font-black text-on-surface text-[15px] uppercase tracking-tight leading-none mb-1.5 group-hover:text-primary transition-colors">{item.funcionario.nombre_completo}</div>
              <div className="text-[10px] font-bold text-secondary uppercase tracking-widest leading-none">Personal de Planta • APS</div>
            </div>
          </div>
        </td>
        <td className="px-10 py-7">
          <div className="text-[14px] font-black text-on-surface tracking-tighter mb-1">{item.funcionario.rut}</div>
          <div className="text-[10px] font-black uppercase text-primary tracking-widest bg-primary/5 px-2 py-0.5 rounded-md w-fit">Cat. {item.funcionario.categoria_aps || '-'} • Niv. {item.funcionario.nivel_aps || '-'}</div>
        </td>
        <td className="px-10 py-7 text-center">
          <div className="flex flex-col items-center gap-2">
            {activeTab === 'horas' ? (
              <>
                <div className="text-[16px] font-black text-primary tracking-tighter">{item.cantidad_25 || 0} <span className="text-[10px] text-secondary">HRS</span></div>
                <StatusBadge status={item.estado_25} />
              </>
            ) : activeTab === 'viaticos' ? (
              <div className="text-[12px] font-black text-on-surface uppercase tracking-widest">{item.tipo_destino || 'NACIONAL'}</div>
            ) : <span className="text-outline/30 font-black text-[10px] uppercase">N/A</span>}
          </div>
        </td>
        <td className="px-10 py-7 text-center">
          <div className="flex flex-col items-center gap-2">
             {activeTab === 'horas' ? (
               <>
                <div className="text-[16px] font-black text-primary tracking-tighter">{item.cantidad_50 || 0} <span className="text-[10px] text-secondary">HRS</span></div>
                <StatusBadge status={item.estado_50} />
               </>
             ) : activeTab === 'atrasos' ? (
                <div className="text-[11px] font-black text-secondary tracking-widest uppercase">{item.concept || 'General'}</div>
             ) : (
                <StatusBadge status={item.estado} />
             )}
          </div>
        </td>
        <td className="px-10 py-7 font-black text-[16px] text-on-surface tracking-tighter">
          {activeTab === 'horas' 
            ? `${(Number(item.cantidad_25 || 0) + Number(item.cantidad_50 || 0)).toFixed(1)} HRS`
            : activeTab === 'atrasos' ? item.tiempo_descuento : `$${totalAmount.toLocaleString('es-CL')}`}
        </td>
        <td className="px-10 py-7 text-right">
          <div className="flex justify-end gap-4 items-center">
            {item.url_respaldo && (
              <button 
                onClick={(e) => { e.stopPropagation(); window.open(item.url_respaldo, '_blank'); }}
                className="flex items-center gap-2 text-[10px] font-black text-emerald-600 hover:text-emerald-700 transition-all uppercase tracking-widest overflow-hidden"
              >
                Respaldo
                <span className="material-symbols-outlined text-[18px] select-none" dangerouslySetInnerHTML={{ __html: '&#xe873;' }} />
              </button>
            )}
            <div className="w-6 h-6 flex items-center justify-center overflow-hidden">
              <span className={cn("material-symbols-outlined text-outline group-hover:text-primary transition-all select-none", expanded && "rotate-180")} dangerouslySetInnerHTML={{ __html: '&#xe5cf;' }} />
            </div>
          </div>
        </td>
      </tr>
      
      <AnimatePresence>
        {expanded && (
          <tr>
            <td colSpan={6} className="px-10 py-0">
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="my-10 p-12 bg-surface-container-low border border-outline-variant/10 rounded-[3rem] shadow-2xl space-y-12 relative">
                  {activeTab === 'horas' ? (
                    <div className="grid grid-cols-2 gap-16 relative z-10">
                      <div className="space-y-8">
                        <div className="flex items-center justify-between pb-4 border-b border-outline-variant/5">
                          <div>
                            <h4 className="text-[11px] font-black text-outline uppercase tracking-[0.2em]">Tramo Diurno (25%)</h4>
                          </div>
                          <span className="font-manrope font-black text-primary text-4xl tracking-tighter">{item.cantidad_25 || 0} <span className="text-xl">HRS</span></span>
                        </div>
                        <div className="space-y-4">
                          <textarea 
                            disabled={!canEdit}
                            className="w-full bg-surface-container border border-outline-variant/5 rounded-3xl text-sm px-8 py-6 placeholder:text-outline/40 text-on-surface focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold min-h-[120px]" 
                            placeholder="Ingrese hallazgos..."
                            value={obs25}
                            onChange={(e) => setObs25(e.target.value)}
                            onBlur={() => onObs(obs25, '25')}
                          />
                        </div>
                        {canEdit && (
                          <div className="flex gap-4">
                            <button onClick={() => onUpdateStatus('horas', item.id, 'estado_25', 'RECHAZADO')} className={cn("flex-1 py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all", item.estado_25 === 'RECHAZADO' ? "bg-error text-white shadow-xl shadow-error/20" : "bg-white border border-error/30 text-error hover:bg-error-container/20")}>Hallazgo</button>
                            <button onClick={() => onUpdateStatus('horas', item.id, 'estado_25', 'APROBADO')} className={cn("flex-1 py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg", item.estado_25 === 'APROBADO' ? "bg-primary text-white shadow-primary/20" : "bg-primary/5 text-primary border border-primary/20 hover:bg-primary/10")}>Validar</button>
                          </div>
                        )}
                      </div>
                      <div className="space-y-8">
                        <div className="flex items-center justify-between pb-4 border-b border-outline-variant/5">
                          <div>
                            <h4 className="text-[11px] font-black text-outline uppercase tracking-[0.2em]">Tramo Nocturno (50%)</h4>
                          </div>
                          <span className="font-manrope font-black text-primary text-4xl tracking-tighter">{item.cantidad_50 || 0} <span className="text-xl">HRS</span></span>
                        </div>
                        <div className="space-y-4">
                          <textarea 
                            disabled={!canEdit}
                            className="w-full bg-surface-container border border-outline-variant/5 rounded-3xl text-sm px-8 py-6 placeholder:text-outline/40 text-on-surface focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold min-h-[120px]" 
                            placeholder="Ingrese hallazgos..."
                            value={obs50}
                            onChange={(e) => setObs50(e.target.value)}
                            onBlur={() => onObs(obs50, '50')}
                          />
                        </div>
                        {canEdit && (
                          <div className="flex gap-4">
                            <button onClick={() => onUpdateStatus('horas', item.id, 'estado_50', 'RECHAZADO')} className={cn("flex-1 py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all", item.estado_50 === 'RECHAZADO' ? "bg-error text-white shadow-xl shadow-error/20" : "bg-white border border-error/30 text-error hover:bg-error-container/20")}>Hallazgo</button>
                            <button onClick={() => onUpdateStatus('horas', item.id, 'estado_50', 'APROBADO')} className={cn("flex-1 py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg", item.estado_50 === 'APROBADO' ? "bg-primary text-white shadow-primary/20" : "bg-primary/5 text-primary border border-primary/20 hover:bg-primary/10")}>Validar</button>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-10 relative z-10 max-w-4xl mx-auto">
                        <textarea 
                          disabled={!canEdit}
                          className="w-full bg-surface-container border border-outline-variant/5 rounded-3xl text-sm px-8 py-6 placeholder:text-outline/40 text-on-surface focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold min-h-[120px]" 
                          placeholder="Notas de auditoría..."
                          value={obs}
                          onChange={(e) => setObs(e.target.value)}
                          onBlur={() => onObs(obs)}
                        />
                        {canEdit && (activeTab === 'viaticos' || activeTab === 'atrasos') && (
                          <div className="flex gap-6 pt-4 pb-8">
                            <button onClick={() => onUpdateStatus(activeTab, item.id, 'estado', 'RECHAZADO')} className={cn("flex-1 py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg", item.estado === 'RECHAZADO' ? "bg-error text-white" : "bg-white border border-error/30 text-error hover:bg-error-container/20")}>Hallazgo</button>
                            <button onClick={() => onUpdateStatus(activeTab, item.id, 'estado', 'APROBADO')} className={cn("flex-1 py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-xl shadow-primary/20", item.estado === 'APROBADO' ? "bg-primary text-white" : "bg-primary/5 text-primary border border-primary/20 hover:bg-primary/10")}>Validar</button>
                          </div>
                        )}
                    </div>
                  )}
                </div>
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  );
});
