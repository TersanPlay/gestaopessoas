export type UserRole = 'ADMIN' | 'COLABORADOR' | 'RECEPCIONISTA';
export type AuthProvider = 'LOCAL' | 'EXTERNAL';

export interface UserDepartment {
  id: string;
  name: string;
}

export interface AppUser {
  id: string;
  name: string;
  email: string | null;
  matricula: string | null;
  cpf: string | null;
  role: UserRole;
  authProvider: AuthProvider;
  departmentId: string | null;
  department?: UserDepartment | null;
  cargo: string | null;
  lotacao: string | null;
  funcao: string | null;
  vinculo: string | null;
  dataAdmissao: string | null;
  dataDemissao: string | null;
  cargaHorariaSemanal: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AdminLoginCredentials {
  email: string;
  password: string;
}

export interface FirstAccessCredentials {
  matricula: string;
  cpf: string;
  email: string;
  password: string;
}

export interface FirstAccessProfile {
  matricula: string;
  cpf: string;
  name: string;
  cargo: string | null;
  lotacao: string | null;
  funcao: string | null;
  vinculo: string | null;
  dataAdmissao: string | null;
  dataDemissao: string | null;
  cargaHorariaSemanal: number | null;
}
