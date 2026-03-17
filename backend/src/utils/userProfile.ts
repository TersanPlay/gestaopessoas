import type { AuthProvider, Role, User } from '@prisma/client';

export interface ExternalServerProfile {
  matricula: string;
  cpf: string;
  nome: string;
  cargo: string | null;
  lotacao: string | null;
  funcao: string | null;
  vinculo: string | null;
  dataAdmissao: Date | null;
  dataDemissao: Date | null;
  cargaHorariaSemanal: number | null;
}

type UserResponseShape = Pick<
  User,
  | 'id'
  | 'name'
  | 'email'
  | 'matricula'
  | 'cpf'
  | 'role'
  | 'authProvider'
  | 'departmentId'
  | 'cargo'
  | 'lotacao'
  | 'funcao'
  | 'vinculo'
  | 'dataAdmissao'
  | 'dataDemissao'
  | 'cargaHorariaSemanal'
  | 'createdAt'
  | 'updatedAt'
> & {
  department?: {
    id: string;
    name: string;
  } | null;
};

export const normalizeMatricula = (value: string) => value.trim();

export const normalizeCpf = (value: string) => value.replace(/\D/g, '');

export const formatCpf = (value: string) => {
  const digits = normalizeCpf(value);

  if (digits.length !== 11) {
    return value.trim();
  }

  return digits.replace(
    /^(\d{3})(\d{3})(\d{3})(\d{2})$/,
    '$1.$2.$3-$4',
  );
};

export const normalizeOptionalText = (value: unknown) => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const normalizeRequiredText = (value: unknown) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

export const normalizeOptionalEmail = (value: unknown) => {
  const normalized = normalizeOptionalText(value);
  return normalized ? normalized.toLowerCase() : null;
};

export const parseDateOnly = (value: string | null | undefined) => {
  const normalized = normalizeOptionalText(value);

  if (!normalized) {
    return null;
  }

  const parsed = new Date(`${normalized}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const toExternalUserFields = (profile: ExternalServerProfile) => ({
  name: profile.nome,
  matricula: profile.matricula,
  cpf: profile.cpf,
  cargo: profile.cargo,
  lotacao: profile.lotacao,
  funcao: profile.funcao,
  vinculo: profile.vinculo,
  dataAdmissao: profile.dataAdmissao,
  dataDemissao: profile.dataDemissao,
  cargaHorariaSemanal: profile.cargaHorariaSemanal,
});

export const toUserResponse = (user: UserResponseShape) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  matricula: user.matricula,
  cpf: user.cpf,
  role: user.role as Role,
  authProvider: user.authProvider as AuthProvider,
  departmentId: user.departmentId,
  department: user.department ?? null,
  cargo: user.cargo,
  lotacao: user.lotacao,
  funcao: user.funcao,
  vinculo: user.vinculo,
  dataAdmissao: user.dataAdmissao,
  dataDemissao: user.dataDemissao,
  cargaHorariaSemanal: user.cargaHorariaSemanal,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});
