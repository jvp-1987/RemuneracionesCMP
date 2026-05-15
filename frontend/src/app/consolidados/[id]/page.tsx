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
  funcionario: { 
    rut: string; 
    nombre_completo: string; 
    categoria_aps?: string; 
    nivel_aps?: number;
    centro_salud?: { nombre: string };
  };
  programa: { id: number; nombre: string };
  monto_25?: number;
  monto_50?: number;
  cantidad_25?: number;
  cantidad_50?: number;
  monto_calculado?: number;
  monto_descuento?: number;
  minutos?: number;
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
  // New fields for Procedimientos and Turnos
  total_procedimientos?: number;
  cant_turnos_habiles?: number;
  cant_turnos_inhabiles?: number;
  valor_habil?: number;
  valor_inhabil?: number;
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
  procedimientos: Transaction[];
  turnos_urgencia: Transaction[];
  url_respaldo?: string;
}

export default function ConsolidadoDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<ConsolidadoDetail | null>(null);
  const [activeTab, setActiveTab] = useState<'horas' | 'viaticos' | 'atrasos' | 'procedimientos' | 'turnos'>('horas');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addSearchQuery, setAddSearchQuery] = useState('');
  const [addSearchResults, setAddSearchResults] = useState<any[]>([]);
  const [selectedFuncionario, setSelectedFuncionario] = useState<any>(null);
  const [programas, setProgramas] = useState<any[]>([]);
  const [isSavingNew, setIsSavingNew] = useState(false);

  const canValidateControl = user?.rol === 'ADMIN' || user?.rol === 'ADMIN_MAESTRO' || user?.rol === 'CONTROL';
  const canValidateFinanzas = user?.rol === 'ADMIN' || user?.rol === 'ADMIN_MAESTRO' || user?.rol === 'FINANZAS';
  const canFinalize = user?.rol === 'ADMIN' || user?.rol === 'ADMIN_MAESTRO';
  
  // A record is locked for CENTRO_SALUD if Control Interno already gave V°B°
  const isLocked = data?.vb_control_interno && user?.rol === 'CENTRO_SALUD';

  const fetchData = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api-remuneracion.apscolab.com';
      const res = await axios.get(`${apiUrl}/consolidados/${id}`);
      const consolidadoData = res.data;

      // Security check: If CENTRO_SALUD, must match their assigned center
      if (user?.rol === 'CENTRO_SALUD' && user.centro_salud_id && consolidadoData.centro_salud.id !== user.centro_salud_id) {
        console.warn('Unauthorized access to consolidado of another center');
        router.push('/consolidados');
        return;
      }

      setData(consolidadoData);
    } catch (err) {
      console.error('Error fetching detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchData();
  }, [id, user]);

  useEffect(() => {
    const searchFunc = async () => {
      if (addSearchQuery.length < 2) {
        setAddSearchResults([]);
        return;
      }
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api-remuneracion.apscolab.com';
        const res = await axios.get(`${apiUrl}/funcionarios/search?q=${addSearchQuery}`);
        setAddSearchResults(res.data);
      } catch (err) {
        console.error('Error searching funcionarios:', err);
      }
    };
    const delay = setTimeout(searchFunc, 300);
    return () => clearTimeout(delay);
  }, [addSearchQuery]);

  useEffect(() => {
    const fetchProgramas = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api-remuneracion.apscolab.com';
        const res = await axios.get(`${apiUrl}/programas`);
        setProgramas(res.data);
      } catch (err) {
        console.error('Error fetching programas:', err);
      }
    };
    fetchProgramas();
  }, []);

  const handleSaveEdit = async (updatedFields: any) => {
    if (!editingRecord) return;
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api-remuneracion.apscolab.com';
      const type = activeTab;
      const endpoint = type === 'horas' ? 'horas-extras' : type === 'viaticos' ? 'viaticos' : type === 'atrasos' ? 'atrasos' : type === 'procedimientos' ? 'procedimientos' : 'turnos-urgencia';
      const transId = editingRecord.id;

      await axios.patch(`${apiUrl}/${endpoint}/${transId}`, updatedFields);
      
      setData(prev => {
        if (!prev) return null;
        const key = type === 'horas' ? 'horas_extras' : type === 'viaticos' ? 'viaticos' : type === 'atrasos' ? 'atrasos' : type === 'procedimientos' ? 'procedimientos' : 'turnos_urgencia';
        return {
          ...prev,
          [key]: (prev as any)[key].map((t: any) => t.id === transId ? { ...t, ...updatedFields } : t)
        };
      });
      
      setIsEditModalOpen(false);
      setEditingRecord(null);
    } catch (err) {
      console.error('Error saving edit:', err);
      alert('Error al guardar los cambios');
    }
  };

  const handleUpdateStatus = React.useCallback(async (type: string, transId: number, field: string, newStatus: EstadoValidacion) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api-remuneracion.apscolab.com';
      const endpoint = type === 'horas' ? 'horas-extras' : type === 'viaticos' ? 'viaticos' : type === 'atrasos' ? 'atrasos' : type === 'procedimientos' ? 'procedimientos' : 'turnos-urgencia';
      
      setData(prev => {
        if (!prev) return null;
        const key = type === 'horas' ? 'horas_extras' : type === 'viaticos' ? 'viaticos' : type === 'atrasos' ? 'atrasos' : type === 'procedimientos' ? 'procedimientos' : 'turnos_urgencia';
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
      const endpoint = type === 'horas' ? 'horas-extras' : type === 'viaticos' ? 'viaticos' : type === 'atrasos' ? 'atrasos' : type === 'procedimientos' ? 'procedimientos' : 'turnos-urgencia';
      const obsKey = type === 'horas' && subType ? `observaciones_${subType}` : 'observaciones';
      
      setData(prev => {
        if (!prev) return null;
        const key = type === 'horas' ? 'horas_extras' : type === 'viaticos' ? 'viaticos' : type === 'atrasos' ? 'atrasos' : type === 'procedimientos' ? 'procedimientos' : 'turnos_urgencia';
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
      const endpoint = activeTab === 'horas' ? 'horas-extras' : activeTab === 'viaticos' ? 'viaticos' : activeTab === 'atrasos' ? 'atrasos' : activeTab === 'procedimientos' ? 'procedimientos' : 'turnos-urgencia';
      const payload = activeTab === 'horas' ? { estado_25: status, estado_50: status } : { estado: status };
      await axios.patch(`${apiUrl}/${endpoint}/bulk/${id}`, payload);
      fetchData();
    } catch (err) { console.error('Error in bulk update:', err); }
  };

  const handleDeleteRecord = async (item: any) => {
    const confirmDelete = window.confirm(`¿Está seguro que desea eliminar este registro de ${item.funcionario.nombre_completo}? Esta acción quedará registrada en la auditoría.`);
    if (!confirmDelete) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api-remuneracion.apscolab.com';
      const type = activeTab;
      const endpoint = type === 'horas' ? 'horas-extras' : type === 'viaticos' ? 'viaticos' : type === 'atrasos' ? 'atrasos' : type === 'procedimientos' ? 'procedimientos' : 'turnos-urgencia';
      const transId = item.id;

      await axios.delete(`${apiUrl}/${endpoint}/${transId}`);
      
      setData(prev => {
        if (!prev) return null;
        const key = type === 'horas' ? 'horas_extras' : type === 'viaticos' ? 'viaticos' : type === 'atrasos' ? 'atrasos' : type === 'procedimientos' ? 'procedimientos' : 'turnos_urgencia';
        return {
          ...prev,
          [key]: (prev as any)[key].filter((t: any) => t.id !== transId)
        };
      });
      
    } catch (err) {
      console.error('Error deleting record:', err);
      alert('Error al eliminar el registro: ' + (err as any).response?.data?.message || 'Error desconocido');
    }
  };

  const handleCreateRecord = async (fields: any) => {
    if (!selectedFuncionario) return;
    setIsSavingNew(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api-remuneracion.apscolab.com';
      const type = activeTab;
      const endpoint = type === 'horas' ? 'horas-extras' : type === 'viaticos' ? 'viaticos' : type === 'atrasos' ? 'atrasos' : type === 'procedimientos' ? 'procedimientos' : 'turnos-urgencia';
      
      const payload = {
        ...fields,
        consolidado_id: Number(id),
        funcionario_rut: selectedFuncionario.rut,
        fecha_inicio: data?.periodo ? `2026-${String(data.periodo.mes).padStart(2, '0')}-01` : '2026-01-01',
        fecha_termino: data?.periodo ? `2026-${String(data.periodo.mes).padStart(2, '0')}-28` : '2026-01-28',
      };

      await axios.post(`${apiUrl}/${endpoint}`, payload);
      await fetchData();
      
      setIsAddModalOpen(false);
      setSelectedFuncionario(null);
      setAddSearchQuery('');
    } catch (err) {
      console.error('Error creating record:', err);
      alert('Error al crear el registro: ' + ((err as any).response?.data?.message || 'Error desconocido'));
    } finally {
      setIsSavingNew(false);
    }
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
    let list = activeTab === 'horas' ? data.horas_extras : 
               activeTab === 'viaticos' ? data.viaticos : 
               activeTab === 'atrasos' ? data.atrasos :
               activeTab === 'procedimientos' ? data.procedimientos :
               data.turnos_urgencia;
    
    list = list.filter(item => {
      if (activeTab === 'horas') return (Number(item.cantidad_25 || 0) > 0 || Number(item.cantidad_50 || 0) > 0);
      if (activeTab === 'viaticos') return Number(item.monto_calculado || 0) > 0;
      if (activeTab === 'atrasos') return Number(item.minutos || 0) > 0 || (item.tiempo_descuento && item.tiempo_descuento !== '0 min');
      if (activeTab === 'procedimientos') return Number(item.total_procedimientos || 0) > 0;
      if (activeTab === 'turnos') return (Number(item.cant_turnos_habiles || 0) > 0 || Number(item.cant_turnos_inhabiles || 0) > 0);
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
    if (activeTab === 'procedimientos') return data.procedimientos.reduce((acc, p) => acc + (p.estado === 'APROBADO' ? Number(p.monto_calculado) : 0), 0);
    if (activeTab === 'turnos') return data.turnos_urgencia.reduce((acc, t) => acc + (t.estado === 'APROBADO' ? (Number(t.cant_turnos_habiles || 0) * Number(t.valor_habil || 0) + Number(t.cant_turnos_inhabiles || 0) * Number(t.valor_inhabil || 0)) : 0), 0);
    return 0;
  };

  const auditProgress = () => {
    const list = activeTab === 'horas' ? data.horas_extras : 
                 activeTab === 'viaticos' ? data.viaticos : 
                 activeTab === 'atrasos' ? data.atrasos :
                 activeTab === 'procedimientos' ? data.procedimientos :
                 data.turnos_urgencia;
    if (list.length === 0) return 0;
    const reviewed = list.filter(t => activeTab === 'horas' ? (t.estado_25 !== 'PENDIENTE' && t.estado_50 !== 'PENDIENTE') : t.estado !== 'PENDIENTE').length;
    return Math.round((reviewed / list.length) * 100);
  };

  const getTabStats = () => {
    if (!data) return { 
        horas: { count: 0, complete: false }, 
        viaticos: { count: 0, complete: false }, 
        atrasos: { count: 0, complete: false },
        procedimientos: { count: 0, complete: false },
        turnos: { count: 0, complete: false } 
    };

    const horasList = data.horas_extras.filter(item => Number(item.cantidad_25 || 0) > 0 || Number(item.cantidad_50 || 0) > 0);
    const viaticosList = data.viaticos.filter(item => Number(item.monto_calculado || 0) > 0);
    const atrasosList = data.atrasos.filter(item => Number(item.minutos || 0) > 0 || (item.tiempo_descuento && item.tiempo_descuento !== '0 min'));
    const procedimientosList = data.procedimientos.filter(item => Number(item.total_procedimientos || 0) > 0);
    const turnosList = data.turnos_urgencia.filter(item => Number(item.cant_turnos_habiles || 0) > 0 || Number(item.cant_turnos_inhabiles || 0) > 0);

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
      procedimientos: { 
        count: procedimientosList.length, 
        complete: procedimientosList.length > 0 && procedimientosList.every(t => t.estado !== 'PENDIENTE') 
      },
      turnos: { 
        count: turnosList.length, 
        complete: turnosList.length > 0 && turnosList.every(t => t.estado !== 'PENDIENTE') 
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
          <div className="flex gap-3 p-2 bg-surface-container rounded-[2rem] border border-outline-variant/5 shadow-inner overflow-x-auto no-scrollbar">
            {(['horas', 'viaticos', 'atrasos', 'procedimientos', 'turnos'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-8 py-3.5 text-xs font-black rounded-[1.5rem] tracking-widest uppercase transition-all duration-300 flex items-center gap-3 whitespace-nowrap",
                  activeTab === tab 
                    ? "bg-white text-primary shadow-lg shadow-slate-200/50" 
                    : "text-secondary hover:text-primary hover:bg-white/40"
                )}
              >
                {tab === 'horas' ? 'Horas Extras' : tab === 'viaticos' ? 'Viáticos' : tab === 'atrasos' ? 'Atrasos' : tab === 'procedimientos' ? 'Procedimientos' : 'Turnos'}
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

            <button 
              disabled={isLocked}
              onClick={() => {
                setSelectedFuncionario(null);
                setAddSearchQuery('');
                setIsAddModalOpen(true);
              }}
              className={cn(
                "group flex items-center gap-3 px-8 py-4 text-[11px] font-black bg-primary text-white shadow-xl shadow-primary/30 rounded-[2rem] hover:brightness-110 transition-all uppercase tracking-widest active:scale-95",
                isLocked && "opacity-40 cursor-not-allowed"
              )}
            >
              <span className="material-symbols-outlined text-lg group-hover:rotate-90 transition-transform select-none" dangerouslySetInnerHTML={{ __html: '&#xe145;' }} />
              Agregar Registro
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
                    {activeTab === 'horas' ? 'Horas 25%' : activeTab === 'atrasos' ? 'N/A' : activeTab === 'viaticos' ? 'Destino' : activeTab === 'procedimientos' ? 'Cantidad' : 'Hábiles'}
                  </th>
                  <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface text-center">
                    {activeTab === 'horas' ? 'Horas 50%' : activeTab === 'atrasos' ? 'Concepto' : activeTab === 'viaticos' ? 'Estado' : activeTab === 'procedimientos' ? 'Estado' : 'Inhábiles'}
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
                    onEdit={() => {
                      setEditingRecord(item);
                      setIsEditModalOpen(true);
                    }}
                    onDelete={() => handleDeleteRecord(item)}
                    canEdit={((canValidateControl || canValidateFinanzas) || user?.rol === 'CENTRO_SALUD') && !isLocked}
                    canAudit={canValidateControl || canValidateFinanzas}
                    isLocked={!!isLocked}
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

      <AnimatePresence>
        {isEditModalOpen && editingRecord && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsEditModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[3.5rem] shadow-2xl overflow-hidden border border-outline-variant/10"
            >
              <div className="p-12">
                <div className="flex justify-between items-start mb-10">
                  <div>
                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-2 block">Modificación de Registro</span>
                    <h3 className="text-2xl font-black text-on-surface tracking-tight uppercase">{editingRecord.funcionario.nombre_completo}</h3>
                  </div>
                  <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-surface-container rounded-full transition-all">
                    <span className="material-symbols-outlined text-outline">close</span>
                  </button>
                </div>

                <div className="space-y-8">
                  {activeTab === 'horas' && (
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-secondary ml-2">Horas 25%</label>
                        <input 
                          type="number"
                          defaultValue={editingRecord.cantidad_25}
                          id="edit_cantidad_25"
                          className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-secondary ml-2">Horas 50%</label>
                        <input 
                          type="number"
                          defaultValue={editingRecord.cantidad_50}
                          id="edit_cantidad_50"
                          className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                      </div>
                    </div>
                  )}

                  {activeTab === 'procedimientos' && (
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-secondary ml-2">Total Procedimientos</label>
                      <input 
                        type="number"
                        defaultValue={editingRecord.total_procedimientos}
                        id="edit_total_procedimientos"
                        className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                  )}

                  {activeTab === 'turnos' && (
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-secondary ml-2">Cant. Hábiles</label>
                        <input 
                          type="number"
                          defaultValue={editingRecord.cant_turnos_habiles}
                          id="edit_cant_turnos_habiles"
                          className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-secondary ml-2">Cant. Inhábiles</label>
                        <input 
                          type="number"
                          defaultValue={editingRecord.cant_turnos_inhabiles}
                          id="edit_cant_turnos_inhabiles"
                          className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                      </div>
                    </div>
                  )}

                  {(activeTab === 'viaticos' || activeTab === 'atrasos') && (
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-secondary ml-2">
                        {activeTab === 'viaticos' ? 'Monto Calculado ($)' : 'Minutos de Atraso'}
                      </label>
                      <input 
                        type="number"
                        defaultValue={activeTab === 'viaticos' ? editingRecord.monto_calculado : editingRecord.minutos}
                        id={activeTab === 'viaticos' ? 'edit_monto' : 'edit_minutos'}
                        className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                  )}

                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-secondary ml-2">Justificación / Concepto</label>
                    <textarea 
                      defaultValue={editingRecord.concepto || editingRecord.concept || editingRecord.justificacion}
                      id="edit_concepto"
                      className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all min-h-[100px]"
                    />
                  </div>
                </div>

                <div className="flex gap-4 mt-12">
                  <button 
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1 py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest text-secondary border border-outline-variant/20 hover:bg-surface-container transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={() => {
                      const payload: any = {};
                      if (activeTab === 'horas') {
                        payload.cantidad_25 = Number((document.getElementById('edit_cantidad_25') as HTMLInputElement).value);
                        payload.cantidad_50 = Number((document.getElementById('edit_cantidad_50') as HTMLInputElement).value);
                      } else if (activeTab === 'viaticos') {
                        payload.monto_calculado = Number((document.getElementById('edit_monto') as HTMLInputElement).value);
                      } else if (activeTab === 'atrasos') {
                        payload.minutos = Number((document.getElementById('edit_minutos') as HTMLInputElement).value);
                      } else if (activeTab === 'procedimientos') {
                        payload.total_procedimientos = Number((document.getElementById('edit_total_procedimientos') as HTMLInputElement).value);
                      } else if (activeTab === 'turnos') {
                        payload.cant_turnos_habiles = Number((document.getElementById('edit_cant_turnos_habiles') as HTMLInputElement).value);
                        payload.cant_turnos_inhabiles = Number((document.getElementById('edit_cant_turnos_inhabiles') as HTMLInputElement).value);
                      }
                      payload.concepto = (document.getElementById('edit_concepto') as HTMLTextAreaElement).value;
                      handleSaveEdit(payload);
                    }}
                    className="flex-1 py-5 bg-primary text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-primary/30 hover:brightness-110 active:scale-95 transition-all"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[3.5rem] shadow-2xl overflow-hidden border border-outline-variant/10"
            >
              <div className="p-12">
                <div className="flex justify-between items-start mb-10">
                  <div>
                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-2 block">Nuevo Registro en Consolidado</span>
                    <h3 className="text-2xl font-black text-on-surface tracking-tight uppercase">
                      Agregar a {activeTab === "horas" ? "Horas Extras" : activeTab === "viaticos" ? "Viáticos" : activeTab === "atrasos" ? "Atrasos" : activeTab === "procedimientos" ? "Procedimientos" : "Turnos"}
                    </h3>
                  </div>
                  <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-surface-container rounded-full transition-all">
                    <span className="material-symbols-outlined text-outline">close</span>
                  </button>
                </div>

                {!selectedFuncionario ? (
                  <div className="space-y-6">
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">search</span>
                      <input 
                        className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder="Buscar funcionario por nombre o RUT..."
                        value={addSearchQuery}
                        onChange={(e) => setAddSearchQuery(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {addSearchResults.map(f => (
                        <button 
                          key={f.rut}
                          onClick={() => setSelectedFuncionario(f)}
                          className="w-full text-left p-4 hover:bg-primary/5 rounded-2xl transition-all border border-transparent hover:border-primary/10 flex items-center gap-4 group"
                        >
                          <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-xs font-black text-outline group-hover:bg-primary group-hover:text-white transition-all">
                            {f.nombre_completo.split(" ").map((n)=>n[0]).join("").slice(0,2)}
                          </div>
                          <div>
                            <p className="text-sm font-black text-on-surface group-hover:text-primary transition-colors">{f.nombre_completo}</p>
                            <p className="text-[10px] font-bold text-outline uppercase tracking-widest">{f.rut} • {f.centro_salud?.nombre}</p>
                          </div>
                        </button>
                      ))}
                      {addSearchQuery.length >= 2 && addSearchResults.length === 0 && (
                        <p className="text-center py-8 text-xs font-bold text-outline italic">No se encontraron funcionarios</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl border border-primary/10">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-xs font-black text-white">
                          {selectedFuncionario.nombre_completo.split(" ").map((n)=>n[0]).join("").slice(0,2)}
                        </div>
                        <div>
                          <p className="text-sm font-black text-primary">{selectedFuncionario.nombre_completo}</p>
                          <p className="text-[10px] font-bold text-primary/60 uppercase tracking-widest">{selectedFuncionario.rut}</p>
                        </div>
                      </div>
                      <button onClick={() => setSelectedFuncionario(null)} className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">Cambiar</button>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      {activeTab === "horas" && (
                        <>
                          <div className="col-span-2 space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-secondary ml-2">Programa</label>
                            <select id="add_programa_id" className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all">
                              {programas.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                            </select>
                          </div>
                          <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-secondary ml-2">Horas 25%</label>
                            <input type="number" id="add_cantidad_25" defaultValue="0" className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all" />
                          </div>
                          <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-secondary ml-2">Horas 50%</label>
                            <input type="number" id="add_cantidad_50" defaultValue="0" className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all" />
                          </div>
                        </>
                      )}

                      {activeTab === "procedimientos" && (
                        <div className="col-span-2 space-y-3">
                          <label className="text-[10px] font-black uppercase tracking-widest text-secondary ml-2">Total Procedimientos</label>
                          <input type="number" id="add_total_procedimientos" defaultValue="0" className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all" />
                        </div>
                      )}

                      {activeTab === "turnos" && (
                        <>
                          <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-secondary ml-2">Cant. Hábiles</label>
                            <input type="number" id="add_cant_turnos_habiles" defaultValue="0" className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all" />
                          </div>
                          <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-secondary ml-2">Cant. Inhábiles</label>
                            <input type="number" id="add_cant_turnos_inhabiles" defaultValue="0" className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all" />
                          </div>
                        </>
                      )}

                      {(activeTab === "viaticos" || activeTab === "atrasos") && (
                        <div className="col-span-2 space-y-3">
                          <label className="text-[10px] font-black uppercase tracking-widest text-secondary ml-2">
                            {activeTab === "viaticos" ? "Monto Calculado ($)" : "Minutos de Atraso"}
                          </label>
                          <input type="number" id={activeTab === "viaticos" ? "add_monto" : "add_minutos"} defaultValue="0" className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all" />
                        </div>
                      )}

                      <div className="col-span-2 space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-secondary ml-2">Justificación / Concepto</label>
                        <textarea id="add_concepto" className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all min-h-[80px]" placeholder="Ingrese motivo o detalle..." />
                      </div>
                    </div>

                    <div className="flex gap-4 mt-4">
                      <button 
                        onClick={() => setSelectedFuncionario(null)}
                        className="flex-1 py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest text-secondary border border-outline-variant/20 hover:bg-surface-container transition-all"
                      >
                        Atrás
                      </button>
                      <button 
                        disabled={isSavingNew}
                        onClick={() => {
                          const payload: any = {};
                          if (activeTab === "horas") {
                            payload.programa_id = Number(document.getElementById("add_programa_id").value);
                            payload.cantidad_25 = Number(document.getElementById("add_cantidad_25").value);
                            payload.cantidad_50 = Number(document.getElementById("add_cantidad_50").value);
                          } else if (activeTab === "viaticos") {
                            payload.monto_calculado = Number(document.getElementById("add_monto").value);
                          } else if (activeTab === "atrasos") {
                            payload.minutos = Number(document.getElementById("add_minutos").value);
                          } else if (activeTab === "procedimientos") {
                            payload.total_procedimientos = Number(document.getElementById("add_total_procedimientos").value);
                          } else if (activeTab === "turnos") {
                            payload.cant_turnos_habiles = Number(document.getElementById("add_cant_turnos_habiles").value);
                            payload.cant_turnos_inhabiles = Number(document.getElementById("add_cant_turnos_inhabiles").value);
                          }
                          const conceptoValue = document.getElementById("add_concepto").value;
                          if (activeTab === "horas") {
                            payload.observaciones_25 = conceptoValue;
                            payload.observaciones_50 = conceptoValue;
                          } else {
                            payload.observaciones = conceptoValue;
                          }
                          handleCreateRecord(payload);
                        }}
                        className="flex-[2] py-5 bg-primary text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-primary/30 hover:brightness-110 active:scale-95 transition-all"
                      >
                        {isSavingNew ? "Guardando..." : "Crear Registro"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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
  onEdit,
  onDelete,
  canEdit,
  canAudit,
  isLocked
}: { 
  item: Transaction, 
  activeTab: 'horas' | 'viaticos' | 'atrasos' | 'procedimientos' | 'turnos',
  onUpdateStatus: (type: string, id: number, field: string, s: EstadoValidacion) => void,
  expanded: boolean,
  onToggle: () => void,
  onObs: (t: string, sub?: '25' | '50') => void,
  onEdit: () => void,
  onDelete: () => void,
  canEdit: boolean,
  canAudit: boolean,
  isLocked: boolean
}) => {
  const [obs25, setObs25] = useState(item.observaciones_25 || '');
  const [obs50, setObs50] = useState(item.observaciones_50 || '');
  const [obs, setObs] = useState(item.observaciones || '');

  const initials = item.funcionario.nombre_completo.split(' ').map(n => n[0]).join('').slice(0, 2);
  const totalAmount = activeTab === 'horas' ? (Number(item.monto_25) + Number(item.monto_50)) : 
                      activeTab === 'viaticos' ? Number(item.monto_calculado || 0) :
                      activeTab === 'procedimientos' ? Number(item.monto_calculado || 0) :
                      activeTab === 'turnos' ? (Number(item.cant_turnos_habiles || 0) * Number(item.valor_habil || 0) + Number(item.cant_turnos_inhabiles || 0) * Number(item.valor_inhabil || 0)) :
                      0;

  return (
    <>
      <tr className={cn("hover:bg-primary/5 transition-all duration-300 group cursor-pointer border-l-4 border-transparent", expanded && "bg-surface-container-low border-l-primary shadow-inner")}>
        <td className="px-10 py-7" onClick={onToggle}>
          <div className="flex items-center gap-5">
            <div className="h-12 w-12 rounded-[1rem] bg-secondary-container flex items-center justify-center text-on-secondary-container font-black text-[14px] shadow-sm group-hover:bg-primary group-hover:text-white transition-all">
              {initials}
            </div>
            <div>
              <div className="font-black text-on-surface text-[15px] uppercase tracking-tight leading-none mb-1.5 group-hover:text-primary transition-colors">{item.funcionario.nombre_completo}</div>
              <div className="text-[10px] font-bold text-secondary uppercase tracking-widest leading-none">
                {item.funcionario.centro_salud?.nombre || 'Personal de Planta • APS'}
              </div>
            </div>
          </div>
        </td>
        <td className="px-10 py-7" onClick={onToggle}>
          <div className="text-[14px] font-black text-on-surface tracking-tighter mb-1">{item.funcionario.rut}</div>
          <div className="text-[10px] font-black uppercase text-primary tracking-widest bg-primary/5 px-2 py-0.5 rounded-md w-fit">Cat. {item.funcionario.categoria_aps || '-'} • Niv. {item.funcionario.nivel_aps || '-'}</div>
        </td>
        <td className="px-10 py-7 text-center" onClick={onToggle}>
          <div className="flex flex-col items-center gap-2">
            {activeTab === 'horas' ? (
              <>
                <div className="text-[16px] font-black text-primary tracking-tighter">{item.cantidad_25 || 0} <span className="text-[10px] text-secondary">HRS</span></div>
                <StatusBadge status={item.estado_25} />
              </>
            ) : activeTab === 'viaticos' ? (
              <div className="text-[12px] font-black text-on-surface uppercase tracking-widest">{item.tipo_destino || 'NACIONAL'}</div>
            ) : activeTab === 'procedimientos' ? (
              <div className="text-[16px] font-black text-primary tracking-tighter">{item.total_procedimientos || 0} <span className="text-[10px] text-secondary">PROCS</span></div>
            ) : activeTab === 'turnos' ? (
              <div className="text-[16px] font-black text-primary tracking-tighter">{item.cant_turnos_habiles || 0} <span className="text-[10px] text-secondary">HAB</span></div>
            ) : <span className="text-outline/30 font-black text-[10px] uppercase">N/A</span>}
          </div>
        </td>
        <td className="px-10 py-7 text-center" onClick={onToggle}>
          <div className="flex flex-col items-center gap-2">
             {activeTab === 'horas' ? (
               <>
                <div className="text-[16px] font-black text-primary tracking-tighter">{item.cantidad_50 || 0} <span className="text-[10px] text-secondary">HRS</span></div>
                <StatusBadge status={item.estado_50} />
               </>
             ) : activeTab === 'viaticos' ? (
               <StatusBadge status={item.estado} />
             ) : activeTab === 'procedimientos' ? (
               <StatusBadge status={item.estado} />
             ) : activeTab === 'turnos' ? (
               <>
                <div className="text-[16px] font-black text-primary tracking-tighter">{item.cant_turnos_inhabiles || 0} <span className="text-[10px] text-secondary">INH</span></div>
                <StatusBadge status={item.estado} />
               </>
             ) : (
                <div className="text-[11px] font-black text-secondary tracking-widest uppercase">{item.concept || 'General'}</div>
             )}
          </div>
        </td>
        <td className="px-10 py-7 font-black text-[16px] text-on-surface tracking-tighter" onClick={onToggle}>
          {activeTab === 'atrasos' ? item.tiempo_descuento : `$${totalAmount.toLocaleString('es-CL')}`}
        </td>
        <td className="px-10 py-7 text-right">
          <div className="flex items-center justify-end gap-3">
            {item.url_respaldo && (
              <button 
                onClick={(e) => { e.stopPropagation(); window.open(item.url_respaldo, '_blank'); }}
                className="flex items-center gap-2 text-[10px] font-black text-emerald-600 hover:text-emerald-700 transition-all uppercase tracking-widest"
              >
                <span className="material-symbols-outlined text-[18px] select-none" dangerouslySetInnerHTML={{ __html: '&#xe873;' }} />
              </button>
            )}
            
            <button 
              disabled={isLocked}
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className={cn(
                "p-2.5 rounded-xl transition-all shadow-sm",
                isLocked 
                  ? "bg-surface-container text-outline/20 cursor-not-allowed border border-outline-variant/5" 
                  : "bg-white border border-error/20 text-error hover:bg-error/5 hover:border-error/40 active:scale-95"
              )}
              title={isLocked ? "Eliminación bloqueada" : "Eliminar registro"}
            >
              <span className="material-symbols-outlined text-sm select-none" dangerouslySetInnerHTML={{ __html: '&#xe872;' }} />
            </button>

            <button 
              disabled={isLocked}
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm",
                isLocked 
                  ? "bg-surface-container text-outline/40 cursor-not-allowed border border-outline-variant/10" 
                  : "bg-white border border-outline-variant/20 text-primary hover:bg-primary/5 hover:border-primary/40 active:scale-95"
              )}
              title={isLocked ? "Edición bloqueada por Control Interno" : "Editar registro"}
            >
              <span className="material-symbols-outlined text-sm select-none" dangerouslySetInnerHTML={{ __html: isLocked ? '&#xf033;' : '&#xe3c9;' }} />
              {isLocked ? 'Bloqueado' : 'Editar'}
            </button>

            <button 
              onClick={(e) => { e.stopPropagation(); onToggle(); }}
              className="p-2.5 bg-surface-container-low hover:bg-primary/10 hover:text-primary rounded-xl transition-all"
            >
              <span className={cn("material-symbols-outlined transition-transform select-none", expanded && "rotate-180")} dangerouslySetInnerHTML={{ __html: '&#xe5cf;' }} />
            </button>
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
                            disabled={!canAudit}
                            className="w-full bg-surface-container border border-outline-variant/5 rounded-3xl text-sm px-8 py-6 placeholder:text-outline/40 text-on-surface focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold min-h-[120px]" 
                            placeholder={canAudit ? "Ingrese hallazgos..." : "Notas de auditoría (Solo lectura)"}
                            value={obs25}
                            onChange={(e) => setObs25(e.target.value)}
                            onBlur={() => onObs(obs25, '25')}
                          />
                        </div>
                        {canAudit && (
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
                            disabled={!canAudit}
                            className="w-full bg-surface-container border border-outline-variant/5 rounded-3xl text-sm px-8 py-6 placeholder:text-outline/40 text-on-surface focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold min-h-[120px]" 
                            placeholder={canAudit ? "Ingrese hallazgos..." : "Notas de auditoría (Solo lectura)"}
                            value={obs50}
                            onChange={(e) => setObs50(e.target.value)}
                            onBlur={() => onObs(obs50, '50')}
                          />
                        </div>
                        {canAudit && (
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
                          disabled={!canAudit}
                          className="w-full bg-surface-container border border-outline-variant/5 rounded-3xl text-sm px-8 py-6 placeholder:text-outline/40 text-on-surface focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold min-h-[120px]" 
                          placeholder={canAudit ? "Notas de auditoría..." : "Notas de auditoría (Solo lectura)"}
                          value={obs}
                          onChange={(e) => setObs(e.target.value)}
                          onBlur={() => onObs(obs)}
                        />
                        {canAudit && (activeTab === 'viaticos' || activeTab === 'atrasos' || activeTab === 'procedimientos' || activeTab === 'turnos') && (
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
