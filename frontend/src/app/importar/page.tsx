'use client';

import React, { useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";
import { 
  CloudUpload, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  Users, 
  RefreshCcw,
  ChevronRight,
  ShieldCheck,
  Building
} from 'lucide-react';

type Step = 'select' | 'preview' | 'success';

export default function ImportarPage() {
  const [mounted, setMounted] = React.useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('select');
  const [activeGroup, setActiveGroup] = useState<string>('CESFAM Panguipulli');

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setPreviewData(null);
      setStep('select');
    }
  };

  const startPreview = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Step 1: Dry run to preview changes
      const res = await axios.post('http://localhost:3000/funcionarios/importar?dryRun=true', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setPreviewData(res.data);
      setStep('preview');
      // Set first non-empty group as active
      if (res.data.grouped) {
        const groups = Object.keys(res.data.grouped);
        setActiveGroup(groups[0]);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al analizar el archivo. Verifique el formato.');
    } finally {
      setLoading(false);
    }
  };

  const confirmSync = async () => {
    if (!file) return;
    setLoading(true);
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      // Step 2: Final sync
      await axios.post('http://localhost:3000/funcionarios/importar?dryRun=false', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setStep('success');
    } catch (err: any) {
      setError('Fallo la confirmación final. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-surface p-12">
      {/* Header */}
      <div className="mb-12">
        <h2 className="text-4xl font-black text-primary font-headline tracking-tighter uppercase mb-2">Importación de Capital Humano</h2>
        <p className="text-xs font-black text-secondary uppercase tracking-[0.3em] opacity-60">Motor de Sincronización de Plantilla Maestra APS</p>
      </div>

      <div className="max-w-6xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {/* STEP 1: SELECT FILE */}
          {step === 'select' && (
            <motion.div 
              key="select"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="space-y-8"
            >
              <div className="bg-white p-16 rounded-[3rem] border-2 border-dashed border-outline-variant/20 hover:border-primary/40 transition-all group relative text-center shadow-sm">
                <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={handleFileChange} accept=".xlsx, .xls" />
                <div className="w-24 h-24 rounded-[2rem] bg-primary/5 flex items-center justify-center mx-auto mb-8 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-500">
                  <CloudUpload className="w-10 h-10" />
                </div>
                {file ? (
                  <div className="animate-in fade-in slide-in-from-bottom-2">
                    <p className="text-2xl font-black text-on-surface uppercase tracking-tight">{file.name}</p>
                    <p className="text-[10px] font-black text-outline uppercase tracking-widest mt-2 italic">Listo para análisis estructural</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xl font-black text-on-surface uppercase tracking-tight">Cargar Plantilla Maestra</p>
                    <p className="text-xs text-outline font-bold">Arrastre el archivo .xlsx aquí o haga clic para buscar</p>
                  </div>
                )}
              </div>

              <div className="flex justify-center">
                <button 
                  onClick={startPreview}
                  disabled={!file || loading}
                  className="px-12 py-5 bg-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 hover:brightness-110 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
                >
                  {loading ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                  Analizar y Previsualizar
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: PREVIEW CHANGES */}
          {step === 'preview' && previewData && (
            <motion.div 
              key="preview"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8 pb-20"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-primary text-white p-8 rounded-3xl shadow-lg flex flex-col justify-between h-40">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Total Procesado</p>
                  <h4 className="text-5xl font-black">{previewData.summary.total}</h4>
                  <p className="text-[10px] font-bold">Funcionarios identificados</p>
                </div>
                <div className="bg-white p-8 rounded-3xl border border-outline-variant/10 shadow-sm flex flex-col justify-between h-40">
                  <p className="text-[10px] font-black uppercase tracking-widest text-secondary">Nuevos Ingresos</p>
                  <h4 className="text-5xl font-black text-on-surface">{previewData.summary.nuevos}</h4>
                  <div className="w-full h-1 bg-surface-container rounded-full overflow-hidden">
                    <div className="h-full bg-success w-full" />
                  </div>
                </div>
                <div className="bg-white p-8 rounded-3xl border border-outline-variant/10 shadow-sm flex flex-col justify-between h-40">
                  <p className="text-[10px] font-black uppercase tracking-widest text-secondary">Actualizaciones Detectadas</p>
                  <h4 className="text-5xl font-black text-on-surface">{previewData.summary.actualizados}</h4>
                  <div className="w-full h-1 bg-surface-container rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-full" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-[2.5rem] border border-outline-variant/10 shadow-xl overflow-hidden">
                <div className="p-2 bg-surface-container/50 border-b border-outline-variant/10 flex gap-2">
                  {Object.keys(previewData.grouped).map(group => (
                    <button 
                      key={group}
                      onClick={() => setActiveGroup(group)}
                      className={cn(
                        "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                        activeGroup === group ? "bg-white text-primary shadow-sm" : "text-outline hover:text-secondary"
                      )}
                    >
                      <Building2 className="w-3 h-3" />
                      {group} ({previewData.grouped[group].length})
                    </button>
                  ))}
                </div>

                <div className="p-8 max-h-[500px] overflow-y-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] font-black text-outline uppercase tracking-[0.2em] border-b border-outline-variant/5">
                        <th className="pb-4 pl-4">RUT</th>
                        <th className="pb-4">Funcionario</th>
                        <th className="pb-4">Categoría / Nivel</th>
                        <th className="pb-4">Estado</th>
                        <th className="pb-4 pr-4 text-right">Detalle de Cambios</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/5">
                      {previewData.grouped[activeGroup]?.map((item: any) => (
                        <tr key={item.rut} className="group hover:bg-surface-container/30 transition-colors">
                          <td className="py-4 pl-4 text-xs font-black text-on-surface font-mono">{item.rut}</td>
                          <td className="py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-secondary group-hover:text-primary transition-colors uppercase tracking-tight">{item.nombre}</span>
                              <span className="text-[9px] font-bold text-outline uppercase tracking-wider">{item.profesion}</span>
                            </div>
                          </td>
                          <td className="py-4">
                            <span className="bg-surface-container px-3 py-1 rounded-lg text-xs font-black text-on-surface-variant">
                              {item.categoria} - Nivel {item.nivel}
                            </span>
                          </td>
                          <td className="py-4">
                            <span className={cn(
                              "text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-tighter",
                              item.status === 'NUEVO' ? "bg-success/10 text-success" : "bg-primary/10 text-primary"
                            )}>
                              {item.status}
                            </span>
                          </td>
                          <td className="py-4 pr-4 text-right">
                             {item.hasChanges ? (
                               <div className="flex flex-col items-end gap-1">
                                 {Object.keys(item.diff).map(key => (
                                   <span key={key} className="text-[8px] font-bold text-primary bg-primary/5 px-2 py-1 rounded border border-primary/10">
                                     {key}: {item.diff[key].old || '-'} → {item.diff[key].new}
                                   </span>
                                 ))}
                               </div>
                             ) : (
                               <span className="text-[10px] font-bold text-outline opacity-40 italic">Sin cambios detectados</span>
                             )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-between items-center bg-secondary text-white p-8 rounded-[2.5rem] shadow-2xl">
                 <div className="flex items-center gap-6">
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-xl font-black uppercase tracking-tight">Confirmar Sincronización</h4>
                      <p className="text-[10px] font-medium opacity-70 italic uppercase tracking-widest">Al confirmar, se actualizará la base de datos oficial del ciclo 2026</p>
                    </div>
                 </div>
                 <div className="flex gap-4">
                    <button onClick={() => setStep('select')} className="px-8 py-4 text-white font-black uppercase text-[10px] tracking-widest hover:bg-white/5 rounded-2xl transition-all">Cancelar</button>
                    <button 
                      onClick={confirmSync}
                      className="px-10 py-4 bg-white text-secondary rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center gap-2"
                    >
                      {loading ? <RefreshCcw className="w-3 h-3 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                      Ejecutar Sincronización
                    </button>
                 </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3: SUCCESS */}
          {step === 'success' && (
            <motion.div 
              key="success"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="w-32 h-32 bg-success/10 text-success rounded-full flex items-center justify-center mb-8 animate-bounce">
                <CheckCircle2 className="w-16 h-16" />
              </div>
              <h3 className="text-5xl font-black text-secondary font-headline tracking-tighter uppercase mb-4">¡Sincronización Exitosa!</h3>
              <p className="text-xs font-black text-outline uppercase tracking-[0.3em] max-w-xl mx-auto leading-relaxed mb-12">
                Los datos de los funcionarios han sido actualizados y normalizados a los CESFAM correspondientes. La matriz de auditoría ya refleja los cambios.
              </p>
              <button 
                onClick={() => setStep('select')}
                className="px-12 py-5 border-2 border-secondary text-secondary rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-secondary hover:text-white transition-all shadow-xl"
              >
                Cargar Nuevo Archivo
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="mt-8 p-8 bg-error/10 border border-error/20 rounded-3xl flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-error shrink-0" />
            <p className="text-sm font-black text-error uppercase tracking-widest pt-1">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
