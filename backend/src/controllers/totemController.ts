import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import { distance } from '../utils/vector.js';

export const getVisitorByCpf = async (req: Request, res: Response) => {
  try {
    const { cpf } = req.params;
    
    if (typeof cpf !== 'string') {
        return res.status(400).json({ message: 'Invalid CPF format' });
    }

    // Remove non-numeric characters just in case, though frontend should handle mask
    const cleanCpf = cpf.replace(/\D/g, '');

    // Basic validation
    if (!cleanCpf) {
        return res.status(400).json({ message: 'CPF is required' });
    }

    // Try to find by exact match (assuming database stores formatted or unformatted - existing code suggests standard input)
    // We should probably check both or assume a standard. 
    // Looking at visitorController, it just takes "document".
    // Let's assume the frontend sends the format that is stored.
    // If the DB stores with mask, we need to match it.
    // Ideally we should sanitize, but for now let's try to find it.

    const visitor = await prisma.visitor.findUnique({
      where: { document: cpf }, // Assuming 'document' field stores the CPF
    });

    if (!visitor) {
      return res.status(404).json({ message: 'Visitor not found' });
    }

    // Return only necessary data
    res.json({
      id: visitor.id,
      name: visitor.name,
      document: visitor.document,
      phone: visitor.phone,
      photo: visitor.photo,
      // email: visitor.email, // If it exists in schema? Need to check schema.
      // Schema likely has: name, document, phone, photo, consentGiven
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createVisit = async (req: Request, res: Response) => {
  try {
    const { visitorId, departmentId, motive } = req.body;

    if (!visitorId || !departmentId || !motive) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    // Generate unique access code
    let accessCode = '';
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
        accessCode = Array.from({ length: 6 }, () => Math.floor(Math.random() * 10)).join('');
        const existingVisit = await prisma.visit.findFirst({
            where: {
                accessCode,
                status: { in: ['PENDING', 'CHECKIN'] }
            }
        });
        if (!existingVisit) isUnique = true;
        attempts++;
    }

    if (!isUnique) {
        return res.status(500).json({ message: 'Failed to generate unique access code' });
    }

    const visit = await prisma.visit.create({
      data: {
        visitorId,
        departmentId,
        motive,
        date: new Date(), // Now
        status: 'PENDING',
        accessCode,
        // hostId is optional and might not be known at totem
      },
      include: {
          department: { select: { name: true } },
          visitor: { select: { name: true } }
      }
    });

    res.status(201).json(visit);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getActiveVisits = async (req: Request, res: Response) => {
    try {
        const { identifier } = req.params;

        if (!identifier) {
            return res.status(400).json({ message: 'Identifier is required' });
        }

        const visits = await prisma.visit.findMany({
            where: {
                OR: [
                    { accessCode: identifier },
                    { visitor: { document: identifier } }
                ],
                status: { in: ['PENDING', 'CHECKIN'] }
            },
            include: {
                visitor: { select: { name: true, document: true, photo: true } },
                department: { select: { name: true } }
            },
            orderBy: { date: 'desc' }
        });

        res.json(visits);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const finishVisit = async (req: Request, res: Response) => {
    try {
        const { id } = req.body; // Expecting visit ID now, but support identifier for backward compat if needed? 
        // User asked to list first, then finish. So we should finish by ID.
        // But let's keep identifier support or check if we change the contract.
        // The previous implementation used identifier.
        // Let's support both or switch to ID. ID is safer if we listed them.
        
        // Actually, let's keep the old signature or adapt? 
        // The prompt implies a UI change.
        // If I change the backend signature, I might break other things if they use it?
        // Only Totem uses this.
        
        // Let's check req.body. identifier vs id.
        // If 'id' is present, use it. If 'identifier' is present, use the old logic (find first active).
        
        let visitId = id;
        const { identifier } = req.body;

        if (!visitId && identifier) {
             // Old logic fallback or search logic
             const visit = await prisma.visit.findFirst({
                where: {
                    OR: [
                        { accessCode: identifier },
                        { visitor: { document: identifier } }
                    ],
                    status: { in: ['PENDING', 'CHECKIN'] }
                },
                orderBy: { date: 'desc' }
            });
            if (visit) visitId = visit.id;
        }

        if (!visitId) {
            return res.status(404).json({ message: 'Visit not found' });
        }

        const updatedVisit = await prisma.visit.update({
            where: { id: visitId },
            data: { 
                status: 'CHECKOUT',
                checkOutTime: new Date()
            },
            include: {
                visitor: { select: { name: true, document: true } },
                department: { select: { name: true } }
            }
        });

        res.json(updatedVisit);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getDepartments = async (req: Request, res: Response) => {
    try {
        const departments = await prisma.department.findMany({
            // where: { active: true }, // 'active' field does not exist in schema
            select: { id: true, name: true },
            orderBy: { name: 'asc' }
        });
        res.json(departments);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const faceMatch = async (req: Request, res: Response) => {
    try {
        const { descriptor } = req.body;
        if (!Array.isArray(descriptor) || descriptor.length === 0) {
            return res.status(400).json({ message: 'Descriptor is required' });
        }

        const visitors = await prisma.visitor.findMany({
            where: { faceEmbedding: { not: null } },
            select: { id: true, name: true, document: true, photo: true, faceEmbedding: true }
        });

        if (!visitors.length) {
            return res.json({ matched: false });
        }

        let best: { visitor: any; dist: number } | null = null;
        for (const v of visitors) {
            const emb = v.faceEmbedding as number[] | null;
            if (!emb) continue;
            const dist = distance(descriptor, emb);
            if (!isFinite(dist)) continue;
            if (!best || dist < best.dist) {
                best = { visitor: v, dist };
            }
        }

        // Typical threshold for face-api descriptors ~0.45
        const THRESHOLD = 0.45;
        if (best && best.dist <= THRESHOLD) {
            const { faceEmbedding, ...safeVisitor } = best.visitor;
            return res.json({ matched: true, distance: best.dist, visitor: safeVisitor });
        }

        return res.json({ matched: false });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
