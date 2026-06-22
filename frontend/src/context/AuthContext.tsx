'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

interface User {
  id: number;
  nombre: string;
  rut: string;
  rol: string;
  rol_enum?: string;
  centro_salud_id?: number;
}

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  isReadOnly: boolean;
  isLoading: boolean;
  login: (userData: User, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Configuración global de Axios para incluir el Token automáticamente
  useEffect(() => {
    const interceptor = axios.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Limpieza al desmontar (aunque AuthProvider suele persistir)
    return () => axios.interceptors.request.eject(interceptor);
  }, []);

  useEffect(() => {
    const authData = localStorage.getItem('usuario');
    if (authData) {
      try {
        setUser(JSON.parse(authData));
      } catch (e) {
        console.error('Error al parsear usuario local');
      }
    }
    setIsLoading(false);
  }, []);

  const login = (userData: User, token: string) => {
    setUser(userData);
    localStorage.setItem('usuario', JSON.stringify(userData));
    localStorage.setItem('token', token);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('usuario');
    localStorage.removeItem('token');
  };

  const isAdmin = user?.rol === 'ADMIN' || user?.rol_enum === 'ADMIN' || user?.rol === 'ADMIN_MAESTRO' || user?.rol_enum === 'ADMIN_MAESTRO';
  const isReadOnly = user?.rol === 'INVITADO' || user?.rol_enum === 'INVITADO';

  return (
    <AuthContext.Provider value={{ user, isAdmin, isReadOnly, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}
