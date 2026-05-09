'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";
import { 
  CloudUpload, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  RefreshCcw,
  ChevronRight,
  ShieldCheck,
  Calendar,
  DollarSign
} from 'lucide-react';


type Step = 'select' | 'preview' | 'success';

interface PeriodoDB {
  id: number;
  mes: number;
  anio: number;
}

export default function ImportarPage() {
  const router = useRouter();
  const [mounted, setMounted] = React.useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('select');
  const [periodoId, setPeriodoId] = useState('');
  const [importType, setImportType] = useState<'validacion' | 'maestro'>('validacion');
  const [isSyncing, setIsSyncing] = useState(false);
  const [periods, setPeriods] = useState<PeriodoDB[]>([]);
  const [activeGroup, setActiveGroup] = useState<string>('TODOS');
  const [periodsError, setPeriodsError] = useState<string | null>(null);

  React.useEffect(() => {
    setMounted(true);
    fetchPeriods();
  }, []);

  const fetchPeriods = async () => {
    setPeriodsError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api-remuneracion.apscolab.com';
      const res = await axios.get(`${apiUrl}/periodos`, { timeout: 10000 });
      if (res.data && res.data.length > 0) {
        setPeriods(res.data);
        setPeriodoId(String(res.data[0].id));
      } else {
        setPeriodsError('No hay períodos disponibles. Inicialice los períodos en Configuración.');
      }
    } catch (err: any) {
      console.error('Error fetching periods:', err);
      setPeriodsError('No se pudo conectar con el servidor. Verifique que el backend esté activo.');
    }
  };

  if (!mounted) return null;

  const getMonthName = (month: number) => {
    const names = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return names[month - 1];
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setPreviewData(null);
      setStep('select');
    }
  };

  const startPreview = async () => {
    if (!file || !periodoId) return;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('periodoId', periodoId);

    try {
      const endpoint = importType === 'maestro' ? 'importar-maestro-mensual' : 'importar-validacion';
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api-remuneracion.apscolab.com';
      const res = await axios.post(`${apiUrl}/remuneraciones/${endpoint}?dryRun=true`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000 // 2 minutos para archivos grandes
      });
      setPreviewData(res.data);
      setStep('preview');
      setActiveGroup('TODOS');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al analizar el archivo. Verifique el formato e intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const confirmSync = async () => {
    if (!file || !periodoId) return;
    setIsSyncing(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('periodoId', periodoId);

    try {
      const endpoint = importType === 'maestro' ? 'importar-maestro-mensual' : 'importar-validacion';
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api-remuneracion.apscolab.com';
      const res = await axios.post(`${apiUrl}/remuneraciones/${endpoint}?dryRun=false`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000 // 5 minutos para la sincronización final
      });
      
      setStep('success');
      
      // Si tenemos un ID de consolidado, redirigir después de un momento
      if (res.data.consolidadoId) {
        setTimeout(() => {
          router.push(`/consolidados/${res.data.consolidadoId}`);
        }, 2000);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Falló la sincronización final. Intente nuevamente.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSyncing(false);
    }
  };

  const formatCLP = (val: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val);

  return (
    <div className="flex flex-col min-h-screen bg-surface p-12 relative overflow-hidden">
      {/* Overlay de Sincronización */}
      <AnimatePresence>
        {isSyncing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-on-surface/40 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[3rem] p-12 shadow-2xl max-w-md w-full text-center space-y-6 border border-outline-variant/10"
            >
              <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto relative">
                <RefreshCcw className="w-12 h-12 text-primary animate-spin" />
                <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-[spin_3s_linear_infinite]" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-on-surface uppercase tracking-tight">
                  {importType === 'maestro' ? 'Sincronizando Maestro' : 'Consolidando Auditoría'}
                </h3>
                <p className="text-secondary text-sm font-medium mt-2 leading-relaxed">
                  Estamos procesando los registros. 
                  Por favor, no cierres esta ventana.
                </p>
              </div>
              <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                <motion.div 
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                  className="h-full w-1/3 bg-primary rounded-full shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="mb-12 flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-primary font-headline tracking-tighter uppercase mb-2">
            {importType === 'maestro' ? 'Sincronización Maestro' : 'Validación de Remuneraciones'}
          </h2>
          <p className="text-xs font-black text-secondary uppercase tracking-[0.3em] opacity-60">
            {importType === 'maestro' ? 'Carga masiva de Planilla Oficial de Pago' : 'Auditoría Detallada: H.E., Viáticos y Atrasos'}
          </p>
          
          {step === 'select' && (
            <div className="flex gap-4 mt-8">
              <button 
                onClick={() => { setImportType('validacion'); setFile(null); }}
                className={cn(
                  "px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                  importType === 'validacion' ? "bg-primary text-white shadow-lg" : "bg-white text-secondary border border-outline-variant/10"
                )}
              >
                Auditoría (Validación)
              </button>
              <button 
                onClick={() => { setImportType('maestro'); setFile(null); }}
                className={cn(
                  "px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                  importType === 'maestro' ? "bg-primary text-white shadow-lg" : "bg-white text-secondary border border-outline-variant/10"
                )}
              >
                Sincronizar Maestro
              </button>
            </div>
          )}
        </div>
        
        {step === 'select' && (
          <div className="bg-white border border-outline-variant/10 rounded-3xl px-8 py-5 shadow-sm min-w-[280px]">
            <span className="text-[10px] font-black text-outline uppercase tracking-widest mb-1 block">Período Seleccionado</span>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-primary" />
              {periodsError ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-rose-500">{periodsError}</span>
                  <button onClick={fetchPeriods} className="text-[10px] font-black text-primary underline">Reintentar</button>
                </div>
              ) : periods.length === 0 ? (
                <span className="text-xs text-outline italic">Cargando períodos...</span>
              ) : (
                <select 
                  value={periodoId} 
                  onChange={(e) => setPeriodoId(e.target.value)}
                  className="font-black text-on-surface text-sm outline-none bg-transparent appearance-none cursor-pointer w-full"
                >
                  {periods.map(p => <option key={p.id} value={String(p.id)}>{getMonthName(p.mes)} {p.anio}</option>)}
                </select>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="max-w-6xl mx-auto w-full">
        <AnimatePresence mode="wait">
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
                  <ShieldCheck className="w-10 h-10" />
                </div>
                {file ? (
                  <div className="animate-in fade-in slide-in-from-bottom-2">
                    <p className="text-2xl font-black text-on-surface uppercase tracking-tight">{file.name}</p>
                    <p className="text-[10px] font-black text-secondary uppercase tracking-widest mt-2 italic">
                      Planilla de {importType === 'maestro' ? 'maestro' : 'validación'} detectada para {periods.find(p => String(p.id) === periodoId) ? `${getMonthName(periods.find(p => String(p.id) === periodoId)!.mes)} ${periods.find(p => String(p.id) === periodoId)!.anio}` : 'el periodo seleccionado'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xl font-black text-on-surface uppercase tracking-tight">
                      {importType === 'maestro' ? 'Cargar Planilla Maestro' : 'Cargar Planilla Validación'}
                    </p>
                    <p className="text-xs text-outline font-bold">
                      {importType === 'maestro' ? 'Arrastre el archivo (.xlsx) oficial de remuneraciones mensual' : 'Arrastre el archivo (.xlsx) con las hojas de HE, Viáticos y Atrasos'}
                    </p>
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
                  {importType === 'maestro' ? 'Analizar Datos de Maestro' : 'Analizar Datos de Auditoría'}
                </button>
              </div>
            </motion.div>
          )}

          {step === 'preview' && previewData && (
            <motion.div 
              key="preview"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8 pb-20"
            >
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-primary text-white p-8 rounded-3xl shadow-lg flex flex-col justify-between h-40">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Funcionarios</p>
                  <h4 className="text-5xl font-black">{importType === 'maestro' ? previewData.totalProcesados : previewData.totalFuncionarios}</h4>
                  <p className="text-[10px] font-bold uppercase tracking-widest mt-1">{importType === 'maestro' ? 'Registros Procesados' : 'Con novedades detectadas'}</p>
                </div>
                <div className="bg-white p-8 rounded-3xl border border-outline-variant/10 shadow-sm flex flex-col justify-between h-40">
                   <p className="text-[10px] font-black uppercase tracking-widest text-[#2563eb]">{importType === 'maestro' ? 'Líneas Maestro' : 'Registros de Auditoría'}</p>
                   <h4 className="text-5xl font-black text-on-surface text-[#2563eb] font-mono">{importType === 'maestro' ? (previewData.preview?.length || 0) : previewData.totalRegistros}</h4>
                   <p className="text-[10px] font-bold uppercase tracking-widest text-outline">Líneas analizadas</p>
                </div>
                <div className="bg-white p-8 rounded-3xl border border-outline-variant/10 shadow-sm flex flex-col justify-between h-40 font-mono">
                   <p className="text-[10px] font-black uppercase tracking-widest text-[#7c3aed]">{importType === 'maestro' ? 'Sueldo Base' : 'Conceptos Detectados'}</p>
                   <h4 className="text-4xl font-black text-on-surface text-[#7c3aed]">{importType === 'maestro' ? 'OK' : 'MULTI'}</h4>
                   <p className="text-[10px] font-bold uppercase tracking-widest text-outline">{importType === 'maestro' ? 'Análisis Estructural' : 'HE / Turnos / Viáticos'}</p>
                </div>
                <div className="bg-white p-8 rounded-3xl border border-outline-variant/10 shadow-sm flex flex-col justify-between h-40 font-mono">
                   <p className="text-[10px] font-black uppercase tracking-widest text-rose-500">{importType === 'maestro' ? 'Sincronización' : 'Auditoría de Horas'}</p>
                   <h4 className="text-4xl font-black text-rose-500">ACTIVA</h4>
                   <p className="text-[10px] font-bold text-outline uppercase tracking-widest">{importType === 'maestro' ? 'Validación de Columnas' : 'Validación de cantidades'}</p>
                </div>
              </div>

              <div className="bg-white rounded-[2.5rem] border border-outline-variant/10 shadow-xl overflow-hidden">
                <div className="px-8 py-6 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container/30">
                  <h3 className="text-sm font-black text-secondary uppercase tracking-widest">
                    {importType === 'maestro' ? 'Vista Previa de Funcionarios' : 'Análisis Desglosado por Programa'} ({periods.find(p => String(p.id) === periodoId) ? `${getMonthName(periods.find(p => String(p.id) === periodoId)!.mes)} ${periods.find(p => String(p.id) === periodoId)!.anio}` : '...'})
                  </h3>
                </div>

                <div className="p-8 max-h-[600px] overflow-y-auto">
                  <table className="w-full text-left border-separate border-spacing-y-2">
                    <thead>
                      <tr className="text-[10px] font-black text-outline uppercase tracking-[0.2em]">
                        <th className="pb-4 pl-4">RUT</th>
                        {importType === 'maestro' ? (
                          <>
                            <th className="pb-4">NOMBRE</th>
                            <th className="pb-4 text-right">SUELDO BASE</th>
                            <th className="pb-4 text-right">TOTAL HABERES</th>
                            <th className="pb-4 text-right pr-4">MONTO LÍQUIDO</th>
                          </>
                        ) : (
                          <>
                            <th className="pb-4">CATEGORÍA</th>
                            <th className="pb-4">CONCEPTO / PROGRAMA</th>
                            <th className="pb-4 text-center">HE 25% / HÁBIL</th>
                            <th className="pb-4 text-center">HE 50% / INHÁBIL</th>
                            <th className="pb-4 text-right pr-4">OTROS (V/A)</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/5">
                      {previewData.preview?.map((item: any, idx: number) => (
                        <tr key={`${item.rut}-${idx}`} className="group hover:bg-slate-50 transition-all">
                          <td className="py-4 pl-4">
                            <span className="text-xs font-black text-slate-400 group-hover:text-primary transition-colors font-mono">{item.rut}</span>
                          </td>
                          {importType === 'maestro' ? (
                            <>
                              <td className="py-4">
                                <span className="text-xs font-bold text-slate-700">{item.nombre || 'Sin Nombre'}</span>
                              </td>
                              <td className="py-4 text-right">
                                <span className="text-sm font-black text-slate-800">{formatCLP(item.sueldo_base || 0)}</span>
                              </td>
                              <td className="py-4 text-right">
                                <span className="text-sm font-black text-slate-800">{formatCLP(item.total_haberes || 0)}</span>
                              </td>
                              <td className="py-4 text-right pr-4">
                                <span className="text-sm font-black text-primary">{formatCLP(item.monto_liquido || 0)}</span>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="py-4">
                                <span className={cn(
                                  "text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-tighter",
                                  item.category === 'PRESUPUESTARIA' ? "bg-blue-100 text-blue-700" :
                                  item.category === 'PROGRAMA_HE' ? "bg-purple-100 text-purple-700" :
                                  item.category === 'PROGRAMA_TURNO' ? "bg-emerald-100 text-emerald-700" :
                                  "bg-slate-100 text-slate-600"
                                )}>
                                  {item.category ? item.category.replace('_', ' ') : 'S/C'}
                                </span>
                              </td>
                              <td className="py-4">
                                 <div className="flex items-center gap-2">
                                    <span className="text-xs font-black text-slate-700 uppercase tracking-tight leading-tight">{item.concept || 'N/A'}</span>
                                 </div>
                              </td>
                              <td className="py-4 text-center">
                                <span className="text-sm font-black text-slate-800">
                                  {item.cant_25 || item.cant_habil || '-'}
                                </span>
                              </td>
                              <td className="py-4 text-center">
                                <span className="text-sm font-black text-slate-800">
                                  {item.cant_50 || item.cant_inhabil || '-'}
                                </span>
                              </td>
                              <td className="py-4 text-right pr-4">
                                {item.viaticos ? (
                                  <span className="text-xs font-black text-emerald-600 font-mono">{formatCLP(item.viaticos)}</span>
                                ) : item.minutos_atraso ? (
                                  <span className="text-xs font-black text-rose-600 font-mono">{item.minutos_atraso} min</span>
                                ) : (
                                  <span className="text-slate-200">-</span>
                                )}
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-between items-center bg-primary text-white p-8 rounded-[2.5rem] shadow-2xl">
                 <div className="flex items-center gap-6">
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-xl font-black uppercase tracking-tight">{importType === 'maestro' ? 'Confirmar Carga del Maestro' : 'Confirmar Integración Granular'}</h4>
                      <p className="text-[10px] font-medium opacity-70 italic uppercase tracking-widest">
                        {importType === 'maestro' ? `Se importarán los datos principales de ${previewData.totalProcesados} funcionarios al periodo` : `Se importarán los programas de ${previewData.totalFuncionarios} funcionarios al periodo`} {periods.find(p => String(p.id) === periodoId) ? `${getMonthName(periods.find(p => String(p.id) === periodoId)!.mes)} ${periods.find(p => String(p.id) === periodoId)!.anio}` : '...'}
                      </p>
                    </div>
                 </div>
                 <div className="flex gap-4">
                    <button onClick={() => setStep('select')} className="px-8 py-4 text-white font-black uppercase text-[10px] tracking-widest hover:bg-white/5 rounded-2xl transition-all">Cancelar</button>
                    <button 
                      onClick={confirmSync}
                      className="px-10 py-4 bg-white text-primary rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center gap-2"
                    >
                      {loading ? <RefreshCcw className="w-3 h-3 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                      {importType === 'maestro' ? 'Confirmar Carga' : 'Consolidar Auditoría Detallada'}
                    </button>
                 </div>
              </div>
            </motion.div>
          )}

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
              <h3 className="text-5xl font-black text-primary font-headline tracking-tighter uppercase mb-4">¡Validación Desglosada!</h3>
              <p className="text-xs font-black text-secondary uppercase tracking-[0.3em] max-w-xl mx-auto leading-relaxed mb-12">
                Los programas individuales han sido inyectados con éxito. Ahora puedes realizar la comparación uno a uno en el panel de control del funcionario.
              </p>
              <button 
                onClick={() => setStep('select')}
                className="px-12 py-5 border-2 border-primary text-primary rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-primary hover:text-white transition-all shadow-xl"
              >
                Cargar Siguiente Mes
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="mt-8 p-8 bg-rose-50 border border-rose-100 rounded-3xl flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-rose-500 shrink-0" />
            <p className="text-sm font-black text-rose-500 uppercase tracking-widest pt-1">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
