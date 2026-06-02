'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { cn } from "@/lib/utils";
import { 
  Plus, 
  Search, 
  UserPlus, 
  X, 
  Save, 
  Building2, 
  ShieldCheck, 
  Stethoscope, 
  Clock,
  ChevronRight,
  RefreshCcw,
  CheckCircle2
} from 'lucide-react';

interface Funcionario {
  rut: string;
  nombre_completo: string;
  profesion_enum: string;
  categoria_aps: string;
  nivel_aps: number;
  jornada_horas: number;
  centro_salud?: {
    id: number;
    nombre: string;
  };
}

export default function FuncionariosPage() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [centros, setCentros] = useState<{id: number, nombre: string}[]>([]);
  const [selectedEstablishment, setSelectedEstablishment] = useState<string | null>(null);
  const [assigningRut, setAssigningRut] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showInactivos, setShowInactivos] = useState(false);
  const router = useRouter();

  // Form State
  const [formData, setFormData] = useState({
    rut: '',
    nombre_completo: '',
    profesion_enum: '',
    categoria_aps: 'A',
    nivel_aps: 1,
    jornada_horas: 44,
    centro_salud_id: 1
  });

  const normalizeRut = (rut: string): string => {
    if (!rut) return '';
    const clean = rut.replace(/\./g, '').replace(/-/g, '').trim().toUpperCase();
    if (clean.length < 2) return clean;
    const dv = clean.slice(-1);
    const body = clean.slice(0, -1);
    return `${body}-${dv}`;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const url = `${process.env.NEXT_PUBLIC_API_URL || ''}/funcionarios${showInactivos ? '?inactivos=true' : ''}`;
      const [resFuncs, resCentros] = await Promise.all([
        axios.get(url),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL || ''}/centro-salud`).catch(() => ({ data: [] }))
      ]);
      setFuncionarios(resFuncs.data);
      setCentros(resCentros.data);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [showInactivos]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    // Normalizar RUT antes de enviar
    const normalizedData = {
      ...formData,
      rut: normalizeRut(formData.rut)
    };

    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL || ''}/funcionarios`, normalizedData);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setIsModalOpen(false);
        fetchData();
        setFormData({
          rut: '',
          nombre_completo: '',
          profesion_enum: '',
          categoria_aps: 'A',
          nivel_aps: 1,
          jornada_horas: 44,
          centro_salud_id: 1
        });
      }, 1500);
    } catch (err: any) {
      console.error('Error creating funcionario:', err);
      const status = err.response?.status;
      const message = err.response?.data?.message || '';
      
      if (status === 409 || message.includes('Unique constraint')) {
        alert('Ese RUT ya se encuentra registrado en el sistema.');
      } else if (status === 400) {
        alert('Datos inválidos. Por favor verifique el RUT y los campos obligatorios.');
      } else if (!status) {
        alert('No se pudo conectar con el servidor. Verifique que el servicio esté activo.');
      } else {
        alert('Error inesperado al crear el registro. Reintente más tarde.');
      }
    } finally {
      setSaving(false);
    }
  };

  const filtered = funcionarios.filter(f => 
    f.nombre_completo.toLowerCase().includes(search.toLowerCase()) ||
    f.rut.toLowerCase().includes(search.toLowerCase())
  );

  const groupedFuncionarios = filtered.reduce((acc, f) => {
    const centerName = f.centro_salud?.nombre || 'Sin Establecimiento Asignado';
    if (!acc[centerName]) {
      acc[centerName] = [];
    }
    acc[centerName].push(f);
    return acc;
  }, {} as Record<string, Funcionario[]>);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);
      await axios.post('/funcionarios/importar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('¡Importación completada con éxito!');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al importar el archivo.');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignCenter = async (rut: string, centroId: number) => {
    if (!centroId) return;
    try {
      setAssigningRut(rut);
      await axios.patch(`${process.env.NEXT_PUBLIC_API_URL || ''}/funcionarios/${rut}`, {
        centro_salud_id: centroId
      });
      await fetchData();
    } catch (error) {
      console.error('Error asignando centro:', error);
      alert('Error al asignar establecimiento');
    } finally {
      setAssigningRut(null);
    }
  };

  const funcsToRender = selectedEstablishment 
    ? (groupedFuncionarios[selectedEstablishment] || []) 
    : filtered;

  funcsToRender.sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo));


  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc] p-12 pb-32">
      
      {/* Modal - Nuevo Funcionario */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !saving && setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-10 pb-6 flex justify-between items-center group">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-3xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                    <UserPlus className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-2">Incorporar Profesional</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                       Personal APS <ChevronRight className="w-3 h-3" /> FichaMaestra_v2.0
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all border border-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleSubmit} className="p-10 pt-0 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Identidad */}
                  <div className="col-span-2 space-y-6 bg-slate-50/50 p-8 rounded-[2rem] border border-slate-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">RUT Institucional</label>
                        <div className="relative group">
                          <ShieldCheck className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
                          <input 
                            required
                            type="text" 
                            placeholder="12.345.678-k"
                            className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all shadow-sm"
                            value={formData.rut}
                            onChange={(e) => setFormData({...formData, rut: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Nombre Completo</label>
                        <div className="relative group">
                          <RefreshCcw className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-emerald-500 transition-all" />
                          <input 
                            required
                            type="text" 
                            placeholder="Ej: Juan Pérez"
                            className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all shadow-sm"
                            value={formData.nombre_completo}
                            onChange={(e) => setFormData({...formData, nombre_completo: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Clasificación */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 flex items-center gap-2">
                      <Stethoscope className="w-3 h-3" /> Profesión / Estalafón
                    </label>
                    <select 
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all appearance-none cursor-pointer"
                      value={formData.profesion_enum}
                      onChange={(e) => setFormData({...formData, profesion_enum: e.target.value})}
                    >
                      <option value="">Seleccione profesión...</option>
                      <option value="MEDICO">MÉDICO</option>
                      <option value="ENFERMERA">ENFERMERO/A</option>
                      <option value="KINESIOLOGO">KINESIÓLOGO/A</option>
                      <option value="TENS">TENS</option>
                      <option value="ADMINISTRATIVO">ADMINISTRATIVO/A</option>
                      <option value="AUXILIAR">AUXILIAR</option>
                    </select>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 flex items-center gap-2">
                      <Building2 className="w-3 h-3" /> Centro de Salud
                    </label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all appearance-none cursor-pointer"
                      value={formData.centro_salud_id}
                      onChange={(e) => setFormData({...formData, centro_salud_id: parseInt(e.target.value)})}
                    >
                      {centros.map(c => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                      ))}
                    </select>
                  </div>

                  {/* Detalles Técnicos */}
                  <div className="col-span-2 grid grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center block">Categoría</label>
                      <select 
                        className="w-full bg-slate-50/50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-black text-primary text-center outline-none"
                        value={formData.categoria_aps}
                        onChange={(e) => setFormData({...formData, categoria_aps: e.target.value})}
                      >
                        {['A','B','C','D','E','F'].map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center block">Nivel</label>
                      <select 
                        className="w-full bg-slate-50/50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-black text-primary text-center outline-none"
                        value={formData.nivel_aps}
                        onChange={(e) => setFormData({...formData, nivel_aps: parseInt(e.target.value)})}
                      >
                        {Array.from({length: 15}, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center block flex items-center justify-center gap-2">
                         <Clock className="w-3 h-3 text-slate-300" /> Jornada
                       </label>
                       <input 
                         type="number" 
                         className="w-full bg-slate-50/50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-black text-center outline-none"
                         value={formData.jornada_horas}
                         onChange={(e) => setFormData({...formData, jornada_horas: parseInt(e.target.value)})}
                       />
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-6">
                  <button 
                    disabled={saving || success}
                    type="submit"
                    className={cn(
                      "w-full py-6 rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] flex items-center justify-center gap-4 transition-all shadow-xl",
                      success ? "bg-emerald-500 text-white shadow-emerald-500/20" : "bg-slate-900 text-white hover:bg-emerald-600 shadow-slate-900/10 active:scale-95"
                    )}
                  >
                    {saving ? (
                      <RefreshCcw className="w-5 h-5 animate-spin" />
                    ) : success ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <Save className="w-5 h-5" />
                    )}
                    {success ? "Registro Exitoso" : saving ? "Guardando en Maestro..." : "Incorporar al Maestro"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12">
        <div>
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white shadow-sm border border-slate-100 mb-4"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Gestión de Talento Humano</span>
          </motion.div>
          <h2 className="text-5xl lg:text-6xl font-black text-slate-900 leading-[0.9] tracking-tighter">
            Maestro de <span className="text-primary">Funcionarios</span>
          </h2>
          <p className="mt-4 text-xs font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
            Base Descentralizada <ChevronRight className="w-4 h-4" /> <span className="text-primary">{funcionarios.length}</span> Registros
          </p>
        </div>
        <div className="flex items-center gap-4">
          <input 
            type="file" 
            id="excel-upload" 
            className="hidden" 
            accept=".xlsx, .xls"
            onChange={handleFileUpload}
          />
          <label 
            htmlFor="excel-upload"
            className="px-8 py-4 rounded-2xl bg-white border-2 border-primary/20 text-primary font-black hover:bg-primary/5 active:scale-95 transition-all flex items-center gap-3 shadow-xl text-[11px] uppercase tracking-widest cursor-pointer group"
          >
            <span className="material-symbols-outlined text-lg group-hover:rotate-12 transition-transform">upload_file</span>
            Importar Maestro
          </label>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-8 py-4 rounded-2xl bg-primary text-white font-black hover:brightness-110 active:scale-95 transition-all flex items-center gap-3 shadow-2xl shadow-primary/20 text-[11px] uppercase tracking-widest group"
          >
            <span className="material-symbols-outlined text-lg group-hover:rotate-12 transition-transform">person_add</span>
            Incorporar Nuevo
          </button>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row gap-6 items-center justify-between mb-6 bg-white p-4 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="relative flex-1 group w-full">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5 group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Buscar por nombre clínico, RUT o identificación..."
            className="w-full pl-16 pr-8 py-5 bg-slate-50 border-none rounded-[2rem] focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all text-sm font-bold text-slate-700 placeholder:text-slate-300"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 shrink-0 px-4">
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Inactivos</span>
          <button 
            onClick={() => setShowInactivos(!showInactivos)}
            className={cn(
              "w-12 h-6 rounded-full p-1 transition-all flex items-center shadow-inner",
              showInactivos ? "bg-primary justify-end" : "bg-slate-200 justify-start"
            )}
          >
            <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
          </button>
        </div>
      </div>

      {/* Establecimientos Banner */}
      <div className="mb-10 flex gap-3 overflow-x-auto pb-6 snap-x relative z-10 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
        <button
          onClick={() => setSelectedEstablishment(null)}
          className={cn(
            "shrink-0 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all snap-start shadow-sm border",
            selectedEstablishment === null 
              ? "bg-primary text-white border-primary shadow-primary/20" 
              : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
          )}
        >
          Todos ({filtered.length})
        </button>
        {Object.keys(groupedFuncionarios).sort().map(est => (
          <button
            key={est}
            onClick={() => setSelectedEstablishment(est)}
            className={cn(
              "shrink-0 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all snap-start shadow-sm border flex items-center gap-2",
              selectedEstablishment === est 
                ? "bg-primary text-white border-primary shadow-primary/20" 
                : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
            )}
          >
            <Building2 className="w-4 h-4" />
            {est} <span className={selectedEstablishment === est ? "text-white/80" : "text-slate-400"}>({groupedFuncionarios[est].length})</span>
          </button>
        ))}
      </div>

      {/* High-Density Registry Table */}
      <div className="bg-white rounded-[3.5rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)] border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-12 py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Información Profesional</th>
                <th className="px-12 py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] text-center">Clasificación APS</th>
                <th className="px-12 py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] text-center">Contrato</th>
                <th className="px-12 py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Estatus / Profesión</th>
                <th className="px-12 py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] text-right">Ficha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                [1,2,3,4,5].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-12 py-12">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-100 rounded-2xl" />
                        <div className="space-y-2 flex-1">
                          <div className="h-4 bg-slate-100 rounded-full w-[40%]" />
                          <div className="h-2 bg-slate-100 rounded-full w-[20%]" />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : funcsToRender.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-12 py-48 text-center bg-slate-50/20">
                    <div className="max-w-xs mx-auto">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                        <Search className="w-8 h-8" />
                      </div>
                      <p className="font-black text-slate-300 uppercase tracking-widest text-[11px] italic">
                         No se encontraron registros en la vista actual
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                funcsToRender.map((f) => (
                  <tr 
                    key={f.rut}
                    onClick={() => router.push(`/funcionarios/${f.rut}`)}
                    className="hover:bg-slate-50 transition-all group/row cursor-pointer border-b border-slate-50 last:border-0"
                  >
                    <td className="px-12 py-8">
                      <div className="flex items-center gap-6">
                        <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center border border-slate-100 shadow-sm group-hover/row:bg-primary group-hover/row:border-primary transition-all overflow-hidden relative">
                           <img 
                              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${f.rut}`} 
                              className="w-full h-full object-cover scale-150 grayscale group-hover/row:grayscale-0 transition-all opacity-20 group-hover/row:opacity-100" 
                              alt={f.nombre_completo}
                           />
                        </div>
                        <div>
                          <p className="font-black text-lg text-slate-800 tracking-tight leading-none mb-2 group-hover/row:text-primary transition-colors uppercase">{f.nombre_completo}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] opacity-60">ID: {f.rut} • {f.centro_salud?.nombre || 'SIN ESTABLECIMIENTO'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-12 py-8">
                      <div className="flex justify-center items-center gap-2">
                        <span className="px-5 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest group-hover/row:bg-primary transition-colors">
                          Cat. {f.categoria_aps || '?'}
                        </span>
                        <span className="px-5 py-2 rounded-xl bg-slate-100 text-slate-500 text-[10px] font-black border border-slate-200 uppercase tracking-widest">
                          Niv. {f.nivel_aps || '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-12 py-8 text-center text-slate-700 font-black">
                      <div className="flex items-center justify-center gap-2">
                         <Clock className="w-4 h-4 text-slate-300" />
                         <span className="text-sm tracking-tighter">{f.jornada_horas || 44} HRS</span>
                      </div>
                    </td>
                    <td className="px-12 py-8 text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] bg-slate-50 px-4 py-2 border border-slate-100 rounded-xl group-hover/row:bg-white transition-all">
                          {(() => {
                            switch (f.categoria_aps?.toUpperCase()) {
                              case 'A': return 'Médicos, Químicos y Dentistas';
                              case 'B': return 'Otros profesionales';
                              case 'C': return 'Técnicos de nivel superior';
                              case 'D': return 'Técnicos de Salud';
                              case 'E': return 'Administrativos de Salud';
                              case 'F': return 'Auxiliares de servicios de Salud';
                              default: return f.profesion_enum || 'Sin Asignar';
                            }
                          })()}
                        </span>
                        {!f.centro_salud && (
                          <select 
                            className="text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-xl px-3 py-2 outline-none cursor-pointer hover:bg-emerald-100 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => handleAssignCenter(f.rut, parseInt(e.target.value))}
                            disabled={assigningRut === f.rut}
                          >
                            <option value="">{assigningRut === f.rut ? 'Asignando...' : 'Asignar Centro'}</option>
                            {centros.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                          </select>
                        )}
                      </div>
                    </td>
                    <td className="px-12 py-8 text-right">
                      <button className="p-4 bg-white border border-slate-100 rounded-2xl text-slate-300 group-hover/row:text-primary group-hover/row:border-primary transition-all shadow-sm active:scale-95">
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
