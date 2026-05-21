'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

interface CatalogoAsignacion {
  id: number;
  nombre: string;
  estado: string;
}

export default function AsignacionesConfigPage() {
  const [asignaciones, setAsignaciones] = useState<CatalogoAsignacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [nuevaAsignacion, setNuevaAsignacion] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editNombre, setEditNombre] = useState('');

  useEffect(() => {
    fetchAsignaciones();
  }, []);

  const fetchAsignaciones = async () => {
    try {
      const url = process.env.NEXT_PUBLIC_API_URL || 'https://api-remuneracion.apscolab.com';
      const response = await axios.get(`${url}/asignaciones/catalogo`);
      setAsignaciones(response.data);
    } catch (error) {
      console.error('Error fetching asignaciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaAsignacion.trim()) return;
    setAdding(true);
    try {
      const url = process.env.NEXT_PUBLIC_API_URL || 'https://api-remuneracion.apscolab.com';
      await axios.post(`${url}/asignaciones/catalogo`, { nombre: nuevaAsignacion.trim() });
      setNuevaAsignacion('');
      fetchAsignaciones();
    } catch (error) {
      console.error('Error adding asignacion:', error);
      alert('Error al crear asignación');
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (id: number) => {
    try {
      const url = process.env.NEXT_PUBLIC_API_URL || 'https://api-remuneracion.apscolab.com';
      await axios.put(`${url}/asignaciones/catalogo/${id}/toggle`);
      fetchAsignaciones();
    } catch (error) {
      console.error('Error toggling asignacion:', error);
    }
  };

  const startEdit = (asig: CatalogoAsignacion) => {
    setEditingId(asig.id);
    setEditNombre(asig.nombre);
  };

  const handleUpdate = async (id: number) => {
    if (!editNombre.trim()) return;
    try {
      const url = process.env.NEXT_PUBLIC_API_URL || 'https://api-remuneracion.apscolab.com';
      await axios.put(`${url}/asignaciones/catalogo/${id}`, { nombre: editNombre.trim() });
      setEditingId(null);
      fetchAsignaciones();
    } catch (error) {
      console.error('Error updating asignacion:', error);
      alert('Error al actualizar asignación');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar esta asignación?')) return;
    try {
      const url = process.env.NEXT_PUBLIC_API_URL || 'https://api-remuneracion.apscolab.com';
      await axios.delete(`${url}/asignaciones/catalogo/${id}`);
      fetchAsignaciones();
    } catch (error: any) {
      console.error('Error deleting asignacion:', error);
      alert(error.response?.data?.message || 'Error al eliminar asignación. Puede que esté en uso.');
    }
  };

  return (
    <div className="space-y-12 p-2 font-manrope">
      {/* Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-end border-b border-slate-200/20 pb-8"
      >
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Link href="/configuracion" className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors text-slate-500">
              <span className="material-symbols-outlined text-sm">arrow_back</span>
            </Link>
            <div className="flex items-center gap-2">
              <span className="w-8 h-1 bg-primary rounded-full"></span>
              <p className="text-slate-500 font-bold text-[11px] tracking-widest uppercase">Catálogo de Asignaciones</p>
            </div>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Tipos de Asignaciones</h1>
        </div>
      </motion.div>

      <div className="grid grid-cols-12 gap-8">
        {/* Formulario Nueva Asignación */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="col-span-12 lg:col-span-4 bg-white p-8 rounded-[2rem] border border-slate-200/50 shadow-xl shadow-slate-200/40 h-fit"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 rounded-2xl bg-primary/5 text-primary">
              <span className="material-symbols-outlined text-2xl">add_box</span>
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Nueva Asignación</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Registrar en catálogo</p>
            </div>
          </div>

          <form onSubmit={handleAdd} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Nombre de Asignación</label>
              <input 
                type="text" 
                value={nuevaAsignacion}
                onChange={e => setNuevaAsignacion(e.target.value)}
                placeholder="Ej: Artículo 45, Desempeño Difícil"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={adding || !nuevaAsignacion.trim()}
              className="w-full py-3.5 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 flex justify-center items-center gap-2 shadow-lg shadow-primary/20"
            >
              {adding ? <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span> : <span className="material-symbols-outlined text-sm">save</span>}
              Guardar Tipo
            </button>
          </form>
        </motion.div>

        {/* Lista de Asignaciones */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="col-span-12 lg:col-span-8 bg-white p-8 rounded-[2rem] border border-slate-200/50 shadow-xl shadow-slate-200/40"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 rounded-2xl bg-slate-50 text-slate-500">
              <span className="material-symbols-outlined text-2xl">list_alt</span>
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Catálogo Activo</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Asignaciones disponibles para enrolar</p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
          ) : asignaciones.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
              <p className="text-slate-400 font-bold text-sm">No hay asignaciones creadas en el catálogo.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence>
                {asignaciones.map(asig => (
                  <motion.div 
                    key={asig.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className={`p-5 rounded-2xl border flex items-center justify-between transition-all ${asig.estado === 'ACTIVO' ? 'bg-slate-50 border-slate-200' : 'bg-slate-50/50 border-slate-100 opacity-60 grayscale'}`}
                  >
                    {editingId === asig.id ? (
                      <div className="flex-1 mr-4 flex gap-2">
                        <input
                          type="text"
                          value={editNombre}
                          onChange={(e) => setEditNombre(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-900 outline-none focus:border-primary"
                          autoFocus
                        />
                        <button onClick={() => handleUpdate(asig.id)} className="w-8 h-8 flex shrink-0 items-center justify-center bg-primary text-white rounded-lg hover:bg-primary/90">
                          <span className="material-symbols-outlined text-sm">check</span>
                        </button>
                        <button onClick={() => setEditingId(null)} className="w-8 h-8 flex shrink-0 items-center justify-center bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300">
                          <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                      </div>
                    ) : (
                      <>
                        <div>
                          <h4 className="text-sm font-black text-slate-800">{asig.nombre}</h4>
                          <p className="text-[10px] font-black uppercase tracking-widest mt-1" style={{ color: asig.estado === 'ACTIVO' ? '#10b981' : '#ef4444' }}>
                            {asig.estado}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={() => startEdit(asig)} className="text-slate-400 hover:text-primary transition-colors">
                            <span className="material-symbols-outlined text-lg">edit</span>
                          </button>
                          <button onClick={() => handleDelete(asig.id)} className="text-slate-400 hover:text-rose-500 transition-colors">
                            <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
                          <button 
                            onClick={() => handleToggle(asig.id)}
                            className={`w-12 h-6 rounded-full relative p-1 transition-colors ${asig.estado === 'ACTIVO' ? 'bg-emerald-500' : 'bg-slate-300'}`}
                          >
                            <div className={`w-4 h-4 bg-white rounded-full transition-all ${asig.estado === 'ACTIVO' ? 'ml-auto' : 'ml-0'}`}></div>
                          </button>
                        </div>
                      </>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
