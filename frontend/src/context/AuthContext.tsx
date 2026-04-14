/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import api from '../services/api';
import type {
  AdminLoginCredentials,
  AppUser,
  FirstAccessCredentials,
} from '../types/user';

interface AuthContextData {
  signed: boolean;
  user: AppUser | null;
  loginAdmin: (credentials: AdminLoginCredentials) => Promise<void>;
  startInstitutionalLogin: () => void;
  completeInstitutionalLogin: (code: string) => Promise<void>;
  checkEmailFirstAccess: (email: string) => Promise<void>;
  completeFirstAccess: (credentials: FirstAccessCredentials) => Promise<void>;
  logout: () => void;
  loading: boolean;
  setUser: Dispatch<SetStateAction<AppUser | null>>;
}

interface SessionPayload {
  user: AppUser;
  token: string;
  institutionalAccessToken?: string | null;
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

  const establishSession = (payload: SessionPayload) => {
    const { user: authenticatedUser, token, institutionalAccessToken } = payload;

    localStorage.setItem('@gestao:user', JSON.stringify(authenticatedUser));
    localStorage.setItem('@gestao:token', token);
    if (institutionalAccessToken) {
      localStorage.setItem(
        '@gestao:institutionalToken',
        institutionalAccessToken,
      );
    } else {
      localStorage.removeItem('@gestao:institutionalToken');
    }

    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    setUser(authenticatedUser);
  };

  async function loginAdmin(credentials: AdminLoginCredentials) {
    const response = await api.post('/auth/admin/login', credentials);
    establishSession(response.data as SessionPayload);
  }

  function startInstitutionalLogin() {
    window.location.assign(`${api.defaults.baseURL}/auth/sso/start`);
  }

  async function completeInstitutionalLogin(code: string) {
    const response = await api.post('/auth/sso/exchange', { code });
    establishSession(response.data as SessionPayload);
  }

  async function checkEmailFirstAccess(email: string) {
    await api.post('/auth/first-access/check-email', { email });
  }

  async function completeFirstAccess(credentials: FirstAccessCredentials) {
    const response = await api.post('/auth/first-access/complete', credentials);
    const { user: authenticatedUser, token } = response.data as SessionPayload;
    establishSession({ user: authenticatedUser, token });
  }

  function logout() {
    localStorage.removeItem('@gestao:user');
    localStorage.removeItem('@gestao:token');
    localStorage.removeItem('@gestao:institutionalToken');
    delete api.defaults.headers.common.Authorization;
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        signed: !!user,
        user,
        loginAdmin,
        startInstitutionalLogin,
        completeInstitutionalLogin,
        checkEmailFirstAccess,
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
