'use client';

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";
import { 
  Search,
  Save,
  Plus,
  Trash2,
  Clock,
  Car,
  AlertTriangle,
  RefreshCcw,
  CheckCircle2,
  Stethoscope,
  Activity
} from 'lucide-react';

type TabType = 'fondos_presupuestarios' | 'viaticos' | 'atrasos' | 'programas_turno' | 'programas_he';

interface RowData {
  id: string;
  rut: string;
  nombre: string;
  categoria_aps: string;
  nivel_aps: string;
  fecha_inicio: string;
  fecha_termino: string;
  observaciones: string;
  
  // HE Presupuestaria y Prog. HE
  cantidad_25: string;
  cantidad_50: string;
  programa_nombre: string; 

  // Viáticos
  tipo_destino: 'DENTRO COMUNA' | 'FUERA COMUNA';
  monto: string;

  // Atrasos
  tiempo: string;

  // Programas Turno
  cant_habil: string;
  valor_habil: string;
  cant_inhabil: string;
  valor_inhabil: string;
}

const PROGRAMAS_TURNO_LIST = [
  "PROG. SUR CHOSHUENCO",
  "PROG. SUR NELTUME",
  "PROG. PIREHUEICO",
  "PROG. SUR COÑARIPE",
  "PROG. SAPU VERANO COÑARIPE",
  "PROG. SUR LIQUIÑE",
  "PR. RES. CIRUGÍA MENOR"
];

const PROGRAMAS_HE_LIST = [
  "ATENCIÓN INTEGRAL AL DESARROLLO INFANTOADOLESCENTE (TEA)",
  "CONTINUIDAD DE CUIDADOS PREVENTIVOS Y DE TRATAMIENTOS EN APS",
  "ESPACIOS AMIGABLES PARA ADOLESCENTES",
  "ESB - AT. ODONTOLÓGICA DE MORBILIDAD",
  "ESB - AT. INTEGRAL",
  "ESB - AT. RESOLUTIVIDAD",
  "IMÁGENES DIAGNÓSTICAS EN ATENCIÓN PRIMARIA DE SALUD",
  "MODELO DE ATENCIÓN INTEGRAL DE SALUD FAMILIAR Y COMUNITARIA EN ATENCIÓN PRIMARIA (MAISF)",
  "REHABILITACIÓN INTEGRAL EN LA RED DE SALUD",
  "SALUD MENTAL Y BIENESTAR PSICOSOCIAL",
  "SALUD RESPIRATORIA - VACUNACIÓN",
  "SALUD RESPIRATORIA - CAMPAÑA INVIERNO",
  "SERVICIO DE ATENCIÓN PRIMARIA DE URGENCIA DE ALTA RESOLUTIVIDAD (SAR)"
];

