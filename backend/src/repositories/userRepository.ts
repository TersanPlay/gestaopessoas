import prisma from '../utils/prisma.js';
import { Prisma } from '@prisma/client';

export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  matricula: true,
  cpf: true,
  role: true,
  authProvider: true,
  cargo: true,
  lotacao: true,
  funcao: true,
  vinculo: true,
  dataAdmissao: true,
  dataDemissao: true,
  cargaHorariaSemanal: true,
  departmentId: true,
  department: {
    select: {
      id: true,
      name: true,
    },
  },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export const authUserSelect = {
  ...publicUserSelect,
  password: true,
} satisfies Prisma.UserSelect;

export class UserRepository {
  async findAll() {
    return prisma.user.findMany({
      select: publicUserSelect,
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: publicUserSelect,
    });
  }

  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  async findByMatricula(matricula: string) {
    return prisma.user.findUnique({
      where: { matricula },
    });
  }

  async findByCpf(cpf: string) {
    return prisma.user.findUnique({
      where: { cpf },
    });
  }

  async findByMatriculaAndCpf(matricula: string, cpf: string) {
    return prisma.user.findFirst({
      where: { matricula, cpf },
      select: authUserSelect,
    });
  }

  async findConflictingUser(params: {
    email?: string | null;
    matricula?: string | null;
    cpf?: string | null;
    excludeId?: string;
  }) {
    const conditions: Prisma.UserWhereInput[] = [];

    if (params.email) {
      conditions.push({ email: params.email });
    }

    if (params.matricula) {
      conditions.push({ matricula: params.matricula });
    }

    if (params.cpf) {
      conditions.push({ cpf: params.cpf });
    }

    if (conditions.length === 0) {
      return null;
    }

    return prisma.user.findFirst({
      where: {
        OR: conditions,
        NOT: params.excludeId ? { id: params.excludeId } : undefined,
      },
    });
  }

  async create(data: Prisma.UserCreateInput) {
    return prisma.user.create({
      data,
    });
  }

  async update(id: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return prisma.user.delete({
      where: { id },
    });
  }
}

export const userRepository = new UserRepository();
