'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";
import { useRouter } from 'next/navigation';

interface Periodo {
  id: number;
  mes: number;
  anio: number;
  estado: string;
}

export default function ControlAsignacionesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'auditoria' | 'global'>('auditoria');

  // Auditoria State
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [selectedPeriodoId, setSelectedPeriodoId] = useState<number | null>(null);
  const [verificaciones, setVerificaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generando, setGenerando] = useState(false);

  // Global State
  const [todasAsignaciones, setTodasAsignaciones] = useState<any[]>([]);
  const [centros, setCentros] = useState<any[]>([]);
  const [catalogo, setCatalogo] = useState<any[]>([]);
  const [filterCentroId, setFilterCentroId] = useState<string>('');
  const [filterCatalogoId, setFilterCatalogoId] = useState<string>('');
  const [filterEstado, setFilterEstado] = useState<string>('');
  const [loadingGlobal, setLoadingGlobal] = useState(false);

  // Edit State
  const [editingAsig, setEditingAsig] = useState<any>(null);
  const [editFechaInicio, setEditFechaInicio] = useState('');
  const [editFechaTermino, setEditFechaTermino] = useState('');
  const [editNumResolucion, setEditNumResolucion] = useState('');
  const [editFechaResolucion, setEditFechaResolucion] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useEffect(() => {
    fetchPeriodos();
  }, []);

  useEffect(() => {
    if (selectedPeriodoId) {
      fetchVerificaciones(selectedPeriodoId);
    }
  }, [selectedPeriodoId]);

  useEffect(() => {
    if (activeTab === 'global' && todasAsignaciones.length === 0 && !loadingGlobal) {
      fetchGlobalData();
    }
  }, [activeTab]);

  const fetchPeriodos = async () => {
    try {
      const url = process.env.NEXT_PUBLIC_API_URL || 'https://api-remuneracion.apscolab.com';
      const res = await axios.get(`${url}/periodos`);
      setPeriodos(res.data);
      if (res.data.length > 0) {
        setSelectedPeriodoId(res.data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchVerificaciones = async (periodoId: number) => {
    try {
      const url = process.env.NEXT_PUBLIC_API_URL || 'https://api-remuneracion.apscolab.com';
      const res = await axios.get(`${url}/asignaciones/verificacion/${periodoId}`);
      setVerificaciones(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchGlobalData = async () => {
    setLoadingGlobal(true);
    try {
      const url = process.env.NEXT_PUBLIC_API_URL || 'https://api-remuneracion.apscolab.com';
      const [asigRes, centrosRes, catRes] = await Promise.all([
        axios.get(`${url}/asignaciones/todas`),
        axios.get(`${url}/centro-salud`),
        axios.get(`${url}/asignaciones/catalogo`)
      ]);
      setTodasAsignaciones(asigRes.data);
      setCentros(centrosRes.data);
      setCatalogo(catRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingGlobal(false);
    }
  };

  const handleGenerarPlanilla = async () => {
    if (!selectedPeriodoId) return;
    setGenerando(true);
    try {
      const url = process.env.NEXT_PUBLIC_API_URL || 'https://api-remuneracion.apscolab.com';
      await axios.post(`${url}/asignaciones/verificacion/generar/${selectedPeriodoId}`);
      fetchVerificaciones(selectedPeriodoId);
    } catch (error) {
      console.error(error);
      alert('Error al generar la planilla');
    } finally {
      setGenerando(false);
    }
  };

  const handleUpdateEstado = async (id: number, estado_verificacion: string) => {
    try {
      const url = process.env.NEXT_PUBLIC_API_URL || 'https://api-remuneracion.apscolab.com';
      await axios.put(`${url}/asignaciones/verificacion/${id}/estado`, { estado_verificacion });
      setVerificaciones(prev => prev.map(v => v.id === id ? { ...v, estado_verificacion } : v));
    } catch (error) {
      console.error(error);
    }
  };

  const openEditModal = (asig: any) => {
    setEditingAsig(asig);
    setEditFechaInicio(asig.fecha_inicio ? new Date(asig.fecha_inicio).toISOString().split('T')[0] : '');
    setEditFechaTermino(asig.fecha_termino ? new Date(asig.fecha_termino).toISOString().split('T')[0] : '');
    setEditNumResolucion(asig.num_resolucion || '');
    setEditFechaResolucion(asig.fecha_resolucion ? new Date(asig.fecha_resolucion).toISOString().split('T')[0] : '');
  };

  const handleEditSubmit = async () => {
    if (!editingAsig) return;
    setIsSavingEdit(true);
    try {
      const url = process.env.NEXT_PUBLIC_API_URL || 'https://api-remuneracion.apscolab.com';
      await axios.put(`${url}/asignaciones/funcionario/${editingAsig.id}`, {
        fecha_inicio: editFechaInicio,
        fecha_termino: editFechaTermino || null,
        num_resolucion: editNumResolucion || null,
        fecha_resolucion: editFechaResolucion || null,
      });
      alert('Asignación actualizada correctamente');
      setEditingAsig(null);
      fetchGlobalData(); // refresh the list
    } catch (e) {
      console.error(e);
      alert('Error al actualizar asignación');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return dateStr.split('T')[0].split('-').reverse().join('-');
  };

  const filteredAsignaciones = todasAsignaciones.filter(a => {
    if (filterCentroId && a.funcionario?.centro_salud_id?.toString() !== filterCentroId) return false;
    if (filterCatalogoId && a.asignacion_id?.toString() !== filterCatalogoId) return false;
    if (filterEstado && a.estado !== filterEstado) return false;
    return true;
  });

  return (
    <div className="space-y-8 p-4 font-manrope max-w-7xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-slate-200/20 pb-6"
      >
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Gestión de Asignaciones</h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="w-6 h-1 bg-primary rounded-full"></span>
              <p className="text-slate-500 font-bold text-[10px] tracking-[0.2em] uppercase">Control y Auditoría</p>
            </div>
          </div>
        </div>

        <div className="flex gap-8 mt-8 border-b border-outline-variant/10">
          <button 
            onClick={() => setActiveTab('auditoria')}
            className={cn(
              "pb-4 text-[11px] font-black uppercase tracking-[0.2em] transition-all relative",
              activeTab === 'auditoria' ? "text-primary" : "text-outline hover:text-secondary"
            )}
          >
            Auditoría Mensual
            {activeTab === 'auditoria' && <motion.div layoutId="tab-active-asig" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />}
          </button>
          <button 
            onClick={() => setActiveTab('global')}
            className={cn(
              "pb-4 text-[11px] font-black uppercase tracking-[0.2em] transition-all relative",
              activeTab === 'global' ? "text-primary" : "text-outline hover:text-secondary"
            )}
          >
            Vista Global
            {activeTab === 'global' && <motion.div layoutId="tab-active-asig" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />}
          </button>
        </div>
      </motion.div>

      {activeTab === 'auditoria' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="flex justify-end gap-4 items-center">
            <select 
              value={selectedPeriodoId || ''} 
              onChange={(e) => setSelectedPeriodoId(Number(e.target.value))}
              className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm"
            >
              {periodos.map(p => (
                <option key={p.id} value={p.id}>{p.mes} / {p.anio} ({p.estado})</option>
              ))}
            </select>

            <button 
              onClick={handleGenerarPlanilla}
              disabled={generando || !selectedPeriodoId}
              className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-primary transition-all shadow-xl shadow-slate-900/20 disabled:opacity-50"
            >
              {generando ? 'Sincronizando...' : 'Generar Planilla del Mes'}
            </button>
          </div>

          {loading ? (
            <div className="text-center py-20 animate-pulse text-primary font-black uppercase text-xs tracking-widest">
              Cargando Sistema...
            </div>
          ) : verificaciones.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 border-dashed">
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No se ha generado la planilla para este mes.</p>
              <button onClick={handleGenerarPlanilla} className="mt-4 text-primary font-black uppercase text-[10px] underline hover:text-secondary">Haz clic aquí para generarla</button>
            </div>
          ) : (
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                    <th className="px-6 py-4">Funcionario</th>
                    <th className="px-6 py-4">Asignación</th>
                    <th className="px-6 py-4">Proyección</th>
                    <th className="px-6 py-4">Resolución</th>
                    <th className="px-6 py-4 text-center">Estado Auditoría</th>
                  </tr>
                </thead>
                <tbody>
                  {verificaciones.map((v, idx) => (
                    <tr key={v.id} className={`border-b border-slate-100 hover:bg-slate-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'}`}>
                      <td className="px-6 py-4">
                        <button onClick={() => router.push(`/funcionarios/${v.asignacion?.funcionario?.rut}`)} className="text-sm font-black text-slate-800 hover:text-primary transition-colors text-left block">
                          {v.asignacion?.funcionario?.nombre_completo}
                        </button>
                        <p className="text-[10px] text-slate-400 font-bold">{v.asignacion?.funcionario?.rut}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-bold text-slate-700">{v.asignacion?.catalogo?.nombre}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-black text-slate-900">
                          {v.asignacion?.tipo_calculo === 'PORCENTAJE' ? `${v.asignacion.valor}%` : `$${Number(v.asignacion?.valor || 0).toLocaleString('es-CL')}`}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 font-bold">
                        {v.asignacion?.num_resolucion || 'S/N'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-2">
                          <button 
                            onClick={() => handleUpdateEstado(v.id, 'PAGADO')}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${
                              v.estado_verificacion === 'PAGADO' ? 'bg-emerald-500 text-white border-emerald-600 shadow-lg shadow-emerald-500/30' : 'bg-white text-slate-400 border-slate-200 hover:border-emerald-500 hover:text-emerald-500'
                            }`}
                          >
                            PAGADO
                          </button>
                          <button 
                            onClick={() => handleUpdateEstado(v.id, 'NO_PAGADO')}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${
                              v.estado_verificacion === 'NO_PAGADO' ? 'bg-rose-500 text-white border-rose-600 shadow-lg shadow-rose-500/30' : 'bg-white text-slate-400 border-slate-200 hover:border-rose-500 hover:text-rose-500'
                            }`}
                          >
                            NO PAGADO
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      )}

      {activeTab === 'global' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200/50 flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Centro de Salud</label>
              <select 
                value={filterCentroId} 
                onChange={(e) => setFilterCentroId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Todos los Centros</option>
                {centros.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Tipo de Asignación</label>
              <select 
                value={filterCatalogoId} 
                onChange={(e) => setFilterCatalogoId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Todas las Asignaciones</option>
                {catalogo.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Estado</label>
              <select 
                value={filterEstado} 
                onChange={(e) => setFilterEstado(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Todos los Estados</option>
                <option value="ACTIVO">Activas</option>
                <option value="INACTIVO">Inactivas</option>
              </select>
            </div>
          </div>

          {loadingGlobal ? (
            <div className="text-center py-20 animate-pulse text-primary font-black uppercase text-xs tracking-widest">
              Cargando Registros...
            </div>
          ) : filteredAsignaciones.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 border-dashed">
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No se encontraron asignaciones que coincidan con los filtros.</p>
            </div>
          ) : (
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden">
              <div className="max-h-[600px] overflow-y-auto">
                <table className="w-full text-left border-collapse relative">
                  <thead className="sticky top-0 bg-slate-50/90 backdrop-blur-sm z-10">
                    <tr className="border-b border-slate-200 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 shadow-sm">
                      <th className="px-6 py-4">Funcionario / Centro</th>
                      <th className="px-6 py-4">Asignación</th>
                      <th className="px-6 py-4">Monto / Tipo</th>
                      <th className="px-6 py-4">Resolución</th>
                      <th className="px-6 py-4">Período</th>
                      <th className="px-6 py-4 text-center">Estado</th>
                      <th className="px-6 py-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAsignaciones.map((a, idx) => (
                      <tr key={a.id} className={`border-b border-slate-100 hover:bg-slate-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'}`}>
                        <td className="px-6 py-4">
                          <button onClick={() => router.push(`/funcionarios/${a.funcionario?.rut}`)} className="text-sm font-black text-slate-800 hover:text-primary transition-colors text-left block">
                            {a.funcionario?.nombre_completo}
                          </button>
                          <p className="text-[10px] text-slate-500 font-bold mt-1">{a.funcionario?.centro_salud?.nombre || 'Sin Centro'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-xs font-bold text-slate-700">{a.catalogo?.nombre}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-black text-slate-900">
                            {a.tipo_calculo === 'PORCENTAJE' ? `${a.valor}%` : `$${Number(a.valor || 0).toLocaleString('es-CL')}`}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500 font-bold">
                          {a.num_resolucion ? (
                            <>
                              N° {a.num_resolucion}
                              {a.fecha_resolucion && <><br/><span className="text-[10px] text-slate-400 font-normal">({formatDate(a.fecha_resolucion)})</span></>}
                            </>
                          ) : 'S/N'}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Inicio: <span className="text-slate-700">{formatDate(a.fecha_inicio)}</span></p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">Término: <span className="text-slate-700">{a.fecha_termino ? formatDate(a.fecha_termino) : 'Indefinido'}</span></p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${a.estado === 'ACTIVO' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {a.estado}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => openEditModal(a)}
                            className="p-2 text-slate-400 hover:text-primary transition-colors bg-white rounded-lg border border-slate-200 hover:border-primary/50 shadow-sm"
                            title="Editar Asignación"
                          >
                            <span className="material-symbols-outlined text-[16px]">&#xe3c9;</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </motion.div>
      )}
      
      {/* Edit Modal */}
      {editingAsig && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Editar Asignación</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                  {editingAsig.funcionario?.nombre_completo}
                </p>
              </div>
              <button 
                onClick={() => setEditingAsig(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-500 transition-colors"
              >
                <span className="material-symbols-outlined text-lg select-none">&#xe5cd;</span>
              </button>
            </div>

            <div className="p-6 space-y-4 flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-widest">Fecha Inicio</label>
                  <input 
                    type="date" 
                    value={editFechaInicio}
                    onChange={(e) => setEditFechaInicio(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-widest">Fecha Término (Opcional)</label>
                  <input 
                    type="date" 
                    value={editFechaTermino}
                    onChange={(e) => setEditFechaTermino(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-widest">N° Resolución (Opcional)</label>
                  <input 
                    type="text" 
                    value={editNumResolucion}
                    onChange={(e) => setEditNumResolucion(e.target.value)}
                    placeholder="Ej: 1234"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-widest">Fecha Resol. (Opcional)</label>
                  <input 
                    type="date" 
                    value={editFechaResolucion}
                    onChange={(e) => setEditFechaResolucion(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3">
              <button 
                onClick={() => setEditingAsig(null)}
                className="flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleEditSubmit}
                disabled={isSavingEdit || !editFechaInicio}
                className="flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest text-white bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
              >
                {isSavingEdit ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
