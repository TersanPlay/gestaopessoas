import { Response } from 'express';
import bcrypt from 'bcryptjs';
import type { Role } from '@prisma/client';
import { AuthRequest } from '../middlewares/authMiddleware.js';
import { userRepository } from '../repositories/userRepository.js';
import {
  normalizeCpf,
  normalizeMatricula,
  normalizeOptionalEmail,
  normalizeRequiredText,
  toUserResponse,
} from '../utils/userProfile.js';

export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const users = await userRepository.findAll();
    res.json(users.map((user) => toUserResponse(user)));
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getUserById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (req.user.role !== 'ADMIN' && req.user.id !== id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const user = await userRepository.findById(id as string);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(toUserResponse(user));
  } catch (error) {
    console.error('Error getting user by id:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    const name = normalizeRequiredText(req.body.name);
    const email = normalizeOptionalEmail(req.body.email);
    const password = normalizeRequiredText(req.body.password);
    const matricula = normalizeMatricula(String(req.body.matricula || ''));
    const cpf = normalizeCpf(String(req.body.cpf || ''));
    const role = req.body.role;
    const departmentId =
      typeof req.body.departmentId === 'string' ? req.body.departmentId : undefined;

    if (!name || !password || !matricula || !cpf) {
      return res.status(400).json({
        message: 'Nome, matrícula, CPF e senha são obrigatórios.',
      });
    }

    const existingUser = await userRepository.findConflictingUser({
      email,
      matricula,
      cpf,
    });

    if (existingUser) {
      return res.status(400).json({
        message: 'Já existe um usuário com este e-mail, matrícula ou CPF.',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await userRepository.create({
      name,
      email,
      matricula,
      cpf,
      password: hashedPassword,
      authProvider: 'LOCAL',
      role,
      department: departmentId ? { connect: { id: departmentId } } : undefined,
    });

    res.status(201).json(toUserResponse({ ...user, department: null }));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const targetUser = await userRepository.findById(id as string);

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (req.user.role !== 'ADMIN' && req.user.id !== id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const name = normalizeRequiredText(req.body.name);
    const email = normalizeOptionalEmail(req.body.email);
    const role =
      req.body.role === 'ADMIN' ||
      req.body.role === 'COLABORADOR' ||
      req.body.role === 'RECEPCIONISTA'
        ? (req.body.role as Role)
        : undefined;
    const departmentId =
      req.body.departmentId === null
        ? null
        : typeof req.body.departmentId === 'string'
          ? req.body.departmentId
          : undefined;
    const password = normalizeRequiredText(req.body.password);
    const matricula =
      typeof req.body.matricula === 'string'
        ? normalizeMatricula(req.body.matricula)
        : undefined;
    const cpf =
      typeof req.body.cpf === 'string' ? normalizeCpf(req.body.cpf) : undefined;

    const conflictingUser = await userRepository.findConflictingUser({
      email,
      matricula,
      cpf,
      excludeId: id as string,
    });

    if (conflictingUser) {
      return res.status(400).json({
        message: 'Já existe um usuário com este e-mail, matrícula ou CPF.',
      });
    }

    const data: {
      name?: string;
      email?: string | null;
      departmentId?: string | null;
      role?: Role;
      password?: string;
      matricula?: string;
      cpf?: string;
    } = {};

    if (name) {
      data.name = name;
    }

    if (email !== targetUser.email) {
      data.email = email;
    }

    if (req.user.role === 'ADMIN' && departmentId !== undefined) {
      data.departmentId = departmentId;
    }

    if (req.user.role === 'ADMIN' && role) {
      data.role = role;
    }

    if (req.user.role === 'ADMIN' && matricula) {
      data.matricula = matricula;
    }

    if (req.user.role === 'ADMIN' && cpf) {
      data.cpf = cpf;
    }

    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }

    const user = await userRepository.update(id as string, data);

    res.json(toUserResponse({ ...user, department: null }));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await userRepository.delete(id as string);
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
