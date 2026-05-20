'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';

interface Periodo {
  id: number;
  mes: number;
  anio: number;
  estado: string;
}

export default function ControlAsignacionesPage() {
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [selectedPeriodoId, setSelectedPeriodoId] = useState<number | null>(null);
  const [verificaciones, setVerificaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generando, setGenerando] = useState(false);

  useEffect(() => {
    fetchPeriodos();
  }, []);

  useEffect(() => {
    if (selectedPeriodoId) {
      fetchVerificaciones(selectedPeriodoId);
    }
  }, [selectedPeriodoId]);

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
      // update local state
      setVerificaciones(prev => prev.map(v => v.id === id ? { ...v, estado_verificacion } : v));
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-8 p-4 font-manrope">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-end border-b border-slate-200/20 pb-6"
      >
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Control de Asignaciones</h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-6 h-1 bg-primary rounded-full"></span>
            <p className="text-slate-500 font-bold text-[10px] tracking-[0.2em] uppercase">Auditoría Mensual</p>
          </div>
        </div>

        <div className="flex gap-4 items-center">
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
      </motion.div>

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
                    <p className="text-sm font-black text-slate-800">{v.asignacion?.funcionario?.nombre_completo}</p>
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
    </div>
  );
}
