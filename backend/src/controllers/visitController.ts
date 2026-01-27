import { Response } from 'express';
import prisma from '../utils/prisma.js';
import { AuthRequest } from '../middlewares/authMiddleware.js';

export const getVisits = async (req: AuthRequest, res: Response) => {
  try {
    const visits = await prisma.visit.findMany({
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
    const { visitorId, hostId, date, motive } = req.body;
    
    // Fetch host to get departmentId
    const host = await prisma.user.findUnique({
        where: { id: hostId }
    });

    if (!host) {
        return res.status(400).json({ message: 'Host not found' });
    }

    if (!host.departmentId) {
        return res.status(400).json({ message: 'Host does not belong to a department' });
    }

    const visit = await prisma.visit.create({
      data: {
        visitorId,
        hostId,
        departmentId: host.departmentId,
        date: new Date(date),
        motive,
        status: 'PENDING',
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
    
    const visit = await prisma.visit.update({
      where: { id },
      data: { status },
    });
    res.json(visit);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};
