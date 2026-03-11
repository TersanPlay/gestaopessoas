import { Response } from 'express';
import prisma from '../utils/prisma.js';
import { AuthRequest } from '../middlewares/authMiddleware.js';

export const getDepartments = async (req: AuthRequest, res: Response) => {
  try {
    const departments = await prisma.department.findMany();
    res.json(departments);
  } catch (error) {
    console.error('Error getting departments:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createDepartment = async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, responsible, location } = req.body;
    const department = await prisma.department.create({
      data: { name, description, responsible, location },
    });
    res.status(201).json(department);
  } catch (error) {
    console.error('Error creating department:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateDepartment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, responsible, location } = req.body;
    const department = await prisma.department.update({
      where: { id: id as string },
      data: { name, description, responsible, location },
    });
    res.json(department);
  } catch (error) {
    console.error('Error updating department:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteDepartment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.department.delete({ where: { id: id as string } });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting department:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
