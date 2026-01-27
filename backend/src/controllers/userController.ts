import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../middlewares/authMiddleware.js';
import { userRepository } from '../repositories/userRepository.js';

export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const users = await userRepository.findAll();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getUserById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = await userRepository.findById(id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, password, role, departmentId } = req.body;

    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await userRepository.create({
      name,
      email,
      password: hashedPassword,
      role,
      department: departmentId ? { connect: { id: departmentId } } : undefined,
    });

    res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, role, departmentId, password } = req.body;

    // Check permissions: Only Admin can update roles or other users (except basic info)
    // Actually, allowing user to update their own info is fine.
    if (req.user.role !== 'ADMIN' && req.user.id !== id) {
       return res.status(403).json({ message: 'Forbidden' });
    }

    const data: any = {
        name,
        email,
        department: departmentId ? { connect: { id: departmentId } } : undefined
    };

    if (req.user.role === 'ADMIN' && role) {
        data.role = role;
    }

    if (password) {
        data.password = await bcrypt.hash(password, 10);
    }

    const user = await userRepository.update(id, data);

    res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.user.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};
