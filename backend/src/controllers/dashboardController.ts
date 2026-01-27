import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Run queries in parallel
    const [
      totalVisitsToday,
      activeVisits,
      totalVisitors,
      totalDepartments,
      recentVisits
    ] = await Promise.all([
      // 1. Visits Today
      prisma.visit.count({
        where: {
          date: {
            gte: today,
            lt: tomorrow
          }
        }
      }),
      // 2. Active Visits (CHECKIN status)
      prisma.visit.count({
        where: {
          status: 'CHECKIN'
        }
      }),
      // 3. Total Visitors
      prisma.visitor.count(),
      // 4. Total Departments
      prisma.department.count(),
      // 5. Recent Visits (Limit 5)
      prisma.visit.findMany({
        take: 5,
        orderBy: {
          date: 'desc'
        },
        include: {
          visitor: {
            select: { name: true }
          },
          department: {
            select: { name: true }
          }
        }
      })
    ]);

    res.json({
      visitsToday: totalVisitsToday,
      activeVisits,
      totalVisitors,
      totalDepartments,
      recentVisits
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
