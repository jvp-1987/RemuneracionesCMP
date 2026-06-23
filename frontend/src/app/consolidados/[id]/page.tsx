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
  rendicion_pasajes?: number;
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
  tipo_tens?: string;
}

interface ConsolidadoDetail {
  id: number;
  estado_actual_enum: string;
  vb_control_interno: boolean;
  vb_finanzas: boolean;
  vb_contabilidad?: boolean;
  fecha_vb_contabilidad?: string | Date;
  firma_vb_contabilidad?: string;
  centro_salud: { nombre: string; id: number };
  periodo: { mes: number; anio: number };
  horas_extras: Transaction[];
  viaticos: Transaction[];
  atrasos: Transaction[];
  procedimientos: Transaction[];
  turnos_urgencia: Transaction[];
  url_respaldo?: string;
  usuario_gestor?: { nombre: string };
}

export default function ConsolidadoDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<ConsolidadoDetail | null>(null);
  const [activeTab, setActiveTab] = useState<'horas' | 'viaticos' | 'atrasos' | 'procedimientos' | 'turnos' | 'revision_contable'>('horas');
  const [selectedProgramId, setSelectedProgramId] = useState<number | 'procedimientos_aps' | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'PENDIENTE' | 'APROBADO' | 'RECHAZADO'>('TODOS');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addSearchQuery, setAddSearchQuery] = useState('');
  const [addSearchResults, setAddSearchResults] = useState<any[]>([]);
  const [selectedFuncionario, setSelectedFuncionario] = useState<any>(null);
  const [programas, setProgramas] = useState<any[]>([]);
  const [isSavingNew, setIsSavingNew] = useState(false);
  const [relojData, setRelojData] = useState<Record<string, any[]> | null>(null);
  const [isRelojLoading, setIsRelojLoading] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newFileBase64, setNewFileBase64] = useState<string | null>(null);

  const canValidateControl = user?.rol === 'ADMIN' || user?.rol === 'ADMIN_MAESTRO' || user?.rol === 'CONTROL';
  const canValidateContabilidad = user?.rol === 'ADMIN' || user?.rol === 'ADMIN_MAESTRO' || user?.rol === 'CONTABILIDAD';
  const canValidateFinanzas = user?.rol === 'ADMIN' || user?.rol === 'ADMIN_MAESTRO' || user?.rol === 'FINANZAS';
  const canFinalize = user?.rol === 'ADMIN' || user?.rol === 'ADMIN_MAESTRO';
  
  // A record is locked for CENTRO_SALUD/SECRETARIA if Control Interno already gave V°B°, or if user is INVITADO
  const isLocked = (data?.vb_control_interno && ['CENTRO_SALUD', 'SECRETARIA'].includes(user?.rol || '')) || user?.rol === 'INVITADO';

  const fetchData = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api-remuneracion.apscolab.com';
      const res = await axios.get(`${apiUrl}/consolidados/${id}`);
      const consolidadoData = res.data;

      // Security check: If CENTRO_SALUD or SECRETARIA, must match their assigned center
      if (['CENTRO_SALUD', 'SECRETARIA'].includes(user?.rol || '') && user?.centro_salud_id && consolidadoData.centro_salud.id !== user?.centro_salud_id) {
        console.warn('Unauthorized access to consolidado of another center');
        router.push('/consolidados');
        return;
      }

      setData(consolidadoData);
      if (consolidadoData.reloj_data) {
        setRelojData(consolidadoData.reloj_data);
      }
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
      const payload = { ...updatedFields };
      if (newFileBase64) {
        payload.url_respaldo = newFileBase64;
      }
      
      await axios.patch(`${apiUrl}/${endpoint}/${editingRecord.id}`, payload);
      
      setData(prev => {
        if (!prev) return null;
        const key = type === 'horas' ? 'horas_extras' : type === 'viaticos' ? 'viaticos' : type === 'atrasos' ? 'atrasos' : type === 'procedimientos' ? 'procedimientos' : 'turnos_urgencia';
        return {
          ...prev,
          [key]: (prev as any)[key].map((t: any) => {
            if (t.id === editingRecord.id) {
              const updatedObj = { ...t, ...payload };
              if (payload.programa_id) {
                const matchedProg = programas.find(p => p.id === payload.programa_id);
                if (matchedProg) {
                  updatedObj.programa = matchedProg;
                }
              }
              return updatedObj;
            }
            return t;
          })
        };
      });
      
      setIsEditModalOpen(false);
      setEditingRecord(null);
      setNewFileBase64(null);
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
      await fetchData();
    } catch (err) { console.error('Error finalizing:', err); }
  };

  const handleDownloadExcel = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api-remuneracion.apscolab.com';
      const response = await axios.get(`${apiUrl}/consolidados/${id}/export`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const filename = `consolidado_${data?.centro_salud.nombre.replace(/\s+/g, '_')}_${data?.periodo.mes}_${data?.periodo.anio}.xlsx`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error downloading consolidado:', err);
      alert('Error al descargar el consolidado');
    }
  };


  const handleToggleValidation = async (field: 'vb_control_interno' | 'vb_finanzas' | 'vb_contabilidad', value: boolean) => {
    const fieldName = field === 'vb_control_interno' ? 'V°B° CONTROL INTERNO' : field === 'vb_contabilidad' ? 'V°B° CONTABILIDAD' : 'V°B° FINANZAS';
    const action = value ? 'activar' : 'quitar';
    
    if (!window.confirm(`¿Estás seguro de que deseas ${action} el ${fieldName}?`)) {
      return;
    }

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
      const res = await axios.post(`${apiUrl}/consolidados/${id}/respaldo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      // Update local state manually for immediate feedback
      if (res.data?.url_respaldo) {
        setData(prev => prev ? { ...prev, url_respaldo: res.data.url_respaldo } : null);
      } else {
        await fetchData();
      }
      
      alert('Respaldo actualizado con éxito');
    } catch (err: any) {
      console.error('Error uploading respaldo:', err);
      const serverMessage = err.response?.data?.message || err.message || 'Error desconocido';
      alert(`Error al subir el respaldo: ${serverMessage}`);
    }
  };

  const handleRecordRespaldoUpload = async (recordId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api-remuneracion.apscolab.com';
      const res = await axios.post(`${apiUrl}/consolidados/${id}/respaldo/${activeTab}/${recordId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      // Update local state manually for immediate feedback
      if (res.data?.url_respaldo) {
        setData(prev => {
          if (!prev) return null;
          const key = activeTab === 'horas' ? 'horas_extras' : 
                      activeTab === 'viaticos' ? 'viaticos' : 
                      activeTab === 'atrasos' ? 'atrasos' : 
                      activeTab === 'procedimientos' ? 'procedimientos' : 'turnos_urgencia';
          
          return {
            ...prev,
            [key]: (prev as any)[key].map((t: any) => 
              t.id === recordId ? { ...t, url_respaldo: res.data.url_respaldo } : t
            )
          };
        });
      } else {
        await fetchData();
      }
      
      alert('Respaldo de registro actualizado');
    } catch (err: any) {
      console.error('Error uploading record respaldo:', err);
      const serverMessage = err.response?.data?.message || err.message || 'Error desconocido';
      alert(`Error al subir el respaldo: ${serverMessage}`);
    }
  };

  const handleAttendanceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    
    setIsRelojLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api-remuneracion.apscolab.com';
      const res = await axios.post(`${apiUrl}/reloj-control/proyectar-asistencia/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setRelojData(res.data);
      alert('Asistencia de Reloj Control cargada con éxito. Ahora puedes revisar los registros por funcionario.');
    } catch (err) {
      console.error('Error uploading attendance report:', err);
      const msg = (err as any).response?.data?.message || 'Error al procesar el reporte de asistencia';
      alert(msg);
    } finally {
      setIsRelojLoading(false);
    }
  };

  const handleOpenRespaldo = async (url: string) => {
    if (!url) return;
    
    if (url.startsWith('data:')) {
      try {
        const parts = url.split(';base64,');
        const contentType = parts[0].split(':')[1];
        const raw = window.atob(parts[1]);
        const rawLength = raw.length;
        const uInt8Array = new Uint8Array(rawLength);
        for (let i = 0; i < rawLength; ++i) {
          uInt8Array[i] = raw.charCodeAt(i);
        }
        const blob = new Blob([uInt8Array], { type: contentType });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
      } catch (err) {
        console.error('Error opening data URI:', err);
        window.open(url, '_blank');
      }
    } else {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api-remuneracion.apscolab.com';
        const res = await axios.post(`${apiUrl}/consolidados/respaldo/presigned-url`, { key: url });
        if (res.data && res.data.url) {
          window.open(res.data.url, '_blank');
        } else {
          window.open(url, '_blank');
        }
      } catch (err) {
        console.error('Error fetching presigned url:', err);
        alert('No se pudo obtener el enlace del archivo.');
      }
    }
  };

  if (loading) return <div className="p-20 text-center animate-pulse text-primary font-black uppercase tracking-widest text-xs">Sincronizando Validator Pro...</div>;
  if (!data) return <div className="p-20 text-center text-error font-extrabold">ERROR DE CARGA</div>;

  const filteredData = () => {
    if (activeTab === 'revision_contable') return [];
    let list = activeTab === 'horas' ? data.horas_extras : 
               activeTab === 'viaticos' ? data.viaticos : 
               activeTab === 'atrasos' ? data.atrasos :
               activeTab === 'procedimientos' ? data.procedimientos :
               data.turnos_urgencia;
    
    list = list.filter(item => {
      if (activeTab === 'horas') return (Number(item.cantidad_25 || 0) > 0 || Number(item.cantidad_50 || 0) > 0);
      if (activeTab === 'viaticos') return Number(item.monto_calculado || 0) > 0 || Number(item.rendicion_pasajes || 0) > 0;
      if (activeTab === 'atrasos') return Number(item.minutos || 0) > 0 || (item.tiempo_descuento && item.tiempo_descuento !== '0 min');
      if (activeTab === 'procedimientos') return Number(item.total_procedimientos || 0) > 0;
      if (activeTab === 'turnos') return (Number(item.cant_turnos_habiles || 0) > 0 || Number(item.cant_turnos_inhabiles || 0) > 0);
      return true;
    });

    if (statusFilter !== 'TODOS') {
      list = list.filter(item => {
        if (activeTab === 'horas') {
          return item.estado_25 === statusFilter || item.estado_50 === statusFilter;
        } else {
          return item.estado === statusFilter;
        }
      });
    }

    return list.filter(t => {
      const nombre = t.funcionario?.nombre_completo || '';
      const rut = t.funcionario?.rut || '';
      const centro = t.funcionario?.centro_salud?.nombre || '';
      const query = searchQuery.toLowerCase();
      return nombre.toLowerCase().includes(query) ||
             rut.includes(searchQuery) ||
             centro.toLowerCase().includes(query);
    });
  };

  const approvedSum = () => {
    if (activeTab === 'revision_contable') {
      const horasSum = data.horas_extras.reduce((acc, h) => acc + (h.estado_25 === 'APROBADO' ? Number(h.monto_25 || 0) : 0) + (h.estado_50 === 'APROBADO' ? Number(h.monto_50 || 0) : 0), 0);
      const viaticosSum = data.viaticos.reduce((acc, v) => acc + (v.estado === 'APROBADO' ? (Number(v.monto_calculado || 0) + Number(v.rendicion_pasajes || 0)) : 0), 0);
      const procedimientosSum = data.procedimientos.reduce((acc, p) => acc + (p.estado === 'APROBADO' ? Number(p.monto_calculado || 0) : 0), 0);
      const turnosSum = data.turnos_urgencia.reduce((acc, t) => acc + (t.estado === 'APROBADO' ? (Number(t.cant_turnos_habiles || 0) * Number(t.valor_habil || 0) + Number(t.cant_turnos_inhabiles || 0) * Number(t.valor_inhabil || 0)) : 0), 0);
      return horasSum + viaticosSum + procedimientosSum + turnosSum;
    }
    if (activeTab === 'horas') return data.horas_extras.reduce((acc, h) => acc + (h.estado_25 === 'APROBADO' ? Number(h.monto_25) : 0) + (h.estado_50 === 'APROBADO' ? Number(h.monto_50) : 0), 0);
    if (activeTab === 'viaticos') return data.viaticos.reduce((acc, v) => acc + (v.estado === 'APROBADO' ? (Number(v.monto_calculado || 0) + Number(v.rendicion_pasajes || 0)) : 0), 0);
    if (activeTab === 'procedimientos') return data.procedimientos.reduce((acc, p) => acc + (p.estado === 'APROBADO' ? Number(p.monto_calculado) : 0), 0);
    if (activeTab === 'turnos') return data.turnos_urgencia.reduce((acc, t) => acc + (t.estado === 'APROBADO' ? (Number(t.cant_turnos_habiles || 0) * Number(t.valor_habil || 0) + Number(t.cant_turnos_inhabiles || 0) * Number(t.valor_inhabil || 0)) : 0), 0);
    return 0;
  };

  const auditProgress = () => {
    if (activeTab === 'revision_contable') {
      let totalItems = 0;
      let totalReviewed = 0;
      
      const countReviewed = (items: any[], isHoras = false) => {
        items.forEach(t => {
          totalItems++;
          if (isHoras) {
            const ok25 = Number(t.cantidad_25 || 0) === 0 || t.estado_25 !== 'PENDIENTE';
            const ok50 = Number(t.cantidad_50 || 0) === 0 || t.estado_50 !== 'PENDIENTE';
            if (ok25 && ok50) totalReviewed++;
          } else {
            if (t.estado !== 'PENDIENTE') totalReviewed++;
          }
        });
      };
      
      countReviewed(data.horas_extras.filter(item => Number(item.cantidad_25 || 0) > 0 || Number(item.cantidad_50 || 0) > 0), true);
      countReviewed(data.viaticos.filter(item => Number(item.monto_calculado || 0) > 0 || Number(item.rendicion_pasajes || 0) > 0));
      countReviewed(data.atrasos.filter(item => Number(item.minutos || 0) > 0 || (item.tiempo_descuento && item.tiempo_descuento !== '0 min')));
      countReviewed(data.procedimientos.filter(item => Number(item.total_procedimientos || 0) > 0));
      countReviewed(data.turnos_urgencia.filter(item => Number(item.cant_turnos_habiles || 0) > 0 || Number(item.cant_turnos_inhabiles || 0) > 0));
      
      if (totalItems === 0) return 100;
      return Math.round((totalReviewed / totalItems) * 100);
    }

    let list = activeTab === 'horas' ? data.horas_extras : 
                 activeTab === 'viaticos' ? data.viaticos : 
                 activeTab === 'atrasos' ? data.atrasos :
                 activeTab === 'procedimientos' ? data.procedimientos :
                 data.turnos_urgencia;

    list = list.filter(item => {
      if (activeTab === 'horas') return (Number(item.cantidad_25 || 0) > 0 || Number(item.cantidad_50 || 0) > 0);
      if (activeTab === 'viaticos') return Number(item.monto_calculado || 0) > 0 || Number(item.rendicion_pasajes || 0) > 0;
      if (activeTab === 'atrasos') return Number(item.minutos || 0) > 0 || (item.tiempo_descuento && item.tiempo_descuento !== '0 min');
      if (activeTab === 'procedimientos') return Number(item.total_procedimientos || 0) > 0;
      if (activeTab === 'turnos') return (Number(item.cant_turnos_habiles || 0) > 0 || Number(item.cant_turnos_inhabiles || 0) > 0);
      return true;
    });

    if (list.length === 0) return 100;
    
    const reviewed = list.filter(t => {
      if (activeTab === 'horas') {
        const ok25 = Number(t.cantidad_25 || 0) === 0 || t.estado_25 !== 'PENDIENTE';
        const ok50 = Number(t.cantidad_50 || 0) === 0 || t.estado_50 !== 'PENDIENTE';
        return ok25 && ok50;
      }
      return t.estado !== 'PENDIENTE';
    }).length;
    
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
    const viaticosList = data.viaticos.filter(item => Number(item.monto_calculado || 0) > 0 || Number(item.rendicion_pasajes || 0) > 0);
    const atrasosList = data.atrasos.filter(item => Number(item.minutos || 0) > 0 || (item.tiempo_descuento && item.tiempo_descuento !== '0 min'));
    const procedimientosList = data.procedimientos.filter(item => Number(item.total_procedimientos || 0) > 0);
    const turnosList = data.turnos_urgencia.filter(item => Number(item.cant_turnos_habiles || 0) > 0 || Number(item.cant_turnos_inhabiles || 0) > 0);

    return {
      horas: { 
        count: horasList.length, 
        complete: horasList.length > 0 && horasList.every(t => 
          (Number(t.cantidad_25 || 0) === 0 || t.estado_25 !== 'PENDIENTE') && 
          (Number(t.cantidad_50 || 0) === 0 || t.estado_50 !== 'PENDIENTE')
        ) 
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
  const getRevisionContableRows = () => {
    if (!data) return [];
    
    const rows = programas.map(prog => {
      const horasExtrasSum = data.horas_extras
        .filter(h => h.programa?.id === prog.id && h.estado_25 === 'APROBADO')
        .reduce((sum, h) => sum + Number(h.monto_25 || 0), 0) +
        data.horas_extras
        .filter(h => h.programa?.id === prog.id && h.estado_50 === 'APROBADO')
        .reduce((sum, h) => sum + Number(h.monto_50 || 0), 0);
      
      const turnosSum = data.turnos_urgencia
        .filter(t => t.programa?.id === prog.id && t.estado === 'APROBADO')
        .reduce((sum, t) => sum + (Number(t.cant_turnos_habiles || 0) * Number(t.valor_habil || 0) + Number(t.cant_turnos_inhabiles || 0) * Number(t.valor_inhabil || 0)), 0);

      const procedimientosSum = 0;
      const total = horasExtrasSum + turnosSum + procedimientosSum;

      const pendingCount = data.horas_extras.filter(h => h.programa?.id === prog.id && (h.estado_25 === 'PENDIENTE' || h.estado_50 === 'PENDIENTE')).length +
        data.turnos_urgencia.filter(t => t.programa?.id === prog.id && t.estado === 'PENDIENTE').length;
      
      const rejectedCount = data.horas_extras.filter(h => h.programa?.id === prog.id && (h.estado_25 === 'RECHAZADO' || h.estado_50 === 'RECHAZADO')).length +
        data.turnos_urgencia.filter(t => t.programa?.id === prog.id && t.estado === 'RECHAZADO').length;

      return {
        id: prog.id,
        nombre: prog.nombre,
        horasExtras: horasExtrasSum,
        turnos: turnosSum,
        procedimientos: procedimientosSum,
        total,
        pendingCount,
        rejectedCount
      };
    });

    const approvedProcedimientos = data.procedimientos
      .filter(p => p.estado === 'APROBADO')
      .reduce((sum, p) => sum + Number(p.monto_calculado || 0), 0);

    const pendingProcedimientos = data.procedimientos.filter(p => p.estado === 'PENDIENTE').length;
    const rejectedProcedimientos = data.procedimientos.filter(p => p.estado === 'RECHAZADO').length;

    rows.push({
      id: 'procedimientos_aps' as any,
      nombre: 'Procedimientos APS (Virtual)',
      horasExtras: 0,
      turnos: 0,
      procedimientos: approvedProcedimientos,
      total: approvedProcedimientos,
      pendingCount: pendingProcedimientos,
      rejectedCount: rejectedProcedimientos
    });

    return rows.filter(r => r.total > 0 || r.pendingCount > 0 || r.rejectedCount > 0);
  };

  const getSelectedProgramRecords = () => {
    if (!data || selectedProgramId === null) return [];

    const records: {
      id: number;
      funcionario: string;
      rut: string;
      tipo: 'Horas Extras 25%' | 'Horas Extras 50%' | 'Turnos de Urgencia' | 'Procedimiento';
      monto: number;
      estado: EstadoValidacion;
      detalles: string;
    }[] = [];

    if (selectedProgramId === 'procedimientos_aps') {
      data.procedimientos.forEach(p => {
        records.push({
          id: p.id,
          funcionario: p.funcionario.nombre_completo,
          rut: p.funcionario.rut,
          tipo: 'Procedimiento',
          monto: Number(p.monto_calculado || 0),
          estado: p.estado || 'PENDIENTE',
          detalles: `Cantidad: ${p.total_procedimientos || 0} procedimiento(s)`
        });
      });
    } else {
      const pId = Number(selectedProgramId);
      
      data.horas_extras.forEach(h => {
        if (h.programa?.id === pId) {
          if (Number(h.cantidad_25 || 0) > 0) {
            records.push({
              id: h.id,
              funcionario: h.funcionario.nombre_completo,
              rut: h.funcionario.rut,
              tipo: 'Horas Extras 25%',
              monto: Number(h.monto_25 || 0),
              estado: h.estado_25 || 'PENDIENTE',
              detalles: `${h.cantidad_25} hrs @ $${(Number(h.monto_25 || 0) / Number(h.cantidad_25 || 1)).toFixed(0)}`
            });
          }
          if (Number(h.cantidad_50 || 0) > 0) {
            records.push({
              id: h.id,
              funcionario: h.funcionario.nombre_completo,
              rut: h.funcionario.rut,
              tipo: 'Horas Extras 50%',
              monto: Number(h.monto_50 || 0),
              estado: h.estado_50 || 'PENDIENTE',
              detalles: `${h.cantidad_50} hrs @ $${(Number(h.monto_50 || 0) / Number(h.cantidad_50 || 1)).toFixed(0)}`
            });
          }
        }
      });

      data.turnos_urgencia.forEach(t => {
        if (t.programa?.id === pId) {
          const detList: string[] = [];
          if (Number(t.cant_turnos_habiles || 0) > 0) detList.push(`${t.cant_turnos_habiles} hábiles`);
          if (Number(t.cant_turnos_inhabiles || 0) > 0) detList.push(`${t.cant_turnos_inhabiles} inhábiles`);
          
          records.push({
            id: t.id,
            funcionario: t.funcionario.nombre_completo,
            rut: t.funcionario.rut,
            tipo: 'Turnos de Urgencia',
            monto: Number(t.cant_turnos_habiles || 0) * Number(t.valor_habil || 0) + Number(t.cant_turnos_inhabiles || 0) * Number(t.valor_inhabil || 0),
            estado: t.estado || 'PENDIENTE',
            detalles: detList.join(', ')
          });
        }
      });
    }

    return records;
  };

  const stats = getTabStats();
  const allAudited = (stats.horas.count === 0 || stats.horas.complete) &&
                     (stats.viaticos.count === 0 || stats.viaticos.complete) &&
                     (stats.atrasos.count === 0 || stats.atrasos.complete) &&
                     (stats.procedimientos.count === 0 || stats.procedimientos.complete) &&
                     (stats.turnos.count === 0 || stats.turnos.complete);

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-xl flex justify-between items-center w-full px-8 h-24 border-b border-outline-variant/10">
        <div className="flex items-center gap-6">
          <button onClick={() => router.push('/consolidados')} className="p-2.5 bg-surface-container-low hover:bg-surface-container rounded-xl transition-all active:scale-95 group overflow-hidden">
            <span className="material-symbols-outlined text-secondary group-hover:text-primary transition-colors select-none text-base" dangerouslySetInnerHTML={{ __html: '&#xe5c4;' }} />
          </button>
          
          <div className="flex items-center gap-4">
            <HealthCenterLogo name={data.centro_salud.nombre} isLarge={false} />
            <div>
              <h2 className="font-headline text-lg font-black text-primary tracking-tight leading-none uppercase">{data.centro_salud.nombre}</h2>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-on-surface mt-1 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[10px] text-primary select-none" dangerouslySetInnerHTML={{ __html: '&#xe935;' }} />
                {new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(new Date(2026, data.periodo.mes - 1))} {data.periodo.anio} 
                <span className="mx-1.5 text-outline-variant/50">•</span>
                Gestor: {data.usuario_gestor?.nombre || 'Sincronización Automática'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            <button 
              disabled={(!canValidateControl) || (!data.vb_control_interno && !allAudited)}
              onClick={() => handleToggleValidation('vb_control_interno', !data.vb_control_interno)}
              className={cn(
                "px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all shadow-sm",
                data.vb_control_interno ? "bg-primary text-white border-primary shadow-primary/20" : "bg-white border-outline-variant/20 text-outline hover:border-primary/50",
                (!canValidateControl || (!data.vb_control_interno && !allAudited)) && "opacity-40 cursor-not-allowed grayscale"
              )}
              title={!canValidateControl ? "Solo perfil CONTROL puede validar" : (!data.vb_control_interno && !allAudited) ? "Debe auditar (validar o rechazar) todos los registros antes de dar el visto bueno" : ""}
            >
              V°B° CONTROL
            </button>
            <button 
              disabled={!canValidateContabilidad}
              onClick={() => handleToggleValidation('vb_contabilidad', !data.vb_contabilidad)}
              className={cn(
                "px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all shadow-sm",
                data.vb_contabilidad ? "bg-primary text-white border-primary shadow-primary/20" : "bg-white border-outline-variant/20 text-outline hover:border-primary/50",
                (!canValidateContabilidad) && "opacity-40 cursor-not-allowed grayscale"
              )}
              title={!canValidateContabilidad ? "Solo perfil CONTABILIDAD puede validar" : ""}
            >
              V°B° CONTABILIDAD
            </button>
            <button 
              disabled={(!canValidateFinanzas) || (!data.vb_finanzas && (!allAudited || !data.vb_control_interno || !data.vb_contabilidad))}
              onClick={() => handleToggleValidation('vb_finanzas', !data.vb_finanzas)}
              className={cn(
                "px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all shadow-sm",
                data.vb_finanzas ? "bg-primary text-white border-primary shadow-primary/20" : "bg-white border-outline-variant/20 text-outline hover:border-primary/50",
                (!canValidateFinanzas || (!data.vb_finanzas && (!allAudited || !data.vb_control_interno || !data.vb_contabilidad))) && "opacity-40 cursor-not-allowed grayscale"
              )}
              title={!canValidateFinanzas ? "Solo perfil FINANZAS puede validar" : (!data.vb_finanzas && !data.vb_control_interno) ? "Debe contar con el V°B° de Control Interno primero" : (!data.vb_finanzas && !data.vb_contabilidad) ? "Debe contar con el V°B° de Contabilidad primero" : (!data.vb_finanzas && !allAudited) ? "Debe auditar (validar o rechazar) todos los registros antes de dar el visto bueno" : ""}
            >
              V°B° FINANZAS
            </button>
            
            <div className="h-6 w-[1px] bg-outline-variant/15 mx-1" />
            
            <div className="flex gap-1.5">
              {data.url_respaldo && (
                <button 
                  onClick={() => handleOpenRespaldo(data.url_respaldo!)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest shadow-md transition-all hover:brightness-110"
                >
                  <span className="material-symbols-outlined text-xs">visibility</span>
                  Ver PDF
                </button>
              )}
              <label className={cn(
                "flex items-center gap-1.5 px-4 py-2 bg-slate-800 text-white rounded-lg text-[9px] font-black uppercase tracking-widest cursor-pointer hover:bg-slate-700 transition-all shadow-md",
                ['CENTRO_SALUD', 'SECRETARIA', 'ADMIN', 'ADMIN_MAESTRO'].includes(user?.rol || '') ? "" : "opacity-50 pointer-events-none"
              )}>
                <span className="material-symbols-outlined text-xs">{data.url_respaldo ? 'refresh' : 'attach_file'}</span>
                {data.url_respaldo ? 'Cambiar PDF' : 'Subir PDF'}
                <input type="file" className="hidden" onChange={handleRespaldoUpload} accept=".pdf,.jpg,.jpeg,.png" />
              </label>
            </div>

            <div className="h-6 w-[1px] bg-outline-variant/15 mx-1" />

            <label className={cn(
              "flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest cursor-pointer hover:bg-indigo-700 transition-all shadow-md",
              isRelojLoading || user?.rol === 'INVITADO' ? "opacity-50 pointer-events-none" : ""
            )}>
              <span className="material-symbols-outlined text-xs">{isRelojLoading ? 'sync' : 'schedule'}</span>
              {isRelojLoading ? 'Procesando...' : 'Proyectar Reloj'}
              <input type="file" className="hidden" onChange={handleAttendanceUpload} accept=".xls,.xlsx" disabled={user?.rol === 'INVITADO'} />
            </label>
          </div>
        </div>
      </header>

      <section className="p-8 pb-32 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-on-surface tracking-tighter uppercase font-headline">Validador Pro</h1>
            <p className="text-secondary font-black text-[10px] tracking-[0.2em] uppercase">Consolidación de Haberes • Ciclo Mensual {new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(new Date(2026, data.periodo.mes - 1))} {data.periodo.anio}</p>
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

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-2 bg-surface-container-low p-8 rounded-[2rem] border border-outline-variant/10 flex flex-col justify-between group overflow-hidden relative shadow-sm hover:shadow-md transition-shadow">
            <div className="relative z-10">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary mb-4 block">Impacto Presupuestario Total</span>
              <div className="text-4xl font-black text-primary tracking-tighter">${(approvedSum() * 1.25).toLocaleString('es-CL')}</div>
            </div>
            <div className="mt-6 flex items-center gap-2 relative z-10">
              <span className="material-symbols-outlined text-primary text-lg select-none" style={{ fontVariationSettings: "'FILL' 1" }} dangerouslySetInnerHTML={{ __html: '&#xe8e5;' }} />
              <span className="text-[11px] font-black text-primary uppercase tracking-widest">+12.4% vs Periodo Anterior</span>
            </div>
            <div className="absolute -right-12 -bottom-12 w-48 h-48 flex items-center justify-center overflow-hidden pointer-events-none">
              <span className="material-symbols-outlined text-[160px] opacity-[0.03] text-primary group-hover:scale-110 transition-transform select-none" dangerouslySetInnerHTML={{ __html: '&#xf122;' }} />
            </div>
          </div>
          
          <div className="bg-surface-container-lowest p-8 rounded-[2rem] border border-outline-variant/10 shadow-sm hover:shadow-md transition-all group">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary mb-4 block">Haberes Pendientes</span>
            <div className="text-3xl font-black text-on-surface tracking-tighter group-hover:text-primary transition-colors">
              {data.horas_extras.filter(t => t.estado_25 === 'PENDIENTE' || t.estado_50 === 'PENDIENTE').length}
            </div>
            <div className="mt-4 text-[10px] text-secondary font-bold uppercase tracking-widest leading-relaxed">Requiere V°B° manual de auditores senior</div>
          </div>

          <div className="bg-error-container/20 p-8 rounded-[2rem] border border-error/10 shadow-sm hover:shadow-error/10 transition-all group">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-error mb-4 block font-black">Alertas de Riesgo</span>
            <div className="text-3xl font-black text-error tracking-tighter">
              {data.horas_extras.filter(t => Number(t.cantidad_50) > 40).length}
            </div>
            <div className="mt-4 text-[10px] text-error font-black uppercase tracking-widest leading-relaxed">Exceden parámetros críticos establecidos</div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 pt-4 border-t border-outline-variant/10">
          <div className="flex gap-2 p-1.5 bg-surface-container rounded-[1.5rem] border border-outline-variant/5 shadow-inner overflow-x-auto no-scrollbar w-full lg:w-auto">
            {(['horas', 'viaticos', 'atrasos', 'procedimientos', 'turnos', 'revision_contable'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-5 py-2.5 text-[10px] font-black rounded-xl tracking-widest uppercase transition-all duration-300 flex items-center gap-2 whitespace-nowrap",
                  activeTab === tab 
                    ? "bg-white text-primary shadow-sm shadow-slate-200/50" 
                    : "text-secondary hover:text-primary hover:bg-white/40"
                )}
              >
                {tab === 'horas' ? 'Horas Extras' : 
                 tab === 'viaticos' ? 'Viáticos' : 
                 tab === 'atrasos' ? 'Atrasos' : 
                 tab === 'procedimientos' ? 'Procedimientos' : 
                 tab === 'turnos' ? 'Turnos' : 'Revisión Contable'}
                
                {tab !== 'revision_contable' && (
                  <span className={cn(
                    "px-2.5 py-1 rounded-lg text-[10px] font-black transition-all",
                    stats[tab as 'horas' | 'viaticos' | 'atrasos' | 'procedimientos' | 'turnos'].complete 
                      ? "bg-green-500 text-white shadow-lg shadow-green-200" 
                      : activeTab === tab ? "bg-primary/10 text-primary" : "bg-outline-variant/10 text-outline px-1.5"
                  )}>
                    {stats[tab as 'horas' | 'viaticos' | 'atrasos' | 'procedimientos' | 'turnos'].complete ? (
                      <div className="flex items-center gap-1">
                        <span>{stats[tab as 'horas' | 'viaticos' | 'atrasos' | 'procedimientos' | 'turnos'].count}</span>
                        <span className="material-symbols-outlined text-[12px]" dangerouslySetInnerHTML={{ __html: '&#xe876;' }} />
                      </div>
                    ) : stats[tab as 'horas' | 'viaticos' | 'atrasos' | 'procedimientos' | 'turnos'].count}
                  </span>
                )}
              </button>
            ))}
          </div>
          {activeTab !== 'revision_contable' && (
            <div className="flex gap-3 w-full lg:w-auto justify-end">
              <button 
                disabled={!canValidateControl && !canValidateFinanzas}
                onClick={() => handleBulkUpdate('APROBADO')}
                className={cn(
                  "group flex items-center gap-2 px-6 py-3 text-[10px] font-black bg-white text-primary border border-primary/20 shadow-md shadow-slate-200/40 rounded-full hover:bg-primary hover:text-white transition-all uppercase tracking-widest active:scale-95 overflow-hidden",
                  (!canValidateControl && !canValidateFinanzas) && "opacity-40 cursor-not-allowed"
                )}
              >
                <span className="material-symbols-outlined text-base group-hover:rotate-12 transition-transform select-none" dangerouslySetInnerHTML={{ __html: '&#xe877;' }} />
                Certificar Lote
              </button>

              <button 
                disabled={isLocked}
                onClick={() => {
                  setSelectedFuncionario(null);
                  setAddSearchQuery('');
                  setIsAddModalOpen(true);
                }}
                className={cn(
                  "group flex items-center gap-2 px-6 py-3 text-[10px] font-black bg-primary text-white shadow-md shadow-primary/30 rounded-full hover:brightness-110 transition-all uppercase tracking-widest active:scale-95",
                  isLocked && "opacity-40 cursor-not-allowed"
                )}
              >
                <span className="material-symbols-outlined text-base group-hover:rotate-90 transition-transform select-none" dangerouslySetInnerHTML={{ __html: '&#xe145;' }} />
                Agregar Registro
              </button>
            </div>
          )}
        </div>

        {activeTab === 'revision_contable' ? (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Tarjeta de información del rol */}
            <div className="bg-surface-container-low p-6 rounded-[2rem] border border-outline-variant/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary">Panel de Auditoría de Financiamiento</span>
                <h3 className="text-xl font-black text-on-surface tracking-tight uppercase">Resumen por Fuentes de Financiamiento</h3>
                <p className="text-xs text-outline font-medium">
                  Este cuadro consolida los montos de haberes validados por Control Interno según su respectivo Programa o Fuente de Financiamiento.
                </p>
              </div>
              <div className="flex flex-col items-end text-right">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary">Firma Electrónica Contabilidad</span>
                {data.vb_contabilidad ? (
                  <div className="mt-1 flex items-center gap-2 text-primary">
                    <span className="material-symbols-outlined text-base select-none animate-bounce">verified_user</span>
                    <span className="text-xs font-black uppercase tracking-wider">{data.firma_vb_contabilidad}</span>
                  </div>
                ) : (
                  <div className="mt-1 flex items-center gap-2 text-outline">
                    <span className="material-symbols-outlined text-base select-none">hourglass_empty</span>
                    <span className="text-xs font-black uppercase tracking-wider">Pendiente de V°B° Contable</span>
                  </div>
                )}
              </div>
            </div>

            {/* Tabla Resumen */}
            <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/40 overflow-hidden border border-outline-variant/5">
              <div className="p-6 border-b border-outline-variant/5 flex items-center justify-between bg-surface-container-lowest/30">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-primary rounded-full" />
                  <h3 className="font-black text-on-surface text-lg tracking-tight uppercase font-headline">Distribución Presupuestaria Aprobada</h3>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-separate border-spacing-y-2">
                  <thead>
                    <tr className="bg-surface-container-low/50">
                      <th className="px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface">Programa / Fuente de Financiamiento</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface text-right">Horas Extras</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface text-right">Turnos de Urgencia</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface text-right">Procedimientos APS</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface text-right">Total Aprobado</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface text-center">Alertas / Estado</th>
                      <th className="px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/5">
                    {getRevisionContableRows().map((row) => (
                      <tr 
                        key={row.id} 
                        onClick={() => setSelectedProgramId(selectedProgramId === row.id ? null : row.id)}
                        className={cn(
                          "hover:bg-primary/5 cursor-pointer transition-colors rounded-xl",
                          selectedProgramId === row.id ? "bg-primary/[0.03] font-bold" : ""
                        )}
                      >
                        <td className="px-6 py-2.5 text-xs font-black uppercase tracking-wider text-primary">
                          {row.nombre}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-right text-on-surface">
                          ${row.horasExtras.toLocaleString('es-CL')}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-right text-on-surface">
                          ${row.turnos.toLocaleString('es-CL')}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-right text-on-surface">
                          ${row.procedimientos.toLocaleString('es-CL')}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-right text-primary font-black">
                          ${row.total.toLocaleString('es-CL')}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <div className="flex justify-center gap-1.5">
                            {row.pendingCount > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-black uppercase tracking-wider flex items-center gap-1" title={`${row.pendingCount} registros pendientes de validación`}>
                                <span className="material-symbols-outlined" style={{ fontSize: '10px' }}>warning</span>
                                {row.pendingCount} PEND
                              </span>
                            )}
                            {row.rejectedCount > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-800 text-[9px] font-black uppercase tracking-wider flex items-center gap-1" title={`${row.rejectedCount} hallazgos / rechazados`}>
                                <span className="material-symbols-outlined" style={{ fontSize: '10px' }}>error</span>
                                {row.rejectedCount} RECH
                              </span>
                            )}
                            {row.pendingCount === 0 && row.rejectedCount === 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-800 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                                <span className="material-symbols-outlined" style={{ fontSize: '10px' }}>check_circle</span>
                                COMPLETO
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-2.5 text-right">
                          <button className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1 ml-auto">
                            {selectedProgramId === row.id ? 'Ocultar Detalle' : 'Ver Detalle'}
                            <span className="material-symbols-outlined text-xs">
                              {selectedProgramId === row.id ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
                            </span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-surface-container-lowest font-black border-t border-outline-variant/20">
                      <td className="px-6 py-3 text-xs font-black uppercase tracking-wider text-on-surface">Total General</td>
                      <td className="px-4 py-3 text-xs text-right text-on-surface">
                        ${getRevisionContableRows().reduce((s, r) => s + r.horasExtras, 0).toLocaleString('es-CL')}
                      </td>
                      <td className="px-4 py-3 text-xs text-right text-on-surface">
                        ${getRevisionContableRows().reduce((s, r) => s + r.turnos, 0).toLocaleString('es-CL')}
                      </td>
                      <td className="px-4 py-3 text-xs text-right text-on-surface">
                        ${getRevisionContableRows().reduce((s, r) => s + r.procedimientos, 0).toLocaleString('es-CL')}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-primary font-black">
                        ${getRevisionContableRows().reduce((s, r) => s + r.total, 0).toLocaleString('es-CL')}
                      </td>
                      <td className="px-4 py-3"></td>
                      <td className="px-6 py-3"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Panel de Drill-down */}
            <AnimatePresence>
              {selectedProgramId !== null && (
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 15 }}
                  className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/40 overflow-hidden border border-outline-variant/5"
                >
                  <div className="p-6 border-b border-outline-variant/5 flex items-center justify-between bg-surface-container-lowest/30">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary">search</span>
                      <h3 className="font-black text-on-surface text-base tracking-tight uppercase font-headline">
                        Detalle de Asignaciones: {getRevisionContableRows().find(r => r.id === selectedProgramId)?.nombre}
                      </h3>
                    </div>
                    <button 
                      onClick={() => setSelectedProgramId(null)}
                      className="p-1 hover:bg-surface-container rounded-lg transition-colors"
                    >
                      <span className="material-symbols-outlined text-secondary text-sm">close</span>
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-separate border-spacing-y-1">
                      <thead>
                        <tr className="bg-surface-container-low/40">
                          <th className="px-6 py-2.5 text-[9px] font-black uppercase tracking-[0.2em] text-on-surface">Funcionario</th>
                          <th className="px-4 py-2.5 text-[9px] font-black uppercase tracking-[0.2em] text-on-surface">RUT</th>
                          <th className="px-4 py-2.5 text-[9px] font-black uppercase tracking-[0.2em] text-on-surface">Tipo Haber</th>
                          <th className="px-4 py-2.5 text-[9px] font-black uppercase tracking-[0.2em] text-on-surface">Detalle de Cantidad</th>
                          <th className="px-4 py-2.5 text-[9px] font-black uppercase tracking-[0.2em] text-on-surface text-right">Monto</th>
                          <th className="px-6 py-2.5 text-[9px] font-black uppercase tracking-[0.2em] text-on-surface text-center">Estado Auditoría</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/5">
                        {getSelectedProgramRecords().length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-8 text-center text-xs text-outline font-bold uppercase tracking-wider">
                              No hay registros asociados
                            </td>
                          </tr>
                        ) : (
                          getSelectedProgramRecords().map((rec, index) => (
                            <tr key={rec.id + '-' + rec.tipo + '-' + index} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-2 text-xs font-bold uppercase tracking-wide text-on-surface">
                                {rec.funcionario}
                              </td>
                              <td className="px-4 py-2 text-xs text-on-surface">
                                {rec.rut}
                              </td>
                              <td className="px-4 py-2 text-xs font-bold text-secondary uppercase tracking-widest text-[9px]">
                                {rec.tipo}
                              </td>
                              <td className="px-4 py-2 text-xs text-outline font-medium">
                                {rec.detalles}
                              </td>
                              <td className="px-4 py-2 text-xs text-right font-bold text-on-surface">
                                ${rec.monto.toLocaleString('es-CL')}
                              </td>
                              <td className="px-6 py-2 text-center">
                                <span className={cn(
                                  "px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider inline-flex items-center gap-0.5",
                                  rec.estado === 'APROBADO' ? "bg-green-100 text-green-800" :
                                  rec.estado === 'RECHAZADO' ? "bg-red-100 text-red-800" :
                                  "bg-amber-100 text-amber-800"
                                )}>
                                  <span className="material-symbols-outlined" style={{ fontSize: '10px' }}>
                                    {rec.estado === 'APROBADO' ? 'done' : rec.estado === 'RECHAZADO' ? 'close' : 'hourglass_empty'}
                                  </span>
                                  {rec.estado}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/40 overflow-hidden border border-outline-variant/5">
            <div className="p-6 border-b border-outline-variant/5 flex flex-col md:flex-row items-start md:items-center justify-between bg-surface-container-lowest/30 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-primary rounded-full" />
                <h3 className="font-black text-on-surface text-lg tracking-tight uppercase font-headline">Matriz de Validación Clínica</h3>
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                <div className="relative group w-36 transition-all duration-300 focus-within:w-48">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface text-base select-none" dangerouslySetInnerHTML={{ __html: '&#xe8b6;' }} />
                  <input 
                    className="bg-surface-container-low border border-outline rounded-lg pl-9 pr-3 py-2 text-[11px] w-full focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-bold placeholder:text-outline/50"
                    placeholder="Buscar..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="bg-surface-container-low border border-outline rounded-lg px-3 py-2 text-[11px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-bold outline-none cursor-pointer"
                >
                  <option value="TODOS">Todos los Estados</option>
                  <option value="PENDIENTE">Pendientes</option>
                  <option value="APROBADO">Validados</option>
                  <option value="RECHAZADO">Hallazgos</option>
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-separate border-spacing-y-2">
                <thead>
                  <tr className="bg-surface-container-low/50">
                    <th className="px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface">Funcionario Clínico</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface">RUT / Clasificación</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface text-center">
                      {activeTab === 'horas' ? 'Horas 25%' : activeTab === 'atrasos' ? 'N/A' : activeTab === 'viaticos' ? 'Destino' : activeTab === 'procedimientos' ? 'Cantidad' : 'Hábiles'}
                    </th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface text-center">
                      {activeTab === 'horas' ? 'Horas 50%' : activeTab === 'atrasos' ? 'Concepto' : activeTab === 'viaticos' ? 'Estado' : activeTab === 'procedimientos' ? 'Estado' : 'Inhábiles'}
                    </th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface">
                      {activeTab === 'atrasos' ? 'Total Tiempo' : 'Total Validado'}
                    </th>
                    <th className="px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/5">
                  {filteredData().map((item) => (
                    <EmployeeTableRow 
                      key={item.id}
                      item={item}
                      activeTab={activeTab as any}
                      onUpdateStatus={handleUpdateStatus}
                      expanded={expandedId === item.id}
                      onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                      onObs={(t, sub) => handleUpdateObservation(activeTab as any, item.id, t, sub)}
                      onEdit={() => {
                        setEditingRecord(item);
                        setIsEditModalOpen(true);
                      }}
                      onDelete={() => handleDeleteRecord(item)}
                      onRespaldoUpload={(e) => handleRecordRespaldoUpload(item.id, e)}
                      onViewRespaldo={() => handleOpenRespaldo(item.url_respaldo!)}
                      attendanceLogs={relojData ? relojData[item.funcionario.rut.replace(/\./g, '').replace(/^0+/, '')] : undefined}
                      canEdit={((canValidateControl || canValidateContabilidad || canValidateFinanzas) || ['CENTRO_SALUD', 'SECRETARIA'].includes(user?.rol || '')) && !isLocked}
                      canAudit={canValidateControl || canValidateContabilidad || canValidateFinanzas}
                      isLocked={!!isLocked}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <footer className="fixed bottom-0 right-0 left-72 h-20 bg-on-background/95 backdrop-blur-2xl px-12 z-50 flex justify-between items-center shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Auditoría Remuneración Salud CMP</span>
          <span className="text-[9px] font-bold text-outline-variant uppercase tracking-widest mt-1">Estado: {auditProgress()}% Auditado</span>
        </div>
        <div className="flex gap-6">
          <button 
            onClick={handleDownloadExcel}
            className="px-12 py-3.5 text-xs font-black rounded-2xl uppercase tracking-[0.15em] bg-emerald-500 hover:bg-emerald-600 text-white transition-all shadow-2xl shadow-emerald-400/20 active:scale-95"
          >
            DESCARGAR EXCEL CONSOLIDADO
          </button>
          {data.estado_actual_enum !== 'Aprobado' ? (
            <button 
              disabled={!canFinalize || !data.vb_control_interno || !data.vb_finanzas}
              onClick={handleFinalizeConsolidado}
              className={cn(
                "px-12 py-3.5 text-xs font-black rounded-2xl uppercase tracking-[0.15em] transition-all shadow-2xl",
                (canFinalize && data.vb_control_interno && data.vb_finanzas)
                  ? "bg-primary text-white hover:brightness-110 active:scale-95 shadow-primary/40" 
                  : "bg-surface-container text-outline/50 cursor-not-allowed border border-outline-variant/20"
              )}
              title={!canFinalize ? "Solo ADMIN puede cerrar el consolidado" : ""}
            >
              EJECUTAR CIERRE FINAL
            </button>
          ) : (
            <div className="px-12 py-3.5 text-xs font-black rounded-2xl uppercase tracking-[0.15em] bg-surface-container text-primary border border-primary/20 flex items-center">
              CIERRE COMPLETADO
            </div>
          )}
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
                    <>
                      <div className="space-y-3 mb-6">
                        <label className="text-[10px] font-black uppercase tracking-widest text-secondary ml-2">Programa</label>
                        <select 
                          id="edit_programa_id" 
                          defaultValue={editingRecord.programa_id || editingRecord.programa?.id}
                          className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        >
                          {programas.map((p: any) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                        </select>
                      </div>
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
                    </>
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
                    <>
                      <div className="space-y-3 mb-6">
                        <label className="text-[10px] font-black uppercase tracking-widest text-secondary ml-2">Programa</label>
                        <select 
                          id="edit_programa_id" 
                          defaultValue={editingRecord.programa_id || editingRecord.programa?.id}
                          className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        >
                          {programas.map((p: any) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                        </select>
                      </div>
                      <div className="space-y-3 mb-6">
                        <label className="text-[10px] font-black uppercase tracking-widest text-secondary ml-2">Función TENS</label>
                        <select 
                          id="edit_tipo_tens" 
                          defaultValue={editingRecord.tipo_tens || ''}
                          className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        >
                          <option value="">No aplica</option>
                          <option value="RESIDENTE">TENS RESIDENTE</option>
                          <option value="CAMILLERO">TENS CAMILLERO</option>
                        </select>
                      </div>
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
                    </>
                  )}

                  {activeTab === 'viaticos' && (
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-secondary ml-2">Total Base Viático ($)</label>
                        <input 
                          type="number"
                          defaultValue={editingRecord.monto_calculado}
                          id="edit_monto"
                          className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-secondary ml-2">Total Pasajes ($)</label>
                        <input 
                          type="number"
                          defaultValue={editingRecord.rendicion_pasajes || 0}
                          id="edit_rendicion"
                          className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                      </div>
                    </div>
                  )}
                  {activeTab === 'atrasos' && (
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-secondary ml-2">Minutos de Atraso</label>
                      <input 
                        type="number"
                        defaultValue={editingRecord.minutos}
                        id="edit_minutos"
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

                  <div className="space-y-3 pt-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-secondary ml-2">Documento de Respaldo</label>
                    <div className="flex items-center gap-4">
                      {editingRecord.url_respaldo && (
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            handleOpenRespaldo(editingRecord.url_respaldo);
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-200 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">visibility</span>
                          Ver Actual
                        </button>
                      )}
                      <label className="flex-1 flex items-center gap-2 px-4 py-3 bg-white border border-outline-variant/20 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer hover:border-primary transition-all">
                        <span className="material-symbols-outlined text-sm">upload_file</span>
                        {newFileBase64 ? 'Archivo Seleccionado ✅' : 'Cambiar / Subir Adjunto'}
                        <input 
                          type="file" 
                          className="hidden" 
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => setNewFileBase64(reader.result as string);
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    </div>
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
                        payload.programa_id = Number((document.getElementById('edit_programa_id') as HTMLSelectElement).value);
                        payload.cantidad_25 = Number((document.getElementById('edit_cantidad_25') as HTMLInputElement).value);
                        payload.cantidad_50 = Number((document.getElementById('edit_cantidad_50') as HTMLInputElement).value);
                      } else if (activeTab === 'viaticos') {
                        payload.monto_calculado = Number((document.getElementById('edit_monto') as HTMLInputElement).value);
                        payload.rendicion_pasajes = Number((document.getElementById('edit_rendicion') as HTMLInputElement).value);
                      } else if (activeTab === 'atrasos') {
                        payload.minutos = Number((document.getElementById('edit_minutos') as HTMLInputElement).value);
                      } else if (activeTab === 'procedimientos') {
                        payload.total_procedimientos = Number((document.getElementById('edit_total_procedimientos') as HTMLInputElement).value);
                      } else if (activeTab === 'turnos') {
                        payload.programa_id = Number((document.getElementById('edit_programa_id') as HTMLSelectElement).value);
                        payload.cant_turnos_habiles = Number((document.getElementById('edit_cant_turnos_habiles') as HTMLInputElement).value);
                        payload.cant_turnos_inhabiles = Number((document.getElementById('edit_cant_turnos_inhabiles') as HTMLInputElement).value);
                        payload.tipo_tens = (document.getElementById('edit_tipo_tens') as HTMLSelectElement).value || null;
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
                      {addSearchResults.map((f: any) => (
                        <button 
                          key={f.rut}
                          onClick={() => setSelectedFuncionario(f)}
                          className="w-full text-left p-4 hover:bg-primary/5 rounded-2xl transition-all border border-transparent hover:border-primary/10 flex items-center gap-4 group"
                        >
                          <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-xs font-black text-outline group-hover:bg-primary group-hover:text-white transition-all">
                            {f.nombre_completo.split(" ").map((n: any)=>n[0]).join("").slice(0,2)}
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
                          {selectedFuncionario.nombre_completo.split(" ").map((n: any)=>n[0]).join("").slice(0,2)}
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
                              {programas.map((p: any) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
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
                          <div className="col-span-2 space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-secondary ml-2">Programa</label>
                            <select id="add_programa_id" className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all">
                              {programas.map((p: any) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                            </select>
                          </div>
                          <div className="col-span-2 space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-secondary ml-2">Función TENS</label>
                            <select id="add_tipo_tens" className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all">
                              <option value="">No aplica</option>
                              <option value="RESIDENTE">TENS RESIDENTE</option>
                              <option value="CAMILLERO">TENS CAMILLERO</option>
                            </select>
                          </div>
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

                      {activeTab === "viaticos" && (
                        <div className="col-span-2 grid grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-secondary ml-2">Base Viático ($)</label>
                            <input type="number" id="add_monto" defaultValue="0" className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all" />
                          </div>
                          <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-secondary ml-2">Pasajes/Bencina ($)</label>
                            <input type="number" id="add_rendicion" defaultValue="0" className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all" />
                          </div>
                        </div>
                      )}
                      {activeTab === "atrasos" && (
                        <div className="col-span-2 space-y-3">
                          <label className="text-[10px] font-black uppercase tracking-widest text-secondary ml-2">Minutos de Atraso</label>
                          <input type="number" id="add_minutos" defaultValue="0" className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all" />
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
                            payload.programa_id = Number((document.getElementById("add_programa_id") as any).value);
                            payload.cantidad_25 = Number((document.getElementById("add_cantidad_25") as any).value);
                            payload.cantidad_50 = Number((document.getElementById("add_cantidad_50") as any).value);
                          } else if (activeTab === "viaticos") {
                            payload.monto_calculado = Number((document.getElementById("add_monto") as HTMLInputElement).value);
                            payload.rendicion_pasajes = Number((document.getElementById("add_rendicion") as HTMLInputElement).value);
                          } else if (activeTab === "atrasos") {
                            payload.minutos = Number((document.getElementById("add_minutos") as any).value);
                          } else if (activeTab === "procedimientos") {
                            payload.total_procedimientos = Number((document.getElementById("add_total_procedimientos") as any).value);
                          } else if (activeTab === "turnos") {
                            payload.programa_id = Number((document.getElementById("add_programa_id") as any).value);
                            payload.cant_turnos_habiles = Number((document.getElementById("add_cant_turnos_habiles") as any).value);
                            payload.cant_turnos_inhabiles = Number((document.getElementById("add_cant_turnos_inhabiles") as any).value);
                            payload.tipo_tens = (document.getElementById("add_tipo_tens") as any).value || null;
                          }
                          const conceptoValue = (document.getElementById("add_concepto") as any).value;
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
    <div className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md transition-all overflow-hidden border border-outline-variant/10 shadow-sm", active.bg)}>
      <span 
        className={cn("material-symbols-outlined select-none", active.text)} 
        style={{ fontSize: '11px' }}
        dangerouslySetInnerHTML={{ __html: active.icon === 'pending' ? '&#xef64;' : active.icon === 'check_circle' ? '&#xe86c;' : '&#xe5c9;' }} 
      />
      <span className={cn("text-[9px] font-black uppercase tracking-wider", active.text)}>{active.label}</span>
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
  onRespaldoUpload,
  onViewRespaldo,
  attendanceLogs,
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
  onRespaldoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void,
  onViewRespaldo: () => void,
  attendanceLogs?: any[],
  canEdit: boolean,
  canAudit: boolean,
  isLocked: boolean
}) => {
  const [showLogs, setShowLogs] = useState(false);
  const [obs25, setObs25] = useState(item.observaciones_25 || '');
  const [obs50, setObs50] = useState(item.observaciones_50 || '');
  const [obs, setObs] = useState(item.observaciones || '');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  useEffect(() => {
    if (expanded) {
      const fetchAuditLogs = async () => {
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api-remuneracion.apscolab.com';
          const modulo = activeTab === 'horas' ? 'HE' : activeTab === 'viaticos' ? 'VIATICO' : activeTab === 'atrasos' ? 'ATRASO' : activeTab === 'procedimientos' ? 'PROCEDIMIENTO' : 'TURNO_URGENCIA';
          const res = await axios.get(`${apiUrl}/audit?tipo=${modulo}&id=${item.id}`);
          setAuditLogs(res.data || []);
        } catch (err) {
          console.error('Error fetching audit logs:', err);
        }
      };
      fetchAuditLogs();
    }
  }, [expanded, activeTab, item.id, item.url_respaldo]);

  const initials = (item.funcionario?.nombre_completo || '')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const totalAmount = activeTab === 'horas' ? (Number(item.monto_25) + Number(item.monto_50)) : 
                      activeTab === 'viaticos' ? (Number(item.monto_calculado || 0) + Number(item.rendicion_pasajes || 0)) :
                      activeTab === 'procedimientos' ? Number(item.monto_calculado || 0) :
                      activeTab === 'turnos' ? (Number(item.cant_turnos_habiles || 0) * Number(item.valor_habil || 0) + Number(item.cant_turnos_inhabiles || 0) * Number(item.valor_inhabil || 0)) :
                      0;

  const isFullyApproved = activeTab === 'horas' 
    ? ((Number(item.cantidad_25 || 0) === 0 || item.estado_25 === 'APROBADO') && (Number(item.cantidad_50 || 0) === 0 || item.estado_50 === 'APROBADO')) 
    : (item.estado === 'APROBADO');

  return (
    <>
      <tr className={cn("hover:bg-primary/5 transition-all duration-300 group cursor-pointer border-l-4 border-transparent", expanded && "bg-surface-container-low border-l-primary shadow-inner")}>
        <td className="px-6 py-2.5" onClick={onToggle}>
          <div className="flex items-center">
            <div>
              <div className="font-black text-on-surface text-[12px] uppercase tracking-tight leading-none mb-1 group-hover:text-primary transition-colors">{item.funcionario.nombre_completo}</div>
              <div className="text-[9px] font-bold text-secondary uppercase tracking-widest leading-none">
                {item.funcionario.centro_salud?.nombre || 'Personal de Planta • APS'}
              </div>
              {((activeTab === 'horas' && item.programa) || (activeTab === 'turnos' && (item as any).programa)) && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  <span 
                    title={activeTab === 'horas' ? item.programa.nombre : ((item as any).programa.nombre === 'PRESUPUESTARIO' ? 'PROGRAMA DE TURNO' : (item as any).programa.nombre)}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider bg-indigo-50 border border-indigo-100 text-indigo-700 shadow-sm transition-all hover:bg-indigo-100 max-w-[200px]"
                  >
                    <span className="material-symbols-outlined text-[9px]" style={{ fontVariationSettings: "'FILL' 1", fontSize: '9px' }}>payments</span>
                    <span className="truncate">
                      {activeTab === 'horas' 
                        ? item.programa.nombre 
                        : ((item as any).programa.nombre === 'PRESUPUESTARIO' ? 'PROGRAMA DE TURNO' : (item as any).programa.nombre)
                      }
                    </span>
                  </span>
                  {activeTab === 'turnos' && item.tipo_tens && (
                    <span 
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider bg-amber-50 border border-amber-100 text-amber-700 shadow-sm transition-all hover:bg-amber-100"
                    >
                      <span className="material-symbols-outlined text-[9px]" style={{ fontVariationSettings: "'FILL' 1", fontSize: '9px' }}>person</span>
                      <span>TENS {item.tipo_tens}</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </td>
        <td className="px-4 py-2.5" onClick={onToggle}>
          <div className="text-[12px] font-black text-on-surface tracking-tighter mb-0.5">{item.funcionario.rut}</div>
          <div className="text-[9px] font-black uppercase text-primary tracking-widest bg-primary/5 px-1.5 py-0.5 rounded-md w-fit">Cat. {item.funcionario.categoria_aps || '-'} • Niv. {item.funcionario.nivel_aps || '-'}</div>
        </td>
        <td className="px-4 py-2.5 text-center" onClick={onToggle}>
          <div className="flex flex-col items-center gap-1">
            {activeTab === 'horas' ? (
              <>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-amber-50 border border-amber-100 text-amber-700 shadow-sm">
                  <span className="material-symbols-outlined" style={{ fontSize: '10px' }}>schedule</span>
                  {item.cantidad_25 || 0} HRS (25%)
                </span>
                {Number(item.cantidad_25 || 0) > 0 ? (
                  <StatusBadge status={item.estado_25} />
                ) : (
                  <span className="text-[8px] font-black text-outline/40 uppercase tracking-widest bg-outline/5 px-1.5 py-0.5 rounded border border-outline/10">N/A</span>
                )}
              </>
            ) : activeTab === 'viaticos' ? (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-teal-50 border border-teal-100 text-teal-700 shadow-sm">
                <span className="material-symbols-outlined" style={{ fontSize: '10px' }}>flight_takeoff</span>
                {item.tipo_destino || 'NACIONAL'}
              </span>
            ) : activeTab === 'procedimientos' ? (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-emerald-50 border border-emerald-100 text-emerald-700 shadow-sm">
                <span className="material-symbols-outlined" style={{ fontSize: '10px' }}>medical_services</span>
                {item.total_procedimientos || 0} PROCS
              </span>
            ) : activeTab === 'turnos' ? (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-sky-50 border border-sky-100 text-sky-700 shadow-sm">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1'", fontSize: '10px' }}>calendar_today</span>
                {item.cant_turnos_habiles || 0} HÁB
              </span>
            ) : <span className="text-outline/30 font-black text-[9px] uppercase">N/A</span>}
          </div>
        </td>
        <td className="px-4 py-2.5 text-center" onClick={onToggle}>
          <div className="flex flex-col items-center gap-1">
             {activeTab === 'horas' ? (
                <>
                 <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-orange-50 border border-orange-100 text-orange-700 shadow-sm">
                   <span className="material-symbols-outlined" style={{ fontSize: '10px' }}>bolt</span>
                   {item.cantidad_50 || 0} HRS (50%)
                 </span>
                 {Number(item.cantidad_50 || 0) > 0 ? (
                   <StatusBadge status={item.estado_50} />
                 ) : (
                   <span className="text-[8px] font-black text-outline/40 uppercase tracking-widest bg-outline/5 px-1.5 py-0.5 rounded border border-outline/10">N/A</span>
                 )}
                </>
              ) : activeTab === 'viaticos' ? (
                <StatusBadge status={item.estado} />
              ) : activeTab === 'procedimientos' ? (
                <StatusBadge status={item.estado} />
              ) : activeTab === 'turnos' ? (
                <>
                 <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-purple-50 border border-purple-100 text-purple-700 shadow-sm">
                   <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1'", fontSize: '10px' }}>nights_stay</span>
                   {item.cant_turnos_inhabiles || 0} INH
                 </span>
                 <StatusBadge status={item.estado} />
                </>
              ) : (
                 <div className="text-[10px] font-black text-secondary tracking-widest uppercase">{item.concept || 'General'}</div>
              )}
          </div>
        </td>
        <td className="px-4 py-2.5 font-black text-[13px] text-on-surface tracking-tighter" onClick={onToggle}>
          {activeTab === 'atrasos' ? item.tiempo_descuento : `$${totalAmount.toLocaleString('es-CL')}`}
        </td>
        <td className="px-6 py-2.5 text-right">
          <div className="flex items-center justify-end gap-1.5">
            {attendanceLogs && (
              <button 
                onClick={(e) => { e.stopPropagation(); setShowLogs(!showLogs); }}
                className={cn(
                  "flex items-center justify-center p-1.5 rounded-lg transition-all",
                  showLogs ? "bg-indigo-100 text-indigo-700" : "text-indigo-600 hover:bg-indigo-50"
                )}
                title="Ver Asistencia Real (Reloj)"
              >
                <span className="text-[15px] select-none">🕒</span>
              </button>
            )}

            {item.url_respaldo ? (
              <button 
                onClick={(e) => { e.stopPropagation(); onViewRespaldo(); }}
                className="flex items-center justify-center p-1.5 rounded-lg hover:bg-emerald-50 transition-all"
                title="Ver Respaldo"
              >
                <span className="text-[15px] select-none">📄</span>
              </button>
            ) : null}

            <label 
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "p-1.5 rounded-lg transition-all shadow-sm flex items-center justify-center cursor-pointer",
                isLocked 
                  ? "bg-surface-container text-outline/20 cursor-not-allowed border border-outline-variant/5" 
                  : "bg-white border border-outline-variant/20 text-primary hover:bg-primary/5 hover:border-primary/40 active:scale-95"
              )}
              title={item.url_respaldo ? "Cambiar Respaldo" : "Subir Respaldo"}
            >
              <span className="text-[15px] select-none">{item.url_respaldo ? '🔄' : '📤'}</span>
              <input type="file" className="hidden" onChange={onRespaldoUpload} accept=".pdf,.jpg,.jpeg,.png" />
            </label>
            
            <button 
              disabled={isLocked}
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className={cn(
                "p-1.5 rounded-lg transition-all shadow-sm flex items-center justify-center",
                isLocked 
                  ? "bg-surface-container text-outline/20 cursor-not-allowed border border-outline-variant/5" 
                  : "bg-white border border-error/20 text-error hover:bg-error/5 hover:border-error/40 active:scale-95"
              )}
              title={isLocked ? "Eliminación bloqueada" : "Eliminar registro"}
            >
              <span className="text-[15px] select-none">🗑️</span>
            </button>

            <button 
              disabled={isLocked}
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className={cn(
                "p-1.5 rounded-lg transition-all shadow-sm flex items-center justify-center border",
                isLocked 
                  ? "bg-surface-container text-outline/20 border-outline-variant/5 cursor-not-allowed" 
                  : "bg-white border border-outline-variant/20 text-primary hover:bg-primary/5 hover:border-primary/40 active:scale-95"
              )}
              title={isLocked ? "Edición bloqueada por Control Interno" : "Editar registro"}
            >
              <span className="text-[15px] select-none">{isLocked ? '🔒' : '✏️'}</span>
            </button>

            {canAudit && (
              <button 
                disabled={isLocked}
                onClick={(e) => { 
                  e.stopPropagation(); 
                  const targetStatus = isFullyApproved ? 'PENDIENTE' : 'APROBADO';
                  if (activeTab === 'horas') {
                    if (Number(item.cantidad_25 || 0) > 0) onUpdateStatus('horas', item.id, 'estado_25', targetStatus);
                    if (Number(item.cantidad_50 || 0) > 0) onUpdateStatus('horas', item.id, 'estado_50', targetStatus);
                  } else {
                    onUpdateStatus(activeTab, item.id, 'estado', targetStatus);
                  }
                }}
                className={cn(
                  "p-1.5 rounded-lg transition-all shadow-sm flex items-center justify-center border",
                  isLocked 
                    ? "bg-surface-container text-outline/20 border-outline-variant/5 cursor-not-allowed" 
                    : isFullyApproved 
                      ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20 active:scale-95" 
                      : "bg-white border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-500 active:scale-95"
                )}
                title={isLocked ? "Validación bloqueada" : isFullyApproved ? "Validado" : "Validar Rápido"}
              >
                <span className="text-[13px] font-black select-none">✔</span>
              </button>
            )}

            <button 
              onClick={(e) => { e.stopPropagation(); onToggle(); }}
              className="p-1.5 bg-surface-container-low hover:bg-primary/10 hover:text-primary rounded-lg transition-all flex items-center justify-center"
            >
              <span className="text-[15px] select-none">{expanded ? '🔼' : '🔽'}</span>
            </button>
          </div>
        </td>
      </tr>
      
      <AnimatePresence>
        {expanded && (
          <tr>
            <td colSpan={6} className="px-6 py-0">
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
                        {Number(item.cantidad_25 || 0) > 0 ? (
                          <>
                            <div className="space-y-4">
                              <textarea 
                                disabled={!canAudit}
                                className="w-full bg-surface-container border border-outline-variant/5 rounded-3xl text-sm px-8 py-6 placeholder:text-outline/40 text-on-surface focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold h-24 min-h-[80px] resize-y" 
                                placeholder={canAudit ? "Ingrese hallazgos..." : "Notas de auditoría (Solo lectura)"}
                                value={obs25}
                                onChange={(e) => setObs25(e.target.value)}
                                onBlur={() => onObs(obs25, '25')}
                              />
                            </div>
                            {canAudit && (
                              <div className="flex gap-4">
                                <button onClick={() => onUpdateStatus('horas', item.id, 'estado_25', item.estado_25 === 'RECHAZADO' ? 'PENDIENTE' : 'RECHAZADO')} className={cn("flex-1 py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all", item.estado_25 === 'RECHAZADO' ? "bg-error text-white shadow-xl shadow-error/20" : "bg-white border border-error/30 text-error hover:bg-error-container/20")}>Hallazgo</button>
                                <button onClick={() => onUpdateStatus('horas', item.id, 'estado_25', item.estado_25 === 'APROBADO' ? 'PENDIENTE' : 'APROBADO')} className={cn("flex-1 py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg", item.estado_25 === 'APROBADO' ? "bg-primary text-white shadow-primary/20" : "bg-primary/5 text-primary border border-primary/20 hover:bg-primary/10")}>Validar</button>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-8 bg-surface-container/30 rounded-3xl border border-outline-variant/5 text-center">
                            <span className="material-symbols-outlined text-[24px] text-outline/30 mb-2 select-none">block</span>
                            <p className="text-xs font-bold text-outline/40 italic">No registra horas en este tramo</p>
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
                        {Number(item.cantidad_50 || 0) > 0 ? (
                          <>
                            <div className="space-y-4">
                              <textarea 
                                disabled={!canAudit}
                                className="w-full bg-surface-container border border-outline-variant/5 rounded-3xl text-sm px-8 py-6 placeholder:text-outline/40 text-on-surface focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold h-24 min-h-[80px] resize-y" 
                                placeholder={canAudit ? "Ingrese hallazgos..." : "Notas de auditoría (Solo lectura)"}
                                value={obs50}
                                onChange={(e) => setObs50(e.target.value)}
                                onBlur={() => onObs(obs50, '50')}
                              />
                            </div>
                            {canAudit && (
                              <div className="flex gap-4">
                                <button onClick={() => onUpdateStatus('horas', item.id, 'estado_50', item.estado_50 === 'RECHAZADO' ? 'PENDIENTE' : 'RECHAZADO')} className={cn("flex-1 py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all", item.estado_50 === 'RECHAZADO' ? "bg-error text-white shadow-xl shadow-error/20" : "bg-white border border-error/30 text-error hover:bg-error-container/20")}>Hallazgo</button>
                                <button onClick={() => onUpdateStatus('horas', item.id, 'estado_50', item.estado_50 === 'APROBADO' ? 'PENDIENTE' : 'APROBADO')} className={cn("flex-1 py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg", item.estado_50 === 'APROBADO' ? "bg-primary text-white shadow-primary/20" : "bg-primary/5 text-primary border border-primary/20 hover:bg-primary/10")}>Validar</button>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-8 bg-surface-container/30 rounded-3xl border border-outline-variant/5 text-center">
                            <span className="material-symbols-outlined text-[24px] text-outline/30 mb-2 select-none">block</span>
                            <p className="text-xs font-bold text-outline/40 italic">No registra horas en este tramo</p>
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
                            <button onClick={() => onUpdateStatus(activeTab, item.id, 'estado', item.estado === 'RECHAZADO' ? 'PENDIENTE' : 'RECHAZADO')} className={cn("flex-1 py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg", item.estado === 'RECHAZADO' ? "bg-error text-white" : "bg-white border border-error/30 text-error hover:bg-error-container/20")}>Hallazgo</button>
                            <button onClick={() => onUpdateStatus(activeTab, item.id, 'estado', item.estado === 'APROBADO' ? 'PENDIENTE' : 'APROBADO')} className={cn("flex-1 py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-xl shadow-primary/20", item.estado === 'APROBADO' ? "bg-primary text-white" : "bg-primary/5 text-primary border border-primary/20 hover:bg-primary/10")}>Validar</button>
                          </div>
                        )}
                    </div>
                  )}

                  {/* Historial de Comentarios y Auditoría */}
                  <div className="pt-8 border-t border-outline-variant/10 space-y-4">
                    <div className="flex items-center gap-2 text-[10px] font-black text-indigo-900 uppercase tracking-widest">
                      <span className="material-symbols-outlined text-[16px] text-indigo-600">history</span>
                      Historial de Comentarios y Auditoría
                    </div>
                    {auditLogs && auditLogs.length > 0 ? (
                      <div className="space-y-3">
                        {auditLogs.map((log) => {
                          const isObs = ['observaciones', 'observaciones_25', 'observaciones_50', 'justificacion', 'concepto'].includes(log.campo_afectado);
                          const isRespaldo = log.campo_afectado === 'url_respaldo';
                          return (
                            <div key={log.id} className="text-xs bg-white border border-slate-100 p-4 rounded-2xl flex flex-col gap-1">
                              <div className="flex justify-between items-center text-[10px]">
                                <span className="font-black text-slate-700 uppercase tracking-wider">{log.usuario_nombre}</span>
                                <span className="text-slate-400 font-medium">{new Date(log.fecha).toLocaleString('es-CL')}</span>
                              </div>
                              <p className="text-slate-600 font-bold mt-1">
                                {isObs ? (
                                  log.valor_anterior 
                                    ? `Modificó la justificación/hallazgo de "${log.valor_anterior}" a "${log.valor_nuevo}"`
                                    : `Ingresó justificación/observación original: "${log.valor_nuevo}"`
                                ) : isRespaldo ? (
                                  log.valor_anterior && log.valor_anterior !== 'Ninguno' && log.valor_anterior !== 'null'
                                    ? `Actualizó el archivo de respaldo adjunto.`
                                    : `Subió el archivo de respaldo adjunto original.`
                                ) : (
                                  `Cambió ${log.campo_afectado} de "${log.valor_anterior || 'vacío'}" a "${log.valor_nuevo}"`
                                )}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[11px] font-bold text-outline italic pl-6">No hay registros de comentarios ni cambios históricos aún para este registro.</p>
                    )}
                  </div>
                </div>
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLogs && attendanceLogs && (
          <tr>
            <td colSpan={6} className="px-6 py-0">
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-indigo-50/10 border-t border-indigo-100 overflow-hidden rounded-b-[2rem]"
              >
                <div className="p-10">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="material-symbols-outlined text-indigo-600">event_note</span>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-900">Proyección de Asistencia (Reloj Control)</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {attendanceLogs.map((log, idx) => (
                      <div key={idx} className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-slate-500">{new Date(log.fecha + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-[9px] uppercase font-black text-slate-400">Entrada</span>
                            <span className="text-xs font-black text-indigo-600">{log.entrada}</span>
                          </div>
                          <div className="h-6 w-[1px] bg-slate-100" />
                          <div className="flex flex-col text-right">
                            <span className="text-[9px] uppercase font-black text-slate-400">Salida</span>
                            <span className="text-xs font-black text-indigo-600">{log.salida}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 flex items-center gap-2 text-[9px] font-medium text-indigo-400 italic">
                    <span className="material-symbols-outlined text-[14px]">info</span>
                    Coteja manualmente si la jornada registrada coincide con la novedad ingresada.
                  </div>
                </div>
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  );
});
