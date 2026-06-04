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

  // Configuración global de Axios para incluir credenciales
  useEffect(() => {
    axios.defaults.withCredentials = true;
  }, []);

  useEffect(() => {
    axios.get('/auth/me')
      .then(res => {
        setUser(res.data.usuario);
        setIsLoading(false);
      })
      .catch(() => {
        setUser(null);
        setIsLoading(false);
      });
  }, []);

  const login = (userData: User, token: string) => {
    setUser(userData);
  };

  const logout = async () => {
    try {
      await axios.post('/auth/logout');
    } catch (e) {
      console.error(e);
    }
    setUser(null);
  };

  const isAdmin = user?.rol === 'ADMIN' || user?.rol_enum === 'ADMIN';
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
