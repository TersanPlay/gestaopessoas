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

export const createVisitor = async (req: AuthRequest, res: Response) => {
  try {
    const { name, document, phone, photo } = req.body;
    
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
        const { name, document, phone, photo } = req.body;

        const visitor = await prisma.visitor.update({
            where: { id },
            data: { name, document, phone, photo }
        });
        res.json(visitor);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const deleteVisitor = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.visitor.delete({ where: { id } });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
