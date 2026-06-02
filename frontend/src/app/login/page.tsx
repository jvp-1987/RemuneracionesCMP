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

      {/* Premium Dark Overlay Vignette for contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black/60 backdrop-blur-[1.5px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.8 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-28 h-28 bg-white/95 backdrop-blur-md rounded-[2rem] flex items-center justify-center shadow-xl mb-5 group hover:rotate-6 transition-transform duration-500 p-4 overflow-hidden border border-white/20">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain mix-blend-multiply" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tighter text-center drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
            Motor Financiero
          </h1>
          <p className="text-[10px] font-black text-blue-100 uppercase tracking-[0.3em] mt-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">y Gestión de Personas</p>
        </div>

        {/* Login Card - Liquid Crystal / Glassmorphism */}
        <div className="bg-white/10 backdrop-blur-2xl rounded-[2.5rem] p-10 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] border border-white/20">
          <div className="mb-8">
            <h2 className="text-xl font-black text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.4)]">Bienvenido de nuevo</h2>
            <p className="text-xs text-slate-200 font-medium mt-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">Ingresa tus credenciales para acceder al panel</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-200 uppercase tracking-widest ml-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">RUT del Usuario</label>
              <div className="relative group">
                <Fingerprint className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60 group-focus-within:text-white transition-colors" />
                <input 
                  required
                  type="text" 
                  value={rut}
                  onChange={(e) => setRut(e.target.value)}
                  placeholder="12.345.678-9"
                  className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-white placeholder-white/40 focus:ring-4 focus:ring-white/10 focus:border-white/40 focus:bg-white/15 transition-all outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-200 uppercase tracking-widest ml-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">Contraseña</label>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60 group-focus-within:text-white transition-colors" />
                <input 
                  required
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl pl-12 pr-14 py-4 text-sm font-bold text-white placeholder-white/40 focus:ring-4 focus:ring-white/10 focus:border-white/40 focus:bg-white/15 transition-all outline-none"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-4 bg-rose-500/20 border border-rose-500/30 rounded-2xl backdrop-blur-md"
              >
                <p className="text-[11px] text-rose-200 font-bold leading-relaxed">{error}</p>
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
          <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 shadow-lg">
            <Building2 className="w-3.5 h-3.5 text-white" />
            <span className="text-[10px] font-black text-white uppercase tracking-widest">Corporación Municipal Panguipulli</span>
          </div>
          <p className="text-[9px] text-slate-300 font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">Audit Console v2.0 • Sistema Seguro de Alta Disponibilidad</p>
        </div>
      </motion.div>
    </div>
  );
}
