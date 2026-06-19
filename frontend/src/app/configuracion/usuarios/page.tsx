'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserPlus, Shield, Building2, Mail, Fingerprint, 
  Trash2, Edit3, Check, X, Search, ChevronRight,
  MoreVertical, ShieldCheck, ShieldAlert, Eye
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { useAuth } from '@/components/AuthProvider';

interface Usuario {
  id: number;
  rut: string;
  nombre: string;
  email: string;
  rol_enum: string;
  centro_salud_id?: number;
  centro_salud?: { nombre: string };
}

interface CentroSalud {
  id: number;
  nombre: string;
  parent_id?: number;
}

const ROLES = [
  { id: 'ADMIN', label: 'Administrador Maestro', icon: ShieldCheck, color: 'text-primary bg-primary/5' },
  { id: 'CONTROL', label: 'Unidad de Control', icon: Shield, color: 'text-blue-600 bg-blue-50' },
  { id: 'CONTABILIDAD', label: 'Contabilidad (Fuentes)', icon: Shield, color: 'text-indigo-600 bg-indigo-50' },
  { id: 'FINANZAS', label: 'Finanzas / Remuneraciones', icon: Shield, color: 'text-emerald-600 bg-emerald-50' },
  { id: 'CENTRO_SALUD', label: 'Gestor de Centro', icon: Building2, color: 'text-amber-600 bg-amber-50' },
  { id: 'SECRETARIA', label: 'Secretaria', icon: UserPlus, color: 'text-pink-600 bg-pink-50' },
  { id: 'INVITADO', label: 'Invitado (Solo Lectura)', icon: Eye, color: 'text-slate-600 bg-slate-100' },
];

