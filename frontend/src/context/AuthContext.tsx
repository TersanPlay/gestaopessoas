/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import api from '../services/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'COLABORADOR' | 'RECEPCIONISTA';
  departmentId?: string;
}

interface AuthContextData {
  signed: boolean;
  user: User | null;
  login: (userData: object) => Promise<void>;
  logout: () => void;
  loading: boolean;
  setUser: Dispatch<SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === 'undefined') return null;

    const storagedUser = localStorage.getItem('@gestao:user');
    const storagedToken = localStorage.getItem('@gestao:token');

    if (storagedToken) {
      api.defaults.headers.common['Authorization'] = `Bearer ${storagedToken}`;
    }

    if (!storagedUser || !storagedToken) return null;

    try {
      return JSON.parse(storagedUser) as User;
    } catch (error) {
      console.error('Failed to parse stored user session', error);
      localStorage.removeItem('@gestao:user');
      localStorage.removeItem('@gestao:token');
      return null;
    }
  });
  const loading = false;

  async function login(userData: object) {
    const response = await api.post('/auth/login', userData);
    const { user, token } = response.data;

    localStorage.setItem('@gestao:user', JSON.stringify(user));
    localStorage.setItem('@gestao:token', token);

    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(user);
  }

  function logout() {
    localStorage.removeItem('@gestao:user');
    localStorage.removeItem('@gestao:token');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ signed: !!user, user, login, logout, loading, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  return useContext(AuthContext);
}
