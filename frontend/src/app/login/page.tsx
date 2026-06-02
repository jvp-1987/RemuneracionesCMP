'use client';

import React, { useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Fingerprint, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, Building2 } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

export default function LoginPage() {
  const { setSession } = useAuth();
  const [rut, setRut] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'https://backend-production-7269.up.railway.app';
      const response = await axios.post(`${baseUrl}/auth/login`, {
        rut,
        password,
      });

      const { access_token, usuario } = response.data;

      // Usar el proveedor de autenticación para guardar la sesión
      setSession(access_token, usuario);

      router.push('/');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Error desconocido';
      const status = err.response?.status ? `[Error ${err.response.status}]` : '[Error de Red]';
      setError(`${status}: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 font-manrope relative overflow-hidden">
      
      {/* Background Image with Ken Burns Effect */}
      <motion.div 
        initial={{ scale: 1.15, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 2.5, ease: 'easeOut' }}
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: "url('/villarrica_calafquen.png')",
        }}
      />

      {/* Premium Dark Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-900/50 to-slate-950/80 backdrop-blur-[3px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.8 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-28 h-28 bg-white/95 backdrop-blur-md rounded-[2rem] flex items-center justify-center shadow-2xl mb-5 group hover:rotate-6 transition-transform duration-500 p-4 overflow-hidden border border-white/20">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain mix-blend-multiply" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tighter text-center drop-shadow-xl">
            Motor Financiero
          </h1>
          <p className="text-[10px] font-black text-slate-200 uppercase tracking-[0.3em] mt-2 drop-shadow-md">y Gestión de Personas</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] p-10 shadow-2xl shadow-slate-950/40 border border-white/20">
          <div className="mb-8">
            <h2 className="text-xl font-black text-slate-900">Bienvenido de nuevo</h2>
            <p className="text-xs text-slate-500 font-bold mt-1">Ingresa tus credenciales para acceder al panel</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">RUT del Usuario</label>
              <div className="relative group">
                <Fingerprint className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                <input 
                  required
                  type="text" 
                  value={rut}
                  onChange={(e) => setRut(e.target.value)}
                  placeholder="12.345.678-9"
                  className="w-full bg-slate-50/80 border border-slate-200 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Contraseña</label>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                <input 
                  required
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50/80 border border-slate-200 rounded-2xl pl-12 pr-14 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none"
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

            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-4 bg-rose-50 border border-rose-100 rounded-2xl"
              >
                <p className="text-[11px] text-rose-600 font-bold leading-relaxed">{error}</p>
              </motion.div>
            )}

            <button 
              disabled={loading}
              type="submit"
              className="w-full bg-primary text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-primary/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed group"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Entrar al Sistema
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
          
        </div>

        {/* Footer Meta */}
        <div className="mt-8 text-center flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-900/40 backdrop-blur-md rounded-full border border-white/10">
            <Building2 className="w-3.5 h-3.5 text-slate-200" />
            <span className="text-[10px] font-black text-slate-200 uppercase tracking-widest">Corporación Municipal Panguipulli</span>
          </div>
          <p className="text-[9px] text-slate-300 font-bold drop-shadow">Audit Console v2.0 • Sistema Seguro de Alta Disponibilidad</p>
        </div>
      </motion.div>
    </div>
  );
}
