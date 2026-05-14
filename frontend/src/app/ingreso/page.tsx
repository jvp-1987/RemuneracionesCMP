'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";
import { useAuth } from '@/components/AuthProvider';
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
  Activity,
  User,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Info,
  DollarSign,
  LayoutGrid,
  Table2,
  Users
} from 'lucide-react';

// ─── Tipos ─────────────────────────────────────────────────────────────────────
type TabType = 'fondos_presupuestarios' | 'viaticos' | 'atrasos' | 'programas_turno' | 'programas_he';

interface RowData {
  id: string;
  rut: string;
  nombre: string;
  categoria_aps: string;
  nivel_aps: string;
  fecha_inicio: string;     // YYYY-MM-DD
  fecha_termino: string;    // YYYY-MM-DD
  observaciones: string;
  cantidad_25: string;
  cantidad_50: string;
  programa_nombre: string;
  tipo_destino: 'DENTRO COMUNA' | 'FUERA COMUNA';
  monto: string;
  tiempo: string;
  cant_habil: string;
  valor_habil: string;
  cant_inhabil: string;
  valor_inhabil: string;
  url_respaldo?: string;
}

interface PeriodoConfig {
  id: string;
  label: string;
  mes: number;
  anio: number;
  inicio: string;  // YYYY-MM-DD, día 15 del mes anterior
  fin: string;     // YYYY-MM-DD, día 15 del mes del período
}

// ─── Períodos ──────────────────────────────────────────────────────────────────
const PERIODOS: PeriodoConfig[] = [
  { id: '1', label: 'Enero 2026',      mes: 1,  anio: 2026, inicio: '2025-12-16', fin: '2026-01-15' },
  { id: '2', label: 'Febrero 2026',    mes: 2,  anio: 2026, inicio: '2026-01-16', fin: '2026-02-15' },
  { id: '3', label: 'Marzo 2026',      mes: 3,  anio: 2026, inicio: '2026-02-16', fin: '2026-03-15' },
  { id: '4', label: 'Abril 2026',      mes: 4,  anio: 2026, inicio: '2026-03-16', fin: '2026-04-15' },
  { id: '5', label: 'Mayo 2026',       mes: 5,  anio: 2026, inicio: '2026-04-16', fin: '2026-05-15' },
  { id: '6', label: 'Junio 2026',      mes: 6,  anio: 2026, inicio: '2026-05-16', fin: '2026-06-15' },
  { id: '7', label: 'Julio 2026',      mes: 7,  anio: 2026, inicio: '2026-06-16', fin: '2026-07-15' },
  { id: '8', label: 'Agosto 2026',     mes: 8,  anio: 2026, inicio: '2026-07-16', fin: '2026-08-15' },
  { id: '9', label: 'Septiembre 2026', mes: 9,  anio: 2026, inicio: '2026-08-16', fin: '2026-09-15' },
  { id: '10', label: 'Octubre 2026',   mes: 10, anio: 2026, inicio: '2026-09-16', fin: '2026-10-15' },
  { id: '11', label: 'Noviembre 2026', mes: 11, anio: 2026, inicio: '2026-10-16', fin: '2026-11-15' },
  { id: '12', label: 'Diciembre 2026', mes: 12, anio: 2026, inicio: '2026-11-16', fin: '2026-12-15' },
];

// ─── Listas ────────────────────────────────────────────────────────────────────
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

// ─── Feriados Chile 2026 ─────────────────────────────────────────────────────
const FERIADOS_CHILE_2026 = [
  '2026-01-01', // Año Nuevo
  '2026-04-03', // Viernes Santo
  '2026-04-04', // Sábado Santo
  '2026-05-01', // Día del Trabajo
  '2026-05-21', // Glorias Navales
  '2026-06-21', // Pueblos Originarios
  '2026-06-29', // San Pedro y San Pablo
  '2026-07-16', // Virgen del Carmen
  '2026-08-15', // Asunción de la Virgen
  '2026-09-18', // Independencia
  '2026-09-19', // Glorias del Ejército
  '2026-09-20', // Fiestas Patrias (Adicional)
  '2026-10-12', // Encuentro Dos Mundos
  '2026-10-31', // Iglesias Evangélicas
  '2026-11-01', // Todos los Santos
  '2026-12-08', // Inmaculada Concepción
  '2026-12-25', // Navidad
];

const isHoliday = (dateStr: string) => FERIADOS_CHILE_2026.includes(dateStr);

const TABS = [
  { id: 'fondos_presupuestarios', label: 'H.E. Presupuestarias', icon: Clock,         color: 'from-blue-500 to-indigo-600' },
  { id: 'programas_he',           label: 'Programas (H.E)',       icon: Activity,      color: 'from-emerald-500 to-teal-600' },
  { id: 'programas_turno',        label: 'Programas (Turno)',     icon: Stethoscope,   color: 'from-violet-500 to-purple-600' },
  { id: 'viaticos',               label: 'Viáticos',              icon: Car,           color: 'from-amber-500 to-orange-600' },
  { id: 'atrasos',                label: 'Atrasos / Permisos',    icon: AlertTriangle, color: 'from-rose-500 to-red-600' }
];

// ─── Mini-Calendario Inline ──────────────────────────────────────────────────
const DIAS_SEMANA = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

interface MiniCalendarProps {
  startDate: string;            // YYYY-MM-DD
  endDate: string;              // YYYY-MM-DD
  onChange: (start: string, end: string) => void;
  periodoInicio: string;        // YYYY-MM-DD
  periodoFin: string;           // YYYY-MM-DD
  tabColor: string;
}

