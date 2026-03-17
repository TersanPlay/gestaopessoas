/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import api from '../services/api';
import type {
  AdminLoginCredentials,
  AppUser,
  FirstAccessCredentials,
  LoginCredentials,
} from '../types/user';

interface AuthContextData {
  signed: boolean;
  user: AppUser | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  loginAdmin: (credentials: AdminLoginCredentials) => Promise<void>;
  completeFirstAccess: (credentials: FirstAccessCredentials) => Promise<void>;
  logout: () => void;
  loading: boolean;
  setUser: Dispatch<SetStateAction<AppUser | null>>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(() => {
    if (typeof window === 'undefined') return null;

    const storagedUser = localStorage.getItem('@gestao:user');
    const storagedToken = localStorage.getItem('@gestao:token');

    if (storagedToken) {
      api.defaults.headers.common.Authorization = `Bearer ${storagedToken}`;
    }

    if (!storagedUser || !storagedToken) return null;

    try {
      return JSON.parse(storagedUser) as AppUser;
    } catch (error) {
      console.error('Failed to parse stored user session', error);
      localStorage.removeItem('@gestao:user');
      localStorage.removeItem('@gestao:token');
      return null;
    }
  });
  const loading = false;

  const establishSession = (payload: { user: AppUser; token: string }) => {
    const { user: authenticatedUser, token } = payload;

    localStorage.setItem('@gestao:user', JSON.stringify(authenticatedUser));
    localStorage.setItem('@gestao:token', token);

    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    setUser(authenticatedUser);
  };

  async function login(credentials: LoginCredentials) {
    const response = await api.post('/auth/login', credentials);
    establishSession(response.data as { user: AppUser; token: string });
  }

  async function loginAdmin(credentials: AdminLoginCredentials) {
    const response = await api.post('/auth/admin/login', credentials);
    establishSession(response.data as { user: AppUser; token: string });
  }

  async function completeFirstAccess(credentials: FirstAccessCredentials) {
    const response = await api.post('/auth/first-access/complete', credentials);
    const { user: authenticatedUser, token } = response.data as {
      user: AppUser;
      token: string;
    };
    establishSession({ user: authenticatedUser, token });
  }

  function logout() {
    localStorage.removeItem('@gestao:user');
    localStorage.removeItem('@gestao:token');
    delete api.defaults.headers.common.Authorization;
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        signed: !!user,
        user,
        login,
        loginAdmin,
        completeFirstAccess,
        logout,
        loading,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  return useContext(AuthContext);
}
