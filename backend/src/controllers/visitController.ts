import { Response } from 'express';
import prisma from '../utils/prisma.js';
import { AuthRequest } from '../middlewares/authMiddleware.js';

export const getVisits = async (req: AuthRequest, res: Response) => {
  try {
    const where: any = {};

    if (req.user.role === 'COLABORADOR') {
        if (!req.user.departmentId) {
            return res.json([]);
        }
        where.departmentId = req.user.departmentId;
    }

    const visits = await prisma.visit.findMany({
      where,
      include: {
        visitor: true,
        host: {
          select: { name: true, email: true },
        },
        department: {
            select: { name: true }
        }
      },
      orderBy: { date: 'desc' }
    });
    res.json(visits);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createVisit = async (req: AuthRequest, res: Response) => {
  try {
    const { visitorId, hostId, departmentId, date, motive } = req.body;
    
    let finalDepartmentId = departmentId;

    if (req.user.role === 'COLABORADOR') {
        finalDepartmentId = req.user.departmentId;
    }

    if (!finalDepartmentId && hostId) {
        // Fetch host to get departmentId if not provided
        const host = await prisma.user.findUnique({
            where: { id: hostId }
        });

        if (host && host.departmentId) {
            finalDepartmentId = host.departmentId;
        }
    }

    if (!finalDepartmentId) {
         return res.status(400).json({ message: 'Department is required' });
    }

    // Generate unique access code for active visits
    let accessCode = '';
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
        // Generate 6-digit code (allows leading zeros, e.g., "001234")
        accessCode = Array.from({ length: 6 }, () => Math.floor(Math.random() * 10)).join('');
        
        // Check if code exists in any active visit
        const existingVisit = await prisma.visit.findFirst({
            where: {
                accessCode,
                status: {
                    in: ['PENDING', 'CHECKIN']
                }
            }
        });

        if (!existingVisit) {
            isUnique = true;
        }
        attempts++;
    }

    if (!isUnique) {
        return res.status(500).json({ message: 'Failed to generate unique access code. Please try again.' });
    }

    const visit = await prisma.visit.create({
      data: {
        visitorId,
        hostId: hostId || null,
        departmentId: finalDepartmentId,
        date: new Date(date),
        motive,
        status: 'PENDING',
        accessCode,
      },
    });
    res.status(201).json(visit);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateVisitStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // For COLABORADOR, verify department ownership
    if (req.user.role === 'COLABORADOR') {
        const visit = await prisma.visit.findUnique({
            where: { id: id as string },
            select: { departmentId: true }
        });

        if (!visit) {
            return res.status(404).json({ message: 'Visit not found' });
        }

        if (visit.departmentId !== req.user.departmentId) {
            return res.status(403).json({ message: 'Forbidden: You can only manage visits for your department' });
        }
    }

    const visit = await prisma.visit.update({
      where: { id: id as string },
      data: { status },
    });
    res.json(visit);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};
