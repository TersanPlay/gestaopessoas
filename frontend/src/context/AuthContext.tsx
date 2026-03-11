import React, { createContext, useContext, useState, useEffect } from 'react';
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
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storagedUser = localStorage.getItem('@gestao:user');
    const storagedToken = localStorage.getItem('@gestao:token');

    if (storagedUser && storagedToken) {
      setUser(JSON.parse(storagedUser));
      api.defaults.headers.common['Authorization'] = `Bearer ${storagedToken}`;
    }
    setLoading(false);
  }, []);

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