function MiniCalendar({ startDate, endDate, onChange, periodoInicio, periodoFin, tabColor }: MiniCalendarProps) {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  // Para la vista, usamos el inicio o el día de hoy
  const initialDate = startDate ? new Date(startDate + 'T00:00:00') : today;
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  const pStart = new Date(periodoInicio + 'T00:00:00');
  const pEnd = new Date(periodoFin + 'T00:00:00');

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const offset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const handleDateClick = (dateStr: string) => {
    if (startDate === endDate) {
      // Teníamos un solo punto (o nada seleccionado), ahora intentamos cerrar el rango
      if (dateStr < startDate) {
        // Si el click es antes del inicio, ese se vuelve el nuevo inicio
        onChange(dateStr, dateStr);
      } else if (dateStr === startDate) {
        // Si clickeamos el mismo día, lo dejamos como está (o podríamos resetear)
        onChange(dateStr, dateStr);
      } else {
        // Definimos el término
        onChange(startDate, dateStr);
      }
    } else {
      // Ya teníamos un rango o estamos empezando de cero. Empezamos nuevo punto único.
      onChange(dateStr, dateStr);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-3 w-full max-w-[280px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors">
          <ChevronLeft className="w-4 h-4 text-slate-500" />
        </button>
        <span className="text-sm font-black text-slate-700 uppercase tracking-widest">
          {MESES_ES[viewMonth]} {viewYear}
        </span>
        <button onClick={nextMonth} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors">
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      {/* Días de la semana */}
      <div className="grid grid-cols-7 mb-2">
        {DIAS_SEMANA.map(d => (
          <div key={d} className={cn(
            "text-center text-[9px] font-black uppercase tracking-widest py-1",
            d === 'Sá' || d === 'Do' ? "text-rose-300" : "text-slate-300"
          )}>{d}</div>
        ))}
      </div>

      {/* Días del mes */}
      <div className="grid grid-cols-7 gap-y-1">
        {Array.from({ length: offset }).map((_, i) => <div key={`empty-${i}`} />)}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
          const dayDate = new Date(dateStr + 'T00:00:00');
          
          const isStart = dateStr === startDate;
          const isEnd = dateStr === endDate;
          const inRange = dateStr >= startDate && dateStr <= endDate;
          const isToday = dateStr === todayStr;
          
          const inPeriod = dayDate >= pStart && dayDate <= pEnd;
          const holiday = isHoliday(dateStr);
          const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
          const isHolidaysOrWeekend = holiday || isWeekend;
          const isOutOfPeriod = !inPeriod;

          return (
            <button
              key={dateStr}
              onClick={() => handleDateClick(dateStr)}
              className={cn(
                "relative h-8 w-full rounded-xl text-[11px] font-black transition-all flex items-center justify-center group",
                inRange 
                  ? `bg-gradient-to-br ${tabColor} text-white shadow-md z-10` 
                  : isOutOfPeriod
                  ? "bg-amber-50 text-amber-500 hover:bg-amber-100"
                  : isHolidaysOrWeekend
                  ? "bg-rose-50/50 text-rose-500 hover:bg-rose-100 font-black"
                  : "text-slate-600 hover:bg-slate-100",
                isToday && !inRange && "ring-2 ring-primary/30",
                isStart && startDate !== endDate && "rounded-r-none",
                isEnd && startDate !== endDate && "rounded-l-none",
                inRange && startDate !== endDate && !isStart && !isEnd && "rounded-none opacity-90 scale-95"
              )}
            >
              {dayNum}
              {holiday && !inRange && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-400 border-2 border-white" />
              )}
              {isOutOfPeriod && !inRange && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400" />
              )}
              {/* Tooltip simple por title */}
              {holiday && <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[8px] px-2 py-1 rounded mb-2 whitespace-nowrap z-50 shadow-xl border border-white/20">FERIADO</div>}
            </button>
          );
        })}
      </div>

      {/* Leyenda */}
      <div className="mt-4 pt-3 border-t border-slate-50 flex flex-wrap gap-x-4 gap-y-2 text-[8px] font-black uppercase tracking-tighter text-slate-400">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-md bg-amber-100 border border-amber-200 inline-block" /> Desfase
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-md bg-rose-100 border border-rose-200 inline-block" /> Feriados
        </span>
        <span className="flex items-center gap-1">
          <span className={cn("w-2.5 h-2.5 rounded-md bg-gradient-to-br inline-block", tabColor)} /> Rango
        </span>
      </div>
    </div>
  );
}

