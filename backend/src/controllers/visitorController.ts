import { Prisma } from '@prisma/client';
import { Response } from 'express';
import prisma from '../utils/prisma.js';
import { AuthRequest } from '../middlewares/authMiddleware.js';

export const getVisitors = async (req: AuthRequest, res: Response) => {
  try {
    const visitors = await prisma.visitor.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(visitors);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getVisitorById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const visitor = await prisma.visitor.findUnique({
      where: { id: id as string },
      include: {
        visits: {
          orderBy: { date: 'desc' },
          include: {
            department: {
                select: { name: true }
            },
            host: {
                select: { name: true }
            }
          }
        }
      }
    });

    if (!visitor) {
      return res.status(404).json({ message: 'Visitor not found' });
    }

    res.json(visitor);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createVisitor = async (req: AuthRequest, res: Response) => {
  try {
    const { name, document, phone, photo, consentGiven, faceEmbedding } = req.body;
    
    if (consentGiven !== true) {
        return res.status(400).json({ message: 'Consent is required' });
    }

    const existing = await prisma.visitor.findUnique({
      where: { document },
    });

    if (existing) {
      return res.status(400).json({ message: 'Visitor with this document already exists' });
    }

    const visitor = await prisma.visitor.create({
      data: {
        name,
        document,
        phone,
        photo,
        faceEmbedding,
        consentGiven,
        consentDate: new Date(),
      },
    });
    res.status(201).json(visitor);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateVisitor = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { name, document, phone, photo, faceEmbedding } = req.body;

        const data: {
          name?: string;
          document?: string;
          phone?: string | null;
          photo?: string | null;
          faceEmbedding?: Prisma.InputJsonValue;
        } = { name, document, phone, photo };

        // Preserve the current embedding when the client edits only textual data.
        if (faceEmbedding !== undefined && faceEmbedding !== null) {
            data.faceEmbedding = faceEmbedding;
        }

        const visitor = await prisma.visitor.update({
            where: { id: id as string },
            data
        });
        res.json(visitor);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const deleteVisitor = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.visitor.delete({ where: { id: id as string } });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