export default function IngresoPage() {
  const [activeTab, setActiveTab] = useState<TabType>('fondos_presupuestarios');
  const [rows, setRows] = useState<RowData[]>([]);
  const [loading, setLoading] = useState(false);
  const [centroId, setCentroId] = useState('1'); 
  const [periodoId, setPeriodoId] = useState('1'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (rows.length === 0) addRow();
  }, [activeTab]);

  const addRow = () => {
    setRows(prev => [...prev, {
      id: Math.random().toString(36).substring(7),
      rut: '',
      nombre: '',
      categoria_aps: '',
      nivel_aps: '',
      fecha_inicio: new Date().toISOString().split('T')[0],
      fecha_termino: new Date().toISOString().split('T')[0],
      observaciones: '',
      cantidad_25: '',
      cantidad_50: '',
      programa_nombre: '',
      tipo_destino: 'DENTRO COMUNA',
      monto: '7000',
      tiempo: '',
      cant_habil: '0',
      valor_habil: '0',
      cant_inhabil: '0',
      valor_inhabil: '0'
    }]);
  };

  const removeRow = (id: string) => {
    setRows(prev => prev.filter(r => r.id !== id));
    if (rows.length === 1) addRow();
  };

  const updateRow = (id: string, field: keyof RowData, value: string) => {
    setRows(prev => prev.map(r => {
      if (r.id === id) {
        const updated = { ...r, [field]: value };
        if (field === 'tipo_destino' && activeTab === 'viaticos') {
          updated.monto = value === 'DENTRO COMUNA' ? '7000' : '9000';
        }
        // Auto select first program if not selected when switching to program tabs
        if (!updated.programa_nombre) {
          if (activeTab === 'programas_turno') updated.programa_nombre = PROGRAMAS_TURNO_LIST[0];
          if (activeTab === 'programas_he') updated.programa_nombre = PROGRAMAS_HE_LIST[0];
        }
        return updated;
      }
      return r;
    }));
  };

  useEffect(() => {
    const fetchSearch = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }
      try {
        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/funcionarios/search?q=${searchQuery}`);
        setSearchResults(res.data);
      } catch (e) {
        console.error(e);
      }
    };
    const delay = setTimeout(fetchSearch, 300);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  const handleSelectFuncionario = (rut: string, nombre: string, cat: string, niv: string) => {
    if (activeRowId) {
      setRows(prev => prev.map(r => r.id === activeRowId ? { ...r, rut, nombre, categoria_aps: cat, nivel_aps: niv } : r));
    }
    setSearchQuery('');
    setSearchResults([]);
    setActiveRowId(null);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload = {
        centro_salud_id: centroId,
        periodo_id: periodoId,
        tipo: activeTab,
        transacciones: rows.filter(r => r.rut),
      };

      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/ingresos/manual`, payload);
      
      setShowSuccess(true);
      setRows([]);
      addRow();
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving records:', error);
      alert('Hubo un error al guardar los registros.');
    } finally {
      setLoading(false);
    }
  };

  const getRowTotal = (r: RowData) => {
    if (activeTab === 'programas_turno') {
      return (Number(r.cant_habil) * Number(r.valor_habil)) + (Number(r.cant_inhabil) * Number(r.valor_inhabil));
    }
    return 0;
  };

  return (
    <div className="flex flex-col min-h-screen bg-surface p-12 pb-32 relative">
      {/* Search Overlay */}
      {activeRowId && (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center p-4">
          <div ref={searchRef} className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl relative">
            <h3 className="font-black text-on-surface uppercase tracking-widest text-sm mb-4">Buscar Funcionario Clínico</h3>
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-outline w-5 h-5" />
              <input 
                autoFocus
                type="text"
                className="w-full bg-surface-container rounded-xl pl-12 pr-4 py-4 font-bold text-on-surface focus:ring-4 focus:ring-primary/20 outline-none transition-all text-lg"
                placeholder="Ingrese RUT o Nombre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
              {searchResults.map(f => (
                <div 
                  key={f.rut} 
                  onClick={() => handleSelectFuncionario(f.rut, f.nombre_completo, f.categoria_aps, f.nivel_aps?.toString())}
                  className="flex justify-between items-center p-4 hover:bg-primary/5 rounded-2xl cursor-pointer group transition-colors border border-transparent hover:border-primary/20"
                >
                  <div>
                    <p className="font-black text-on-surface group-hover:text-primary transition-colors">{f.nombre_completo}</p>
                    <p className="text-xs font-bold text-outline">{f.rut}</p>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-1 rounded-lg">
                    {f.categoria_aps}{f.nivel_aps ? `-${f.nivel_aps}` : ''}
                  </span>
                </div>
              ))}
              {searchQuery.length >= 2 && searchResults.length === 0 && (
                <p className="text-center text-outline font-bold italic py-8">No se encontraron funcionarios</p>
              )}
            </div>
            <button 
              onClick={() => setActiveRowId(null)}
              className="absolute top-4 right-4 text-outline hover:text-error transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Main Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-4xl font-black text-primary font-headline tracking-tighter uppercase mb-2">Editor de Novedades</h2>
          <p className="text-xs font-black text-secondary uppercase tracking-[0.3em] opacity-60">Matriz de Ingreso Descentralizado</p>
        </div>
        <div className="flex gap-4">
          <select 
            value={centroId} 
            onChange={(e) => setCentroId(e.target.value)}
            className="bg-white border border-outline-variant/20 rounded-xl px-4 py-3 text-sm font-black text-on-surface uppercase tracking-widest shadow-sm focus:ring-2 focus:ring-primary/20 outline-none"
          >
            <option value="1">CESFAM Panguipulli</option>
            <option value="2">CESFAM Choshuenco</option>
            <option value="3">CESFAM Coñaripe</option>
          </select>
          <select 
            value={periodoId} 
            onChange={(e) => setPeriodoId(e.target.value)}
            className="bg-white border border-outline-variant/20 rounded-xl px-4 py-3 text-sm font-black text-on-surface uppercase tracking-widest shadow-sm focus:ring-2 focus:ring-primary/20 outline-none"
          >
            <option value="1">Marzo 2026</option>
            <option value="2">Abril 2026</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-3 mb-8">
        {[
          { id: 'fondos_presupuestarios', label: 'H.E. Presupuestarias', icon: Clock },
          { id: 'programas_he', label: 'Programas (H.E)', icon: Activity },
          { id: 'programas_turno', label: 'Programas (Turno)', icon: Stethoscope },
          { id: 'viaticos', label: 'Viáticos', icon: Car },
          { id: 'atrasos', label: 'Atrasos / Permisos', icon: AlertTriangle }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id as TabType); setRows([]); addRow(); }}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all",
              activeTab === tab.id 
                ? "bg-primary text-white shadow-lg shadow-primary/20" 
                : "bg-surface-container-low text-secondary hover:bg-white hover:text-primary hover:shadow-md border border-outline-variant/10"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* DataGrid */}
      <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden border border-outline-variant/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-surface-container-lowest border-b border-outline-variant/10">
              <tr className="text-[10px] font-black text-outline uppercase tracking-[0.2em]">
                <th className="px-6 py-4 w-12 text-center">#</th>
                <th className="px-4 py-4 w-48">RUT Funcionario</th>
                <th className="px-4 py-4 w-64">Nombre Clínico</th>
                
                {activeTab === 'fondos_presupuestarios' && (
                  <>
                    <th className="px-4 py-4 text-center">Cat / Niv</th>
                    <th className="px-4 py-4 text-center">Cant. 25%</th>
                    <th className="px-4 py-4 text-center">Cant. 50%</th>
                    <th className="px-4 py-4">Fecha Inicio</th>
                    <th className="px-4 py-4">Fecha Término</th>
                    <th className="px-4 py-4 w-64">Observaciones Médicas</th>
                  </>
                )}

                {activeTab === 'programas_he' && (
                  <>
                    <th className="px-4 py-4 w-80">Programa (Convenio)</th>
                    <th className="px-4 py-4 text-center">Cant. 25%</th>
                    <th className="px-4 py-4 text-center">Cant. 50%</th>
                    <th className="px-4 py-4">Fecha Inicio</th>
                    <th className="px-4 py-4">Fecha Término</th>
                  </>
                )}

                {activeTab === 'programas_turno' && (
                  <>
                    <th className="px-4 py-4 w-64">Programa (SAPU/SUR)</th>
                    <th className="px-4 py-4 text-center">Cant. Hábil</th>
                    <th className="px-4 py-4">Valor Hábil $</th>
                    <th className="px-4 py-4 text-center">Cant. Inhábil</th>
                    <th className="px-4 py-4">Valor Inhábil $</th>
                    <th className="px-4 py-4 text-right text-primary">Subtotal Mes $</th>
                  </>
                )}

                {activeTab === 'viaticos' && (
                  <>
                    <th className="px-4 py-4">Destino</th>
                    <th className="px-4 py-4">Monto Base $</th>
                    <th className="px-4 py-4">Fecha Inicio</th>
                    <th className="px-4 py-4">Fecha Término</th>
                    <th className="px-4 py-4 w-64">Cometido Funcionario</th>
                  </>
                )}

                {activeTab === 'atrasos' && (
                  <>
                     <th className="px-4 py-4">Tiempo (Min/Hrs)</th>
                     <th className="px-4 py-4">Fecha Inicio</th>
                     <th className="px-4 py-4">Fecha Término</th>
                  </>
                )}
                
                <th className="px-6 py-4 text-right">Ac.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {rows.map((row, index) => (
                <tr key={row.id} className="group hover:bg-primary/5 transition-colors">
                  <td className="px-6 py-2 text-center text-xs font-black text-outline">{index + 1}</td>
                  <td className="px-4 py-2">
                    <button 
                      onClick={() => setActiveRowId(row.id)}
                      className="w-full text-left bg-surface-container hover:bg-primary/10 border border-transparent hover:border-primary/20 rounded-lg px-3 py-2 text-xs font-mono font-bold text-on-surface transition-all flex items-center justify-between"
                    >
                      {row.rut || <span className="text-outline italic">Presione para buscar...</span>}
                      <Search className="w-3 h-3 text-primary opacity-50" />
                    </button>
                  </td>
                  <td className="px-4 py-2 text-xs font-black text-secondary uppercase truncate max-w-[200px]">
                    {row.nombre || '-'}
                  </td>

                  {activeTab === 'fondos_presupuestarios' && (
                    <>
                      <td className="px-4 py-2 text-center text-[10px] font-black text-outline uppercase tracking-widest">{row.categoria_aps || '-'}{row.nivel_aps ? ` / ${row.nivel_aps}` : ''}</td>
                      <td className="px-4 py-2"><input type="number" value={row.cantidad_25} onChange={e => updateRow(row.id, 'cantidad_25', e.target.value)} className="w-20 bg-surface-container rounded-md px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none text-center" placeholder="0" /></td>
                      <td className="px-4 py-2"><input type="number" value={row.cantidad_50} onChange={e => updateRow(row.id, 'cantidad_50', e.target.value)} className="w-20 bg-surface-container rounded-md px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none text-center" placeholder="0" /></td>
                      <td className="px-4 py-2"><input type="date" value={row.fecha_inicio} onChange={e => updateRow(row.id, 'fecha_inicio', e.target.value)} className="bg-surface-container rounded-md px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none text-secondary" /></td>
                      <td className="px-4 py-2"><input type="date" value={row.fecha_termino} onChange={e => updateRow(row.id, 'fecha_termino', e.target.value)} className="bg-surface-container rounded-md px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none text-secondary" /></td>
                      <td className="px-4 py-2"><input type="text" value={row.observaciones} onChange={e => updateRow(row.id, 'observaciones', e.target.value)} className="w-full bg-surface-container rounded-md px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Opcional..." /></td>
                    </>
                  )}

                  {activeTab === 'programas_he' && (
                    <>
                      <td className="px-4 py-2">
                        <select value={row.programa_nombre || PROGRAMAS_HE_LIST[0]} onChange={e => updateRow(row.id, 'programa_nombre', e.target.value)} className="w-full bg-surface-container border-none rounded-md px-3 py-2 text-[10px] font-black text-secondary outline-none uppercase cursor-pointer max-w-[300px]">
                          {PROGRAMAS_HE_LIST.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-2"><input type="number" value={row.cantidad_25} onChange={e => updateRow(row.id, 'cantidad_25', e.target.value)} className="w-20 bg-surface-container rounded-md px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none text-center" placeholder="0" /></td>
                      <td className="px-4 py-2"><input type="number" value={row.cantidad_50} onChange={e => updateRow(row.id, 'cantidad_50', e.target.value)} className="w-20 bg-surface-container rounded-md px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none text-center" placeholder="0" /></td>
                      <td className="px-4 py-2"><input type="date" value={row.fecha_inicio} onChange={e => updateRow(row.id, 'fecha_inicio', e.target.value)} className="bg-surface-container rounded-md px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none text-secondary" /></td>
                      <td className="px-4 py-2"><input type="date" value={row.fecha_termino} onChange={e => updateRow(row.id, 'fecha_termino', e.target.value)} className="bg-surface-container rounded-md px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none text-secondary" /></td>
                    </>
                  )}

                  {activeTab === 'programas_turno' && (
                    <>
                      <td className="px-4 py-2">
                        <select value={row.programa_nombre || PROGRAMAS_TURNO_LIST[0]} onChange={e => updateRow(row.id, 'programa_nombre', e.target.value)} className="w-full bg-surface-container border-none rounded-md px-3 py-2 text-[10px] font-black text-secondary outline-none uppercase cursor-pointer max-w-[250px]">
                          {PROGRAMAS_TURNO_LIST.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-2"><input type="number" value={row.cant_habil} onChange={e => updateRow(row.id, 'cant_habil', e.target.value)} className="w-16 bg-surface-container rounded-md px-2 py-2 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none text-center" placeholder="0" /></td>
                      <td className="px-4 py-2"><input type="number" value={row.valor_habil} onChange={e => updateRow(row.id, 'valor_habil', e.target.value)} className="w-24 bg-surface-container rounded-md px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none" placeholder="0" /></td>
                      <td className="px-4 py-2"><input type="number" value={row.cant_inhabil} onChange={e => updateRow(row.id, 'cant_inhabil', e.target.value)} className="w-16 bg-surface-container rounded-md px-2 py-2 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none text-center" placeholder="0" /></td>
                      <td className="px-4 py-2"><input type="number" value={row.valor_inhabil} onChange={e => updateRow(row.id, 'valor_inhabil', e.target.value)} className="w-24 bg-surface-container rounded-md px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none" placeholder="0" /></td>
                      <td className="px-4 py-2 text-right">
                         <span className="bg-primary/10 text-primary px-4 py-2 rounded-lg font-black text-xs tracking-tighter">
                            ${getRowTotal(row).toLocaleString('es-CL')}
                         </span>
                      </td>
                    </>
                  )}

                  {activeTab === 'viaticos' && (
                    <>
                      <td className="px-4 py-2">
                        <select value={row.tipo_destino} onChange={e => updateRow(row.id, 'tipo_destino', e.target.value as any)} className="bg-surface-container border-none rounded-md px-3 py-2 text-[10px] font-black text-secondary outline-none uppercase cursor-pointer">
                          <option value="DENTRO COMUNA">Dentro de Comuna</option>
                          <option value="FUERA COMUNA">Fuera de Comuna</option>
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-xs font-black">$</span>
                          <input type="number" value={row.monto} onChange={e => updateRow(row.id, 'monto', e.target.value)} className="w-24 bg-surface-container border border-primary/20 rounded-md pl-6 pr-3 py-2 text-xs font-black text-primary focus:ring-2 focus:ring-primary/20 outline-none" />
                        </div>
                      </td>
                      <td className="px-4 py-2"><input type="date" value={row.fecha_inicio} onChange={e => updateRow(row.id, 'fecha_inicio', e.target.value)} className="bg-surface-container rounded-md px-3 py-2 text-xs font-bold outline-none text-secondary" /></td>
                      <td className="px-4 py-2"><input type="date" value={row.fecha_termino} onChange={e => updateRow(row.id, 'fecha_termino', e.target.value)} className="bg-surface-container rounded-md px-3 py-2 text-xs font-bold outline-none text-secondary" /></td>
                      <td className="px-4 py-2"><input type="text" value={row.observaciones} onChange={e => updateRow(row.id, 'observaciones', e.target.value)} className="w-full bg-surface-container rounded-md px-3 py-2 text-xs font-bold outline-none" placeholder="Motivo o comisión..." /></td>
                    </>
                  )}

                  {activeTab === 'atrasos' && (
                    <>
                      <td className="px-4 py-2"><input type="text" value={row.tiempo} onChange={e => updateRow(row.id, 'tiempo', e.target.value)} className="w-32 bg-surface-container rounded-md px-3 py-2 text-xs font-bold outline-none" placeholder="Ej: 45 min" /></td>
                      <td className="px-4 py-2"><input type="date" value={row.fecha_inicio} onChange={e => updateRow(row.id, 'fecha_inicio', e.target.value)} className="bg-surface-container rounded-md px-3 py-2 text-xs font-bold outline-none text-secondary" /></td>
                      <td className="px-4 py-2"><input type="date" value={row.fecha_termino} onChange={e => updateRow(row.id, 'fecha_termino', e.target.value)} className="bg-surface-container rounded-md px-3 py-2 text-xs font-bold outline-none text-secondary" /></td>
                    </>
                  )}

                  <td className="px-6 py-2 text-right">
                    <button 
                      onClick={() => removeRow(row.id)}
                      className="p-2 text-outline/40 hover:text-error hover:bg-error/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Footer actions inner grid */}
        <div className="bg-surface-container-lowest p-4 border-t border-outline-variant/10">
          <button 
            onClick={addRow}
            className="flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest text-primary hover:bg-primary/5 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" /> Agregar Fila
          </button>
        </div>
      </div>

      {/* Floating Action CTA */}
      <div className="fixed bottom-12 right-12 z-40">
         <div className="flex items-center gap-4">
           {showSuccess && (
             <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-success text-white px-6 py-4 rounded-2xl shadow-lg flex items-center gap-3">
               <CheckCircle2 className="w-5 h-5" />
               <span className="text-xs font-black uppercase tracking-widest">Matriz Guardada</span>
             </motion.div>
           )}
           <div className="bg-surface-container-low px-6 py-4 rounded-2xl shadow-sm border border-outline-variant/10 flex items-center gap-4 hidden md:flex">
             <span className="text-[10px] font-black uppercase tracking-widest text-secondary">Resumen Previo</span>
             <div className="h-4 w-[1px] bg-outline-variant/20" />
             <span className="text-lg font-black text-primary tracking-tighter">
                {rows.filter(r => r.rut).length} Funcs.
             </span>
           </div>
           <button 
            onClick={handleSave}
            disabled={loading || rows.every(r => !r.rut)}
            className="flex items-center gap-3 bg-on-background text-white px-10 py-5 rounded-3xl font-black uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all text-sm disabled:opacity-50 disabled:hover:scale-100"
          >
            {loading ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Someter Lote al Consolidador
          </button>
         </div>
      </div>
    </div>
  );
}