// ─── Página Principal ──────────────────────────────────────────────────────────
export default function IngresoPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('fondos_presupuestarios');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [rows, setRows] = useState<RowData[]>([]);
  const [loading, setLoading] = useState(false);
  const [centroId, setCentroId] = useState('1');
  const [periodoId, setPeriodoId] = useState('5');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [centros, setCentros] = useState<any[]>([]);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // ─── Persistencia Local (Borradores) ──────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const storageKey = `draft_ingreso_${user.id}_${activeTab}_${periodoId}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRows(parsed);
        } else {
            setRows([]);
        }
      } catch (e) { console.error("Error loading draft:", e); }
    } else {
        setRows([]); 
    }
    
    if (user?.rol === 'CENTRO_SALUD' && user.centro_salud_id) {
      setCentroId(String(user.centro_salud_id));
    }

    const fetchCentros = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api-remuneracion.apscolab.com';
        const res = await axios.get(`${apiUrl}/centro-salud`);
        setCentros(res.data.filter((c: any) => 
          !c.parent_id && (
            c.nombre.toUpperCase().includes('CESFAM PANGUIPULLI') || 
            c.nombre.toUpperCase().includes('CESFAM CHOSHUENCO') || 
            c.nombre.toUpperCase().includes('CESFAM COÑARIPE') || 
            c.nombre.toUpperCase().includes('ADMINISTRACION CENTRAL') ||
            c.nombre.toUpperCase().includes('DEPARTAMENTO DE SALUD')
          )
        ));
      } catch (e) { console.error("Error fetching centers:", e); }
    };
    fetchCentros();
  }, [user, activeTab, periodoId]);

  useEffect(() => {
    if (!user || rows.length === 0) return;
    const storageKey = `draft_ingreso_${user.id}_${activeTab}_${periodoId}`;
    localStorage.setItem(storageKey, JSON.stringify(rows));
  }, [rows, user, activeTab, periodoId]);
  
  // Maestro Upload States
  const [showMaestroModal, setShowMaestroModal] = useState(false);
  const [maestroFile, setMaestroFile] = useState<File | null>(null);
  const [uploadingMaestro, setUploadingMaestro] = useState(false);

  // Período activo y su rango de medición
  const periodoActual = useMemo(() => PERIODOS.find(p => p.id === periodoId) ?? PERIODOS[1], [periodoId]);

  // ─── Helpers ──────────────────────────────────────────────────────────────────
  const isOutOfPeriod = (inicio: string, termino: string) => {
    if (!inicio || !termino) return false;
    const dStart = new Date(inicio + 'T00:00:00');
    const dEnd = new Date(termino + 'T00:00:00');
    const s = new Date(periodoActual.inicio + 'T00:00:00');
    const e = new Date(periodoActual.fin + 'T00:00:00');
    return dStart < s || dEnd > e;
  };

  const today = new Date().toISOString().split('T')[0];

  const addRow = () => {
    const lastRow = rows[rows.length - 1];
    setRows(prev => [...prev, {
      id: Math.random().toString(36).substring(7),
      rut: '',
      nombre: '',
      categoria_aps: '',
      nivel_aps: '',
      fecha_inicio: lastRow?.fecha_inicio || today,
      fecha_termino: lastRow?.fecha_termino || today,
      observaciones: lastRow?.observaciones || '',
      cantidad_25: '',
      cantidad_50: '',
      programa_nombre: lastRow?.programa_nombre || '',
      tipo_destino: lastRow?.tipo_destino || 'DENTRO COMUNA',
      monto: lastRow?.monto || '7000',
      tiempo: '',
      cant_habil: '0',
      valor_habil: lastRow?.valor_habil || '0',
      cant_inhabil: '0',
      valor_inhabil: lastRow?.valor_inhabil || '0'
    }]);
  };

  useEffect(() => {
    if (rows.length === 0) addRow();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const removeRow = (id: string) => {
    setRows(prev => prev.filter(r => r.id !== id));
    if (rows.length <= 1) addRow();
  };

  const updateRow = (id: string, field: keyof RowData, value: string) => {
    setRows(prev => prev.map(r => {
      if (r.id === id) {
        const updated = { ...r, [field]: value };
        if (field === 'tipo_destino' && activeTab === 'viaticos') {
          updated.monto = value === 'DENTRO COMUNA' ? '7000' : '9000';
        }
        if (!updated.programa_nombre) {
          if (activeTab === 'programas_turno') updated.programa_nombre = PROGRAMAS_TURNO_LIST[0];
          if (activeTab === 'programas_he') updated.programa_nombre = PROGRAMAS_HE_LIST[0];
        }
        return updated;
      }
      return r;
    }));
  };

  // ─── Búsqueda Funcionarios ─────────────────────────────────────────────────
  useEffect(() => {
    const fetchSearch = async () => {
      if (searchQuery.length < 2) { setSearchResults([]); setSearchError(null); return; }
      try {
        setSearchError(null);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api-remuneracion.apscolab.com';
        const res = await axios.get(`${apiUrl}/funcionarios/search?q=${searchQuery}`);
        setSearchResults(res.data);
      } catch (e: any) { 
        console.error(e);
        setSearchError(e.message || "Error de red");
      }
    };
    const delay = setTimeout(fetchSearch, 300);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  const handleSelectFuncionario = (rut: string, nombre: string, cat: string, niv: string) => {
    if (activeRowId) {
      setRows(prev => prev.map(r => r.id === activeRowId ? { ...r, rut, nombre, categoria_aps: cat || '', nivel_aps: niv || '' } : r));
    }
    setSearchQuery('');
    setSearchResults([]);
    setActiveRowId(null);
  };

  // ─── Respaldo por Fila ─────────────────────────────────────────────────────
  const handleFilePerRow = (id: string, file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setRows(prev => prev.map(r => r.id === id ? { ...r, url_respaldo: base64String } : r));
    };
    reader.readAsDataURL(file);
  };

  // ─── Guardar ───────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const validRows = rows.filter(r => r.rut);
    if (validRows.length === 0) {
      alert('Agregue al menos un funcionario antes de guardar.');
      return;
    }
    setLoading(true);
    try {
      const transacciones = validRows.map(r => ({ ...r }));
      const payload = {
        centro_salud_id: centroId,
        periodo_id: periodoId,
        tipo: activeTab,
        transacciones,
      };

      console.log('[Guardar] Enviando payload:', payload);
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'https://api-remuneracion.apscolab.com'}/ingresos/manual`, payload);
      console.log('[Guardar] Respuesta:', response.data);

      const { consolidado_id } = response.data;

      setShowSuccess(true);
      
      // Limpiar borrador local tras éxito
      if (user) {
        const storageKey = `draft_ingreso_${user.id}_${activeTab}_${periodoId}`;
        localStorage.removeItem(storageKey);
      }

      setRows([]);
      addRow();
      // Redirigir al consolidado específico después de 1.5 segundos
      setTimeout(() => {
        setShowSuccess(false);
        if (consolidado_id) {
          router.push(`/consolidados/${consolidado_id}`);
        } else {
          router.push('/consolidados');
        }
      }, 1500);
    } catch (error: any) {
      console.error('[Guardar] Error completo:', error);
      const msg = error?.response?.data?.message || error?.message || 'Error desconocido';
      alert(`Error al guardar: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMaestroUpload = async () => {
    if (!maestroFile || !periodoId) return;
    setUploadingMaestro(true);
    try {
      const formData = new FormData();
      formData.append('file', maestroFile);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api-remuneracion.apscolab.com';
      await axios.post(`${apiUrl}/remuneraciones/importar-maestro-mensual?periodoId=${periodoId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setShowMaestroModal(false);
      setMaestroFile(null);
      alert('Maestro de Funcionarios actualizado con éxito. Se han sincronizado categorías, niveles y datos personales.');
    } catch (error) {
      console.error('Error uploading maestro:', error);
      alert('Error al procesar la planilla maestra.');
    } finally {
      setUploadingMaestro(false);
    }
  };

  const getRowTotal = (r: RowData) => {
    if (activeTab === 'programas_turno') {
      return (Number(r.cant_habil) * Number(r.valor_habil)) + (Number(r.cant_inhabil) * Number(r.valor_inhabil));
    }
    return 0;
  };

  const activeTabInfo = TABS.find(t => t.id === activeTab)!;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen bg-[#f1f5f9] p-6 lg:p-10 pb-44 selection:bg-primary/20">
      
      {/* Background Decorative Elements */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[30%] h-[30%] bg-blue-500/5 rounded-full blur-[100px]" />
      </div>

      {/* Modal — Carga Maestro */}
      <AnimatePresence>
        {showMaestroModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[200] flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 40 }}
              className="bg-white/90 backdrop-blur-2xl rounded-[2.5rem] p-10 w-full max-w-xl shadow-[0_40px_80px_-10px_rgba(0,0,0,0.25)] border border-white"
            >
              <div className="flex items-center gap-8 mb-12">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center text-white shadow-xl shadow-primary/20">
                  <RefreshCcw className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tighter uppercase leading-none">Sincronizar Maestro</h3>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">Base de Datos de Funcionarios APS</p>
                </div>
              </div>

              <div className="space-y-8">
                <div 
                  className={cn(
                    "border-4 border-dashed rounded-[3rem] p-16 transition-all group flex flex-col items-center justify-center text-center cursor-pointer relative overflow-hidden",
                    maestroFile ? "border-emerald-200 bg-emerald-50/50" : "border-slate-100 hover:border-primary/20 hover:bg-slate-50/80"
                  )}
                  onClick={() => document.getElementById('maestro-upload')?.click()}
                >
                  <input 
                    id="maestro-upload" 
                    type="file" 
                    className="hidden" 
                    onChange={(e) => setMaestroFile(e.target.files?.[0] || null)}
                    accept=".xls,.xlsx"
                  />
                  {maestroFile ? (
                    <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="flex flex-col items-center">
                      <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center shadow-xl shadow-emerald-200 mb-6">
                        <CheckCircle2 className="w-10 h-10 text-white" />
                      </div>
                      <p className="text-xl font-black text-slate-800 tracking-tight">{maestroFile.name}</p>
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-3 bg-emerald-100 px-4 py-1 rounded-full">Listo para importar</p>
                    </motion.div>
                  ) : (
                    <>
                      <div className="w-20 h-20 bg-slate-50 rounded-[1.5rem] flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                        <Users className="w-10 h-10 text-slate-200" />
                      </div>
                      <p className="text-base font-black text-slate-400 uppercase tracking-widest mb-2">Selecciona el archivo Excel</p>
                      <p className="text-[10px] font-bold text-slate-300 italic max-w-sm">El sistema actualizará automáticamente categorías y niveles de todo el personal.</p>
                    </>
                  )}
                </div>
              </div>

              <div className="flex gap-6 mt-14">
                <button 
                  onClick={() => setShowMaestroModal(false)}
                  className="flex-1 py-6 rounded-3xl text-[11px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-100 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  disabled={!maestroFile || uploadingMaestro}
                  onClick={handleMaestroUpload}
                  className={cn(
                    "flex-[2] py-6 rounded-3xl text-[11px] font-black uppercase tracking-widest text-white shadow-2xl transition-all active:scale-95",
                    maestroFile ? "bg-primary shadow-primary/30 hover:brightness-110" : "bg-slate-200 cursor-not-allowed"
                  )}
                >
                  {uploadingMaestro ? "Procesando Datos..." : "Iniciar Sincronización"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <header className="relative z-10 flex flex-col xl:flex-row justify-between items-start xl:items-end gap-10 mb-16">
        <div>
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 mb-6"
          >
            <div className="flex items-center gap-3 px-5 py-2 rounded-full bg-white shadow-sm border border-slate-200/50 backdrop-blur-md">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" />
              <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">Registro Centralizado de Haberes</span>
            </div>
            
            <button 
              onClick={() => setShowMaestroModal(true)}
              className="flex items-center gap-2 px-5 py-2 rounded-full bg-slate-900 text-white hover:bg-primary transition-all shadow-xl shadow-slate-200 group"
            >
              <RefreshCcw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-700" />
              <span className="text-[9px] font-black uppercase tracking-widest">Sincronizar Maestro</span>
            </button>
          </motion.div>
          <h1 className="text-3xl xl:text-5xl font-black text-slate-900 leading-[0.9] tracking-tighter">
            Editor de <br/><span className="text-primary italic">Novedades</span>
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full xl:w-auto">
          {/* Selector Centro */}
          <div className="bg-white/60 backdrop-blur-md border border-white rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                <Stethoscope className="w-4 h-4" />
              </div>
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Unidad de Salud</span>
            </div>
            <select 
              disabled={user?.rol === 'CENTRO_SALUD'}
              value={centroId} 
              onChange={(e) => setCentroId(e.target.value)}
              className={cn(
                "font-black text-slate-800 text-base outline-none bg-transparent appearance-none w-full",
                user?.rol === 'CENTRO_SALUD' ? "cursor-not-allowed opacity-50" : "cursor-pointer"
              )}
            >
              {centros.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>

          {/* Selector Período */}
          <div className="bg-white/60 backdrop-blur-md border border-white rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                <Calendar className="w-4 h-4" />
              </div>
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Período de Nómina</span>
            </div>
            <select value={periodoId} onChange={(e) => setPeriodoId(e.target.value)}
              className="font-black text-slate-800 text-base outline-none bg-transparent appearance-none cursor-pointer w-full"
            >
              {PERIODOS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>

          {/* Info del período de medición */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-[2rem] p-6 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:scale-150 transition-transform duration-700" />
            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/40 mb-3 flex items-center gap-2">
              <Clock className="w-3 h-3" /> Ventana de Medición
            </p>
            <p className="text-sm font-black tracking-tight flex items-center gap-2">
              {new Date(periodoActual.inicio + 'T00:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
              <ChevronRight className="w-4 h-4 text-primary" />
              {new Date(periodoActual.fin + 'T00:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>

          {/* Toggle vista */}
          <div className="flex items-center justify-center bg-white/60 backdrop-blur-md border border-white rounded-[2rem] p-2 shadow-sm">
            <button
              onClick={() => setViewMode('cards')}
              className={cn("flex-1 h-full rounded-[1.5rem] flex items-center justify-center gap-2 transition-all font-black text-[10px] uppercase tracking-widest", viewMode === 'cards' ? "bg-primary text-white shadow-lg" : "text-slate-400 hover:text-slate-600")}
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Tarjetas</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={cn("flex-1 h-full rounded-[1.5rem] flex items-center justify-center gap-2 transition-all font-black text-[10px] uppercase tracking-widest", viewMode === 'table' ? "bg-primary text-white shadow-lg" : "text-slate-400 hover:text-slate-600")}
            >
              <Table2 className="w-4 h-4" />
              <span className="hidden sm:inline">Tabla</span>
            </button>
          </div>
        </div>
      </header>

      {/* Modal Vincular Funcionario Global */}
      <AnimatePresence>
        {activeRowId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[200] flex items-center justify-center p-6"
            onClick={() => setActiveRowId(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-[2.5rem] shadow-2xl p-6 w-full max-w-md border border-white"
            >
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/10 shadow-inner">
                    <Search className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800 tracking-tighter uppercase">Buscar Funcionario</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Nómina Clínica APS</p>
                  </div>
                </div>
                <button onClick={() => setActiveRowId(null)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-all active:scale-90">
                  <Plus className="w-5 h-5 rotate-45" />
                </button>
              </div>

              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
                <input 
                  autoFocus
                  className="w-full bg-slate-50 rounded-xl pl-11 pr-4 py-3 text-xs font-black outline-none border-2 border-transparent focus:border-primary/20 focus:bg-white transition-all shadow-inner"
                  placeholder="Ej: 15.123.456-7..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-3 custom-scrollbar">
                {searchResults.length > 0 ? (
                  searchResults.map(f => (
                    <button 
                      key={f.rut}
                      onClick={() => handleSelectFuncionario(f.rut, f.nombre_completo, f.categoria_aps || '', f.nivel_aps?.toString() || '')}
                      className="w-full text-left p-5 bg-white hover:bg-slate-50 rounded-[2rem] transition-all border border-slate-100 hover:border-primary/20 flex justify-between items-center group shadow-sm hover:shadow-md"
                    >
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 font-black text-xs group-hover:bg-primary group-hover:text-white transition-all">
                            {f.nombre_completo.split(' ').map((n:any)=>n[0]).join('').slice(0,2)}
                         </div>
                         <div>
                          <p className="text-sm font-black text-slate-800 leading-tight mb-1 group-hover:text-primary transition-colors">{f.nombre_completo}</p>
                          <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">{f.rut} • {f.centro_salud?.nombre}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-black text-primary bg-primary/5 px-3 py-1.5 rounded-full border border-primary/10">
                          Cat. {f.categoria_aps}
                        </span>
                      </div>
                    </button>
                  ))
                ) : searchQuery.length >= 2 ? (
                  <div className="py-12 text-center">
                    <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest">No se encontraron registros</p>
                  </div>
                ) : (
                  <div className="py-12 text-center opacity-30">
                    <Users className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                    <p className="text-[11px] font-black uppercase tracking-[0.2em]">Inicie la búsqueda</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Tabs ─────────────────────────────────────────────────────────────── */}
      <nav className="relative z-10 flex items-center p-1.5 bg-white/60 backdrop-blur-md rounded-3xl border border-white mb-8 self-start max-w-full overflow-x-auto no-scrollbar shadow-sm">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as TabType); setRows([]); addRow(); }}
              className={cn(
                "relative flex items-center gap-3 px-6 py-3 rounded-full transition-all duration-500 whitespace-nowrap group",
                isActive ? "text-white" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <tab.icon className={cn("w-4 h-4 transition-all", isActive ? "scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]" : "group-hover:scale-110")} />
              <span className="text-[10px] font-black uppercase tracking-[0.1em] leading-none">{tab.label}</span>
              {isActive && (
                <motion.div
                  layoutId="activeTabBg"
                  className={cn("absolute inset-0 bg-gradient-to-br rounded-full -z-10 shadow-2xl", tab.color)}
                  transition={{ type: "spring", bounce: 0.15, duration: 0.8 }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* ══════════════════════════════════════════════════════════════════════
          VISTA TARJETAS — REDISEÑADA "PREMIUM"
       ══════════════════════════════════════════════════════════════════════ */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 items-start relative z-10">
          <AnimatePresence mode="popLayout">
            {rows.map((row, index) => {
              const outOfPeriod = isOutOfPeriod(row.fecha_inicio, row.fecha_termino);
              const isSelected = !!row.rut;

              return (
                  <motion.div
                    key={row.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -30, transition: { duration: 0.3 } }}
                    className={cn(
                      "group bg-white/95 backdrop-blur-2xl rounded-[2.5rem] p-6 shadow-[0_15px_40px_rgba(0,0,0,0.03)] hover:shadow-[0_30px_60px_rgba(0,0,0,0.06)] border transition-all duration-700 relative overflow-hidden",
                      outOfPeriod ? "border-amber-200 ring-1 ring-amber-100/20" : "border-white hover:border-primary/10"
                    )}
                  >
                  {/* Numero de Registro sutil */}
                  <div className="absolute top-6 left-6 text-[40px] font-black text-slate-50 select-none -z-0 pointer-events-none">
                    {String(index + 1).padStart(2, '0')}
                  </div>

                  {/* Badge desfase */}
                  {outOfPeriod && (
                    <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                      className="absolute top-6 right-6 flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-600 rounded-full px-4 py-2 text-[8px] font-black uppercase tracking-[0.2em] shadow-sm z-20"
                    >
                      <AlertTriangle className="w-3 h-3" />
                      Desfase Documentario
                    </motion.div>
                  )}

                  {/* Card Header — Funcionario */}
                    <div className="flex justify-between items-start mb-8 relative z-10">
                    <div className="flex items-center gap-5">
                      <div className={cn(
                        "w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white shadow-xl transition-all duration-700 group-hover:scale-105 group-hover:rotate-2", 
                        isSelected ? activeTabInfo.color : "from-slate-100 to-slate-200 text-slate-300"
                      )}>
                        {isSelected ? (
                           <div className="font-black text-lg">{row.nombre.split(' ').map(n=>n[0]).join('').slice(0,2)}</div>
                        ) : (
                           <User className="w-7 h-7" />
                        )}
                      </div>
                      <div>
                        {row.rut ? (
                          <div className="space-y-2">
                            <h4 className="text-lg font-black text-slate-800 leading-none tracking-tighter">{row.nombre}</h4>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-2.5 py-1 rounded-lg uppercase tracking-widest">{row.rut}</span>
                              <span className={cn("text-[9px] font-black text-white px-2.5 py-1 rounded-lg uppercase tracking-widest shadow-md", activeTabInfo.color)}>
                                Cat {row.categoria_aps} • Niv {row.nivel_aps}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setActiveRowId(row.id)}
                            className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-slate-400 hover:text-primary hover:border-primary/20 hover:bg-white transition-all group"
                          >
                            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Vincular Funcionario</span>
                          </button>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => removeRow(row.id)}
                      className="p-2 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all mt-1"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  {/* DISEÑO EN COLUMNAS: Calendario | Inputs */}
                  <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8">
                    
                    {/* Columna 1: Calendario de Referencia o Búsqueda Inline */}
                    <div className="relative">
                        {activeTab !== 'atrasos' ? (
                          <>
                            <div className="flex items-center gap-2 mb-4">
                              <Calendar className="w-4 h-4 text-slate-400" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fecha de Registro</span>
                            </div>
                            <MiniCalendar
                              startDate={row.fecha_inicio}
                              endDate={row.fecha_termino}
                              onChange={(s, e) => {
                                setRows(prev => prev.map(r => r.id === row.id ? { ...r, fecha_inicio: s, fecha_termino: e } : r));
                              }}
                              periodoInicio={periodoActual.inicio}
                              periodoFin={periodoActual.fin}
                              tabColor={activeTabInfo.color}
                            />
                          </>
                        ) : (
                          <div className="h-full flex items-center justify-center bg-slate-50 rounded-3xl border border-slate-100 p-8 text-center">
                             <div>
                               <AlertTriangle className="w-8 h-8 text-slate-300 mx-auto mb-4" />
                               <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Sumatoria del Período</p>
                               <p className="text-[9px] font-bold text-slate-400 mt-2">Los atrasos y permisos no requieren especificar días exactos.</p>
                             </div>
                          </div>
                        )}
                    </div>

                    {/* Columna 2: Inputs de Totales */}
                    <div className="flex flex-col justify-center">
                      {activeTab === 'fondos_presupuestarios' && (
                        <div className="space-y-4">
                          <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100/50 relative overflow-hidden group/he">
                            <label className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-2 block">Total Horas 25%</label>
                            <input type="number" step="0.01" value={row.cantidad_25} onChange={e => updateRow(row.id, 'cantidad_25', e.target.value)} className="w-full bg-transparent text-4xl font-black text-slate-800 outline-none focus:ring-2 focus:ring-blue-400/50 rounded-xl transition-all" placeholder="0.00" />
                          </div>
                          <div className="bg-indigo-50/50 p-6 rounded-[2rem] border border-indigo-100/50 relative overflow-hidden group/he50">
                            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-2 block">Total Horas 50%</label>
                            <input type="number" step="0.01" value={row.cantidad_50} onChange={e => updateRow(row.id, 'cantidad_50', e.target.value)} className="w-full bg-transparent text-4xl font-black text-slate-800 outline-none focus:ring-2 focus:ring-indigo-400/50 rounded-xl transition-all" placeholder="0.00" />
                          </div>
                        </div>
                      )}

                      {activeTab === 'programas_he' && (
                        <div className="space-y-4">
                          <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                            <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Programa (Convenio)</label>
                            <select value={row.programa_nombre} onChange={e => updateRow(row.id, 'programa_nombre', e.target.value)} className="w-full bg-white rounded-2xl px-4 py-3 text-xs font-black text-slate-700 outline-none focus:ring-2 focus:ring-slate-300 uppercase shadow-sm border border-slate-100 transition-all cursor-pointer hover:border-slate-300">
                              {PROGRAMAS_HE_LIST.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-teal-50/50 p-5 rounded-[2rem] border border-teal-100/50">
                              <label className="text-[9px] font-black text-teal-500 uppercase mb-1 block">Total 25%</label>
                              <input type="number" step="0.01" value={row.cantidad_25} onChange={e => updateRow(row.id, 'cantidad_25', e.target.value)} className="w-full bg-transparent text-2xl font-black text-slate-800 outline-none focus:ring-2 focus:ring-teal-400/50 rounded-lg transition-all" placeholder="0.00" />
                            </div>
                            <div className="bg-emerald-50/50 p-5 rounded-[2rem] border border-emerald-100/50">
                              <label className="text-[9px] font-black text-emerald-500 uppercase mb-1 block">Total 50%</label>
                              <input type="number" step="0.01" value={row.cantidad_50} onChange={e => updateRow(row.id, 'cantidad_50', e.target.value)} className="w-full bg-transparent text-2xl font-black text-slate-800 outline-none focus:ring-2 focus:ring-emerald-400/50 rounded-lg transition-all" placeholder="0.00" />
                            </div>
                          </div>
                        </div>
                      )}

                      {activeTab === 'programas_turno' && (
                        <div className="space-y-4">
                          <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                            <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Programa / Sector</label>
                            <select value={row.programa_nombre} onChange={e => updateRow(row.id, 'programa_nombre', e.target.value)} className="w-full bg-white rounded-2xl px-4 py-3 text-xs font-black text-slate-700 outline-none focus:ring-2 focus:ring-slate-300 uppercase shadow-sm border border-slate-100 transition-all cursor-pointer hover:border-slate-300">
                              {PROGRAMAS_TURNO_LIST.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                          </div>
                          <div className="grid grid-cols-1 gap-4">
                            <div className="bg-blue-50/30 p-5 rounded-3xl border border-blue-100/30">
                              <label className="text-[9px] font-black text-blue-500 uppercase mb-3 block text-center">Turnos Hábiles</label>
                              <div className="flex gap-4">
                                <div className="flex-1">
                                  <span className="text-[8px] font-bold text-slate-300 block mb-1">CANT</span>
                                  <input type="number" value={row.cant_habil} onChange={e => updateRow(row.id, 'cant_habil', e.target.value)} className="w-full bg-white rounded-xl px-4 py-2 font-black text-center outline-none focus:ring-2 focus:ring-blue-400/50 transition-all shadow-sm" />
                                </div>
                                <div className="flex-1">
                                  <span className="text-[8px] font-bold text-slate-300 block mb-1">VALOR $</span>
                                  <input type="number" value={row.valor_habil} onChange={e => updateRow(row.id, 'valor_habil', e.target.value)} className="w-full bg-white rounded-xl px-4 py-2 font-black text-center text-blue-600 outline-none focus:ring-2 focus:ring-blue-400/50 transition-all shadow-sm" />
                                </div>
                              </div>
                            </div>
                            <div className="bg-purple-50/30 p-5 rounded-3xl border border-purple-100/30">
                              <label className="text-[9px] font-black text-purple-500 uppercase mb-3 block text-center">Turnos Inhábiles</label>
                              <div className="flex gap-4">
                                <div className="flex-1">
                                  <span className="text-[8px] font-bold text-slate-300 block mb-1">CANT</span>
                                  <input type="number" value={row.cant_inhabil} onChange={e => updateRow(row.id, 'cant_inhabil', e.target.value)} className="w-full bg-white rounded-xl px-4 py-2 font-black text-center outline-none focus:ring-2 focus:ring-purple-400/50 transition-all shadow-sm" />
                                </div>
                                <div className="flex-1">
                                  <span className="text-[8px] font-bold text-slate-300 block mb-1">VALOR $</span>
                                  <input type="number" value={row.valor_inhabil} onChange={e => updateRow(row.id, 'valor_inhabil', e.target.value)} className="w-full bg-white rounded-xl px-4 py-2 font-black text-center text-purple-600 outline-none focus:ring-2 focus:ring-purple-400/50 transition-all shadow-sm" />
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="bg-slate-900 rounded-[2rem] p-6 text-white flex justify-between items-center">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Total</p>
                              <p className="text-2xl font-black text-emerald-400">${getRowTotal(row).toLocaleString('es-CL')}</p>
                            </div>
                            <DollarSign className="w-8 h-8 opacity-20" />
                          </div>
                        </div>
                      )}

                      {activeTab === 'viaticos' && (
                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Tipo de Destino</label>
                          <select value={row.tipo_destino} onChange={e => updateRow(row.id, 'tipo_destino', e.target.value as any)} className="w-full bg-slate-50 rounded-2xl px-6 py-4 text-xs font-black outline-none border border-slate-100">
                            <option value="DENTRO COMUNA">Dentro de Comuna</option>
                            <option value="FUERA COMUNA">Fuera de Comuna</option>
                          </select>
                          <div className="bg-emerald-50 rounded-[2rem] p-6 flex justify-between items-center border border-emerald-100">
                            <span className="text-xs font-black uppercase text-emerald-800">Monto Diario</span>
                            <input type="number" value={row.monto} onChange={e => updateRow(row.id, 'monto', e.target.value)} className="w-32 bg-transparent text-right text-2xl font-black text-emerald-600 outline-none" />
                          </div>
                        </div>
                      )}

                      {activeTab === 'atrasos' && (
                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Tiempo a Descontar (HH:MM)</label>
                          <div className="relative">
                            <Clock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 w-6 h-6" />
                            <input type="text" value={row.tiempo} onChange={e => updateRow(row.id, 'tiempo', e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-[2rem] pl-16 pr-6 py-6 text-3xl font-black text-slate-800 outline-none" placeholder="00:00" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Observaciones */}
                  <div className="mt-8 relative">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Observaciones</label>
                    <textarea
                      value={row.observaciones}
                      onChange={e => updateRow(row.id, 'observaciones', e.target.value)}
                      className="w-full bg-slate-50/50 rounded-[2rem] p-6 text-xs font-bold text-slate-600 outline-none border border-slate-100 focus:border-slate-300 transition-all min-h-[100px] resize-none"
                      placeholder="Observaciones adicionales..."
                    />
                  </div>

                  {/* Respaldo Per-Row (Granular) */}
                  <div className="mt-4 flex justify-end">
                    <label className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all",
                      row.url_respaldo ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-slate-50 text-slate-400 hover:bg-slate-100 border border-slate-100"
                    )}>
                      <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={e => handleFilePerRow(row.id, e.target.files?.[0] || null)} />
                      {row.url_respaldo ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Respaldo OK
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          Adjuntar Respaldo
                        </>
                      )}
                    </label>
                  </div>

                  {/* Número de tarjeta */}
                  <div className="absolute -left-3 top-8 w-10 h-10 rounded-full bg-white shadow-xl border border-slate-100 flex items-center justify-center text-[10px] font-black text-slate-300 z-10 group-hover:text-primary transition-colors">
                    #{index + 1}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Botón Añadir */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={addRow}
            className="flex flex-col items-center justify-center p-12 rounded-[2.5rem] border-4 border-dashed border-slate-200 hover:border-primary/30 hover:bg-primary/5 transition-all group min-h-[400px]"
          >
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-all">
              <Plus className="w-8 h-8" />
            </div>
            <span className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-primary transition-all">Agregar Registro</span>
            <p className="text-[10px] font-bold text-slate-300 mt-2 text-center max-w-xs">Haga clic para añadir una nueva novedad clínica</p>
          </motion.button>
        </div>

      ) : (
        /* ══════════════════════════════════════════════════════════════════════
           VISTA TABLA
        ══════════════════════════════════════════════════════════════════════ */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2rem] shadow-xl overflow-hidden border border-slate-100"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-16">#</th>
                  <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-64">Funcionario</th>
                  {activeTab !== 'atrasos' && (
                    <>
                      <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha Exacta</th>
                      <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">⚠</th>
                    </>
                  )}

                  {activeTab === 'fondos_presupuestarios' && (<>
                    <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">25%</th>
                    <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">50%</th>
                  </>)}

                  {activeTab === 'programas_he' && (<>
                    <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Programa</th>
                    <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">25%</th>
                    <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">50%</th>
                  </>)}

                  {activeTab === 'programas_turno' && (<>
                    <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Programa</th>
                    <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Cant. H.</th>
                    <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">$ Val. H.</th>
                    <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Cant. I.</th>
                    <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">$ Val. I.</th>
                  </>)}

                  {activeTab === 'viaticos' && (<>
                    <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Destino</th>
                    <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">$ Monto</th>
                  </>)}

                  {activeTab === 'atrasos' && (
                    <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tiempo</th>
                  )}

                  <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Respaldo</th>
                  <th className="px-4 py-5 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map((row, index) => {
                  const outOfPeriod = isOutOfPeriod(row.fecha_inicio, row.fecha_termino);
                  return (
                    <tr key={row.id} className={cn("hover:bg-slate-50 transition-colors", outOfPeriod && "bg-amber-50/50")}>
                      <td className="px-6 py-3 text-center text-[10px] font-black text-slate-300">#{index + 1}</td>
                      <td className="px-4 py-3 relative min-w-[250px]">
                        {row.rut ? (
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-black text-[10px] text-slate-400">
                                {row.nombre.charAt(0)}
                            </div>
                            <div>
                                <p className="text-xs font-black text-slate-700 leading-tight">{row.nombre}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{row.rut}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="relative">
                            <button 
                                onClick={() => setActiveRowId(row.id)} 
                                className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1 hover:scale-105 transition-transform"
                            >
                                <Plus className="w-3 h-3" /> Vincular
                            </button>
                          </div>
                        )}
                      </td>
                      {/* Rango de Fechas */}
                      {activeTab !== 'atrasos' && (
                        <>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1">
                              <input
                                type="date"
                                value={row.fecha_inicio}
                                onChange={e => updateRow(row.id, 'fecha_inicio', e.target.value)}
                                className={cn(
                                  "bg-slate-50 rounded-lg py-1 px-2 text-[9px] font-bold text-slate-600 outline-none border",
                                  isOutOfPeriod(row.fecha_inicio, row.fecha_termino) ? "border-amber-300 bg-amber-50" : "border-slate-200"
                                )}
                              />
                              <input
                                type="date"
                                value={row.fecha_termino}
                                onChange={e => updateRow(row.id, 'fecha_termino', e.target.value)}
                                className={cn(
                                  "bg-slate-50 rounded-lg py-1 px-2 text-[9px] font-bold text-slate-600 outline-none border",
                                  isOutOfPeriod(row.fecha_inicio, row.fecha_termino) ? "border-amber-300 bg-amber-50" : "border-slate-200"
                                )}
                              />
                            </div>
                          </td>
                          {/* Indicador desfase */}
                          <td className="px-4 py-3 text-center">
                            {outOfPeriod ? (
                              <span title="Fecha fuera del período de medición">
                                <AlertTriangle className="w-4 h-4 text-amber-500 mx-auto" />
                              </span>
                            ) : <span className="text-slate-200 text-xs">—</span>}
                          </td>
                        </>
                      )}

                      {activeTab === 'fondos_presupuestarios' && (<>
                        <td className="px-4 py-3"><input type="number" step="0.01" value={row.cantidad_25} onChange={e => updateRow(row.id, 'cantidad_25', e.target.value)} className="w-16 bg-slate-50 rounded-lg py-2 text-center text-[11px] font-black border border-slate-200" /></td>
                        <td className="px-4 py-3"><input type="number" step="0.01" value={row.cantidad_50} onChange={e => updateRow(row.id, 'cantidad_50', e.target.value)} onKeyDown={e => e.key === 'Enter' && addRow()} className="w-16 bg-slate-50 rounded-lg py-2 text-center text-[11px] font-black border border-slate-200" /></td>
                      </>)}

                      {activeTab === 'programas_he' && (<>
                        <td className="px-4 py-3"><select value={row.programa_nombre} onChange={e => updateRow(row.id, 'programa_nombre', e.target.value)} className="w-48 bg-slate-50 rounded-lg py-2 px-2 text-[10px] font-black text-slate-600 outline-none uppercase border border-slate-200">{PROGRAMAS_HE_LIST.map(p => <option key={p} value={p}>{p}</option>)}</select></td>
                        <td className="px-4 py-3"><input type="number" step="0.01" value={row.cantidad_25} onChange={e => updateRow(row.id, 'cantidad_25', e.target.value)} className="w-16 bg-slate-50 rounded-lg py-2 text-center text-[11px] font-black border border-slate-200" /></td>
                        <td className="px-4 py-3"><input type="number" step="0.01" value={row.cantidad_50} onChange={e => updateRow(row.id, 'cantidad_50', e.target.value)} onKeyDown={e => e.key === 'Enter' && addRow()} className="w-16 bg-slate-50 rounded-lg py-2 text-center text-[11px] font-black border border-slate-200" /></td>
                      </>)}

                      {activeTab === 'programas_turno' && (<>
                        <td className="px-4 py-3"><select value={row.programa_nombre} onChange={e => updateRow(row.id, 'programa_nombre', e.target.value)} className="w-48 bg-slate-50 rounded-lg py-2 px-2 text-[10px] font-black text-slate-600 outline-none uppercase border border-slate-200">{PROGRAMAS_TURNO_LIST.map(p => <option key={p} value={p}>{p}</option>)}</select></td>
                        <td className="px-4 py-3"><input type="number" value={row.cant_habil} onChange={e => updateRow(row.id, 'cant_habil', e.target.value)} className="w-14 bg-slate-50 rounded-lg py-2 text-center text-[11px] font-black border border-slate-200" /></td>
                        <td className="px-4 py-3"><input type="number" value={row.valor_habil} onChange={e => updateRow(row.id, 'valor_habil', e.target.value)} className="w-20 bg-slate-50 rounded-lg py-2 text-center text-[11px] font-black text-blue-600 border border-slate-200" /></td>
                        <td className="px-4 py-3"><input type="number" value={row.cant_inhabil} onChange={e => updateRow(row.id, 'cant_inhabil', e.target.value)} className="w-14 bg-slate-50 rounded-lg py-2 text-center text-[11px] font-black border border-slate-200" /></td>
                        <td className="px-4 py-3"><input type="number" value={row.valor_inhabil} onChange={e => updateRow(row.id, 'valor_inhabil', e.target.value)} onKeyDown={e => e.key === 'Enter' && addRow()} className="w-20 bg-slate-50 rounded-lg py-2 text-center text-[11px] font-black text-purple-600 border border-slate-200" /></td>
                      </>)}

                      {activeTab === 'viaticos' && (<>
                        <td className="px-4 py-3"><select value={row.tipo_destino} onChange={e => updateRow(row.id, 'tipo_destino', e.target.value as any)} className="w-36 bg-slate-50 rounded-lg py-2 px-2 text-[10px] font-black text-slate-600 outline-none border border-slate-200"><option value="DENTRO COMUNA">Dentro Comuna</option><option value="FUERA COMUNA">Fuera Comuna</option></select></td>
                        <td className="px-4 py-3"><input type="number" value={row.monto} onChange={e => updateRow(row.id, 'monto', e.target.value)} onKeyDown={e => e.key === 'Enter' && addRow()} className="w-20 bg-slate-50 rounded-lg py-2 text-center text-[11px] font-black text-emerald-600 border border-slate-200" /></td>
                      </>)}

                      {activeTab === 'atrasos' && (
                        <td className="px-4 py-3"><input type="text" value={row.tiempo} onChange={e => updateRow(row.id, 'tiempo', e.target.value)} onKeyDown={e => e.key === 'Enter' && addRow()} className="w-20 bg-slate-50 rounded-lg py-2 text-center text-[11px] font-black border border-slate-200" /></td>
                      )}

                      <td className="px-4 py-3 text-center">
                        <label className="cursor-pointer">
                          <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={e => handleFilePerRow(row.id, e.target.files?.[0] || null)} />
                          {row.url_respaldo ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
                          ) : (
                            <Plus className="w-4 h-4 text-slate-300 hover:text-primary mx-auto" />
                          )}
                        </label>
                      </td>

                      <td className="px-4 py-3">
                        <button onClick={() => removeRow(row.id)} className="p-2 text-slate-200 hover:text-rose-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-slate-50/50 border-t border-slate-100">
            <button onClick={addRow} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/70 transition-colors">
              <Plus className="w-4 h-4" /> Agregar Fila
            </button>
          </div>
        </motion.div>
      )}

      {/* ── Floating Save Bar ────────────────────────────────────────────────── */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-6">
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="glass p-2 rounded-full shadow-[0_20px_50px_-12px_rgba(0,0,0,0.2)] border border-white/20 flex items-center justify-between"
        >
          <div className="flex items-center gap-4 pl-6">
            <div>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Registros</p>
              <p className="text-2xl font-black text-slate-800 tracking-tighter">{rows.filter(r => r.rut).length}</p>
            </div>
            <div className="h-8 w-[1px] bg-slate-200" />
            <div className="hidden sm:block">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Período</p>
              <p className="text-[10px] font-black text-slate-600">{periodoActual.label}</p>
            </div>
            {rows.some(r => isOutOfPeriod(r.fecha_inicio, r.fecha_termino)) && (
              <>
                <div className="h-8 w-[1px] bg-slate-200" />
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-[10px] font-black text-amber-600 uppercase">Desfases</span>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <AnimatePresence>
              {showSuccess && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-emerald-500 text-white px-5 py-3 rounded-full flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Guardado OK</span>
                </motion.div>
              )}
            </AnimatePresence>
            <button
              onClick={() => {
                const storageKey = `draft_ingreso_${user?.id}_${activeTab}_${periodoId}`;
                localStorage.setItem(storageKey, JSON.stringify(rows));
                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 2000);
              }}
              className="flex items-center gap-2 bg-white text-slate-500 px-4 py-3.5 rounded-full font-black uppercase tracking-widest border border-slate-100 hover:bg-slate-50 transition-all text-[9px] whitespace-nowrap"
            >
              <Clock className="w-4 h-4 text-slate-400" />
              Borrador
            </button>
            <button
              onClick={handleSave}
              disabled={loading || rows.every(r => !r.rut)}
              className={cn(
                "flex items-center gap-2 bg-gradient-to-br from-slate-800 to-slate-900 text-white px-6 py-3.5 rounded-full font-black uppercase tracking-widest shadow-lg hover:shadow-primary/20 transition-all text-[10px] disabled:opacity-50 whitespace-nowrap",
                !loading && "hover:from-primary hover:to-indigo-600"
              )}
            >
              {loading ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Enviar Lote
            </button>
          </div>
        </motion.div>
      </div>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .glass { background: rgba(255,255,255,0.85); backdrop-filter: blur(24px); }
      `}</style>
    </div>
  );
}
