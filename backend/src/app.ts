import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import departmentRoutes from './routes/departmentRoutes.js';
import visitRoutes from './routes/visitRoutes.js';
import visitorRoutes from './routes/visitorRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import totemRoutes from './routes/totemRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import backupRoutes from './routes/backupRoutes.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/totem', totemRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/backup', backupRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Hello from Backend!' });
});

export default app;
