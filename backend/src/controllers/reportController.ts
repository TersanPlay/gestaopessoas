import { Response } from 'express';
import prisma from '../utils/prisma.js';
import { AuthRequest } from '../middlewares/authMiddleware.js';

export const getVisitReport = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, departmentId, status } = req.query;

    const where: any = {};

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    } else if (startDate) {
        where.date = {
            gte: new Date(startDate as string)
        };
    }

    if (departmentId && departmentId !== 'ALL') {
      where.departmentId = departmentId;
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    const visits = await prisma.visit.findMany({
      where,
      include: {
        visitor: {
          select: {
            name: true,
            document: true
          }
        },
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
    console.error('Report error:', error);
    res.status(500).json({ message: 'Error generating report' });
  }
};

export const getReportStats = async (req: AuthRequest, res: Response) => {
    try {
        const { startDate, endDate } = req.query;

        const where: any = {};

        if (startDate && endDate) {
            where.date = {
                gte: new Date(startDate as string),
                lte: new Date(endDate as string)
            };
        }

        const [totalVisits, cancelledVisits, byDepartment] = await Promise.all([
            prisma.visit.count({ where }),
            prisma.visit.count({ where: { ...where, status: 'CANCELLED' } }),
            prisma.visit.groupBy({
                by: ['departmentId'],
                where,
                _count: {
                    id: true
                }
            })
        ]);

        // Enrich department names
        const departmentStats = await Promise.all(byDepartment.map(async (item) => {
            if (!item.departmentId) return { name: 'Sem Departamento', count: item._count.id };
            const dept = await prisma.department.findUnique({ where: { id: item.departmentId } });
            return {
                name: dept?.name || 'Desconhecido',
                count: item._count.id
            };
        }));

        res.json({
            totalVisits,
            cancelledVisits,
            departmentStats
        });

    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ message: 'Error generating stats' });
    }
}
