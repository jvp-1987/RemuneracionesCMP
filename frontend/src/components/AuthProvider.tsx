'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import axios from 'axios';

interface User {
  id: number;
  nombre: string;
  rut: string;
  rol: string;
  centro_salud_id?: number | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  setSession: (token: string, user: User) => void;
  logout: () => void;
  loading: boolean;
  isReadOnly: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  setSession: () => {},
  logout: () => {},
  loading: true,
  isReadOnly: false,
  isAdmin: false,
});

export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Configurar URL base global y credenciales fuera de useEffect para evitar race conditions
  if (typeof window !== 'undefined') {
    axios.defaults.baseURL = process.env.NEXT_PUBLIC_API_URL || 'https://backend-production-7269.up.railway.app';
    axios.defaults.withCredentials = true;
  }

  useEffect(() => {
    // Verificar sesión con el backend
    axios.get('/auth/me')
      .then(res => {
        setUser(res.data.usuario);
        setToken('cookie-session'); // Marcador
        setLoading(false);
      })
      .catch(() => {
        setUser(null);
        setToken(null);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!loading) {
      const isPublicPath = pathname === '/login';
      
      if (!token && !isPublicPath) {
        router.push('/login');
      } else if (token && isPublicPath) {
        router.push('/');
      }
    }
  }, [loading, token, pathname, router]);

  const setSession = (newToken: string, newUser: User) => {
    // El token real ya viene en la cookie HttpOnly
    setToken('cookie-session');
    setUser(newUser);
  };

  const logout = React.useCallback(async () => {
    try {
      await axios.post('/auth/logout');
    } catch (e) {
      console.error('Logout error', e);
    }
    setToken(null);
    setUser(null);
    router.push('/login');
  }, [router]);

  useEffect(() => {
    if (!token) return;

    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      // 30 minutos de inactividad
      timeoutId = setTimeout(() => {
        logout();
      }, 30 * 60 * 1000);
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    
    events.forEach(event => document.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => document.removeEventListener(event, resetTimer));
    };
  }, [token, logout]);

  const isReadOnly = user?.rol === 'INVITADO';
  const isAdmin = user?.rol === 'ADMIN' || user?.rol === 'ADMIN_MAESTRO';

  // Mostrar spinner o pantalla blanca si está cargando
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Prevenir renderizado de la app si no hay token y no estamos en login (evita destellos)
  if (!token && pathname !== '/login') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, token, setSession, logout, loading, isReadOnly, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}
