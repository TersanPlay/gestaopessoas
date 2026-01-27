import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.get('/', (req, res) => {
    res.json({ message: 'Hello from Backend!' });
});
export default app;
//# sourceMappingURL=app.js.map