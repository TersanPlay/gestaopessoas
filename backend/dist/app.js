import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import fs from 'fs';
import path from 'path';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import departmentRoutes from './routes/departmentRoutes.js';
import visitRoutes from './routes/visitRoutes.js';
import visitorRoutes from './routes/visitorRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import totemRoutes from './routes/totemRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import backupRoutes from './routes/backupRoutes.js';
import guardhouseRoutes from './routes/guardhouseRoutes.js';
const app = express();
const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use('/uploads', (req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
}, express.static(uploadsDir));
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/totem', totemRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/guardhouse', guardhouseRoutes);
app.get('/', (req, res) => {
    res.json({ message: 'Hello from Backend!' });
});
export default app;
//# sourceMappingURL=app.js.map