export default function UsuariosPage() {
  const { isReadOnly } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [centros, setCentros] = useState<CentroSalud[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State
  const [formData, setFormData] = useState({
    rut: '',
    nombre: '',
    email: '',
    password: '',
    rol_enum: 'CENTRO_SALUD',
    centro_salud_id: ''
  });

  const fetchData = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api-remuneracion.apscolab.com';
      const [usersRes, centersRes] = await Promise.all([
        axios.get(`${apiUrl}/usuarios`),
        axios.get(`${apiUrl}/centro-salud`)
      ]);
      setUsuarios(usersRes.data);
      setCentros(centersRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api-remuneracion.apscolab.com';
      const dataToSend: any = {
        ...formData,
        centro_salud_id: formData.centro_salud_id ? parseInt(formData.centro_salud_id) : null
      };

      if (!dataToSend.password) {
        delete dataToSend.password; // Don't send empty password
      }

      if (editingId) {
        await axios.patch(`${apiUrl}/usuarios/${editingId}`, dataToSend);
      } else {
        await axios.post(`${apiUrl}/usuarios`, dataToSend);
      }

      setIsModalOpen(false);
      setEditingId(null);
      setFormData({ rut: '', nombre: '', email: '', password: '', rol_enum: 'CENTRO_SALUD', centro_salud_id: '' });
      fetchData();
    } catch (error) {
      console.error('Error creating/updating user:', error);
      alert('Error al procesar usuario. Verifica que el RUT o Email no existan ya.');
    }
  };

  const handleEditClick = (user: Usuario) => {
    setEditingId(user.id);
    setFormData({
      rut: user.rut,
      nombre: user.nombre,
      email: user.email,
      password: '',
      rol_enum: user.rol_enum,
      centro_salud_id: user.centro_salud_id ? String(user.centro_salud_id) : ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('¿Estás seguro de eliminar este usuario?')) {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api-remuneracion.apscolab.com';
        await axios.delete(`${apiUrl}/usuarios/${id}`);
        fetchData();
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  const filteredUsers = usuarios.filter(u => 
    u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.rut.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-10 p-2 font-manrope pb-20">
      
      {/* Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-end border-b border-slate-200/20 pb-8"
      >
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Gestión de Usuarios</h1>
          <div className="flex items-center gap-2">
            <span className="w-8 h-1 bg-primary rounded-full"></span>
            <p className="text-slate-500 font-bold text-[11px] tracking-widest uppercase">Perfiles de Acceso y Permisos</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {!isReadOnly && (
            <button 
              onClick={() => {
                setEditingId(null);
                setFormData({
                  nombre: '',
                  rut: '',
                  email: '',
                  password: '',
                  rol_enum: 'INVITADO',
                  centro_salud_id: ''
                });
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-primary text-white font-black hover:brightness-110 transition-all text-xs uppercase tracking-widest shadow-xl shadow-primary/20 group"
            >
              <UserPlus className="w-4 h-4 group-hover:scale-110 transition-transform" />
              Nuevo Usuario
            </button>
          )}
        </div>
      </motion.div>

      {/* Search & Stats Bar */}
      <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Buscar por nombre o RUT..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-sm"
          />
        </div>
        <div className="flex gap-4">
          <div className="px-6 py-3 bg-white rounded-2xl border border-slate-200 flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{usuarios.length} Usuarios Activos</span>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200/50 shadow-2xl shadow-slate-200/40 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Identidad</th>
              <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Rol / Perfil</th>
              <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Asignación</th>
              <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Contacto</th>
              <th className="px-10 py-6 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            <AnimatePresence>
              {filteredUsers.map((user, idx) => {
                const roleInfo = ROLES.find(r => r.id === user.rol_enum) || ROLES[0];
                const RoleIcon = roleInfo.icon;
                
                return (
                  <motion.tr 
                    key={user.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                          {user.nombre.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900 group-hover:text-primary transition-colors">{user.nombre}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{user.rut}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <div className={cn("inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest", roleInfo.color)}>
                        <RoleIcon className="w-3 h-3" />
                        {roleInfo.label}
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-slate-300" />
                        <span className="text-xs font-bold text-slate-600">
                          {user.centro_salud?.nombre || 'Acceso Global'}
                        </span>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-300" />
                        <span className="text-xs font-bold text-slate-600 lowercase">{user.email}</span>
                      </div>
                    </td>
                    <td className="px-10 py-8 text-right">
                      <div className="flex justify-end gap-2">
                      {!isReadOnly && (
                        <>
                          <button
                            onClick={() => handleEditClick(user)}
                            className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-primary hover:border-primary/30 transition-all shadow-sm"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 transition-all shadow-sm"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
        
        {filteredUsers.length === 0 && !loading && (
          <div className="py-20 text-center">
            <div className="inline-flex p-6 rounded-full bg-slate-50 mb-6">
              <Search className="w-10 h-10 text-slate-300" />
            </div>
            <h4 className="text-slate-900 font-black text-lg">No se encontraron usuarios</h4>
            <p className="text-slate-400 text-sm mt-1">Intenta con otro término de búsqueda.</p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsModalOpen(false);
                setEditingId(null);
                setFormData({ rut: '', nombre: '', email: '', password: '', rol_enum: 'CENTRO_SALUD', centro_salud_id: '' });
              }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden"
            >
              <form onSubmit={handleSubmit} className="p-12 space-y-8">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                      {editingId ? 'Editar Usuario' : 'Nuevo Usuario'}
                    </h2>
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mt-2">
                      {editingId ? 'Modificar permisos y asignaciones' : 'Configuración de credenciales iniciales'}
                    </p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingId(null);
                      setFormData({ rut: '', nombre: '', email: '', password: '', rol_enum: 'CENTRO_SALUD', centro_salud_id: '' });
                    }}
                    className="p-3 rounded-2xl bg-slate-50 text-slate-400 hover:text-rose-600 transition-all"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">RUT del Usuario</label>
                    <div className="relative">
                      <Fingerprint className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        required
                        type="text" 
                        value={formData.rut}
                        onChange={e => setFormData({...formData, rut: e.target.value})}
                        placeholder="12.345.678-9"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nombre Completo</label>
                    <input 
                      required
                      type="text" 
                      value={formData.nombre}
                      onChange={e => setFormData({...formData, nombre: e.target.value})}
                      placeholder="Ej: Juan Pérez Soto"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
                    />
                  </div>
                  <div className="space-y-3 col-span-2 md:col-span-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Correo Electrónico</label>
                    <div className="relative">
                      <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        required
                        type="email" 
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        placeholder="usuario@panguipulli.cl"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-3 col-span-2 md:col-span-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                      Contraseña {editingId ? <span className="text-slate-400 font-normal lowercase">(Dejar en blanco para mantener)</span> : <span className="text-slate-400 font-normal lowercase">(Opcional, por defecto será RUT sin dígito)</span>}
                    </label>
                    <div className="relative">
                      <Shield className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        value={formData.password}
                        onChange={e => setFormData({...formData, password: e.target.value})}
                        placeholder={editingId ? "••••••••" : "Ej: 16853223"}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Perfil / Rol</label>
                    <select 
                      value={formData.rol_enum}
                      onChange={e => setFormData({...formData, rol_enum: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all appearance-none"
                    >
                      {ROLES.map(role => (
                        <option key={role.id} value={role.id}>{role.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Centro Asignado</label>
                    <select 
                      value={formData.centro_salud_id}
                      onChange={e => setFormData({...formData, centro_salud_id: e.target.value})}
                      disabled={['ADMIN', 'CONTROL', 'FINANZAS', 'CONTABILIDAD', 'INVITADO'].includes(formData.rol_enum)}
                      required={['CENTRO_SALUD', 'SECRETARIA'].includes(formData.rol_enum)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all appearance-none disabled:opacity-50"
                    >
                      <option value="">{['CENTRO_SALUD', 'SECRETARIA'].includes(formData.rol_enum) ? 'Seleccione un Centro...' : 'Acceso Global (Todos)'}</option>
                      {centros
                        .filter(c => !c.parent_id && (
                          c.nombre.toUpperCase().includes('CESFAM PANGUIPULLI') || 
                          c.nombre.toUpperCase().includes('CESFAM CHOSHUENCO') || 
                          c.nombre.toUpperCase().includes('CESFAM COÑARIPE') || 
                          c.nombre.toUpperCase().includes('ADMINISTRACION CENTRAL') ||
                          c.nombre.toUpperCase().includes('DEPARTAMENTO DE SALUD')
                        ))
                        .map(c => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-4 pt-6">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingId(null);
                      setFormData({ rut: '', nombre: '', email: '', password: '', rol_enum: 'CENTRO_SALUD', centro_salud_id: '' });
                    }}
                    className="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-600 font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-[2] py-4 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:brightness-110 transition-all"
                  >
                    {editingId ? 'Guardar Cambios' : 'Crear Usuario'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
