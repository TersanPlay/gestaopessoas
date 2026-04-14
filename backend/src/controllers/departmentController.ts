import { Response } from 'express';
import prisma from '../utils/prisma.js';
import { AuthRequest } from '../middlewares/authMiddleware.js';
import {
  DepartmentCatalogError,
  syncDepartmentCatalog,
} from '../services/departmentCatalogService.js';

export const getDepartments = async (req: AuthRequest, res: Response) => {
  try {
    let departments = await prisma.department.findMany({
      orderBy: { name: 'asc' },
    });

    if (departments.length === 0) {
      try {
        await syncDepartmentCatalog();
        departments = await prisma.department.findMany({
          orderBy: { name: 'asc' },
        });
      } catch (error) {
        console.error('Error syncing department catalog on empty database:', error);
      }
    }

    res.json(departments);
  } catch (error) {
    console.error('Error getting departments:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const syncDepartments = async (req: AuthRequest, res: Response) => {
  try {
    const result = await syncDepartmentCatalog();
    const departments = await prisma.department.findMany({
      orderBy: { name: 'asc' },
    });

    res.json({
      ...result,
      departments,
    });
  } catch (error) {
    if (error instanceof DepartmentCatalogError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    console.error('Error syncing departments:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createDepartment = async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, responsible, location, employeeCount, lastSyncedAt } =
      req.body;
    const department = await prisma.department.create({
      data: {
        name,
        description,
        responsible,
        location,
        employeeCount:
          typeof employeeCount === 'number' && employeeCount >= 0
            ? employeeCount
            : null,
        lastSyncedAt: lastSyncedAt ? new Date(lastSyncedAt) : null,
      },
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
    const { name, description, responsible, location, employeeCount, lastSyncedAt } =
      req.body;
    const department = await prisma.department.update({
      where: { id: id as string },
      data: {
        name,
        description,
        responsible,
        location,
        employeeCount:
          typeof employeeCount === 'number' && employeeCount >= 0
            ? employeeCount
            : undefined,
        lastSyncedAt: lastSyncedAt ? new Date(lastSyncedAt) : undefined,
      },
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
    const departmentId = id as string;

    await prisma.$transaction([
      prisma.visit.updateMany({
        where: { departmentId },
        data: { departmentId: null },
      }),
      prisma.user.updateMany({
        where: { departmentId },
        data: { departmentId: null },
      }),
      prisma.guardhouseDriver.updateMany({
        where: { departmentId },
        data: { departmentId: null },
      }),
      prisma.guardhouseVehicleMovement.updateMany({
        where: { destinationDepartmentId: departmentId },
        data: { destinationDepartmentId: null },
      }),
      prisma.department.delete({ where: { id: departmentId } }),
    ]);

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting department:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
