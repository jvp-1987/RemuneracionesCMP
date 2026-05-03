'use client';

import React, { useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, ShieldCheck, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ChangePasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setStatus('error');
      setMessage('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    setStatus('idle');

    try {
      await axios.patch('/usuarios/change-password', { password });
      setStatus('success');
      setMessage('¡Contraseña actualizada con éxito!');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setStatus('error');
      setMessage(err.response?.data?.message || 'Error al actualizar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200/50 shadow-xl shadow-slate-200/40 relative overflow-hidden group">
      <div className="flex items-center gap-3 mb-10">
        <div className="p-3 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Seguridad de la Cuenta</h3>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Actualiza tus credenciales de acceso</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Nueva Contraseña</label>
          <div className="relative group/field">
            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within/field:text-primary transition-colors" />
            <input 
              required
              type={showPassword ? "text" : "password"} 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 caracteres"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-14 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none"
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Confirmar Nueva Contraseña</label>
          <div className="relative group/field">
            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within/field:text-primary transition-colors" />
            <input 
              required
              type={showPassword ? "text" : "password"} 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite tu contraseña"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none"
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {status !== 'idle' && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={cn(
                "p-4 rounded-2xl flex items-center gap-3",
                status === 'success' ? "bg-emerald-50 border border-emerald-100 text-emerald-600" : "bg-rose-50 border border-rose-100 text-rose-600"
              )}
            >
              {status === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <p className="text-[11px] font-bold">{message}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <button 
          disabled={loading}
          type="submit"
          className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl hover:bg-primary transition-all disabled:opacity-70 group"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              Actualizar Contraseña
              <ShieldCheck className